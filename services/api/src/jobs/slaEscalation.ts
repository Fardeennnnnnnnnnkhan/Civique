import { prisma } from '../db';
import { IncidentStatus, UserRole } from '@prisma/client';
import { logIncidentChange } from '../utils/audit';
import { broadcastIncident } from '../utils/socket';

/**
 * Scans the database for unresolved incidents that have exceeded their SLA deadline,
 * transitions them to ESCALATED, updates their assignment using the hierarchy,
 * and broadcasts the changes.
 */
export async function runSlaScan(): Promise<{ processedCount: number; escalatedCount: number }> {
  console.log('[SLA Engine] Initiating database scan for expired SLA deadlines...');
  
  const unresolvedStatuses = [
    IncidentStatus.REPORTED,
    IncidentStatus.AI_REVIEW,
    IncidentStatus.OPEN,
    IncidentStatus.ACKNOWLEDGED,
    IncidentStatus.ASSIGNED,
    IncidentStatus.IN_PROGRESS,
    IncidentStatus.AI_VERIFICATION,
    IncidentStatus.CITIZEN_CONFIRMATION,
    IncidentStatus.REOPENED,
    IncidentStatus.DISPUTED
  ];

  const now = new Date();

  // Find all incidents that are unresolved, have not been flagged as breached yet, and have an expired deadline
  const breachedIncidents = await prisma.incident.findMany({
    where: {
      status: { in: unresolvedStatuses },
      slaBreached: false,
      slaDeadline: {
        not: null,
        lt: now
      }
    },
    include: {
      ward: true,
      city: true,
      zone: true
    }
  });

  console.log(`[SLA Engine] Found ${breachedIncidents.length} active SLA breaches.`);

  let escalatedCount = 0;

  for (const incident of breachedIncidents) {
    try {
      // Find new assignee based on the municipal hierarchy
      let newAssigneeId: string | null = null;
      let newAssigneeRole: string | null = null;
      let newAssigneeEmail: string | null = null;

      // 1. If currently assigned to a FIELD_WORKER or not assigned, look for a WARD_OFFICER for this ward
      if (incident.wardId) {
        const wardOfficer = await prisma.user.findFirst({
          where: {
            role: UserRole.WARD_OFFICER,
            wardId: incident.wardId,
            active: true
          }
        });
        if (wardOfficer) {
          newAssigneeId = wardOfficer.id;
          newAssigneeRole = 'WARD_OFFICER';
          newAssigneeEmail = wardOfficer.email;
        }
      }

      // 2. If no ward officer was found and incident has a department, look for a DEPARTMENT_HEAD for this department
      if (!newAssigneeId && incident.departmentId) {
        const deptHead = await prisma.user.findFirst({
          where: {
            role: UserRole.DEPARTMENT_HEAD,
            departmentId: incident.departmentId,
            active: true
          }
        });
        if (deptHead) {
          newAssigneeId = deptHead.id;
          newAssigneeRole = 'DEPARTMENT_HEAD';
          newAssigneeEmail = deptHead.email;
        }
      }

      // 3. If still not assigned and incident has a zone, look for a ZONAL_OFFICER for this zone
      if (!newAssigneeId && incident.zoneId) {
        const zonalOfficer = await prisma.user.findFirst({
          where: {
            role: UserRole.ZONAL_OFFICER,
            zoneId: incident.zoneId,
            active: true
          }
        });
        if (zonalOfficer) {
          newAssigneeId = zonalOfficer.id;
          newAssigneeRole = 'ZONAL_OFFICER';
          newAssigneeEmail = zonalOfficer.email;
        }
      }

      // 4. Fallback: Find a CITY_ADMIN or COMMISSIONER in this city
      if (!newAssigneeId && incident.cityId) {
        const cityAdmin = await prisma.user.findFirst({
          where: {
            role: { in: [UserRole.CITY_ADMIN, UserRole.COMMISSIONER] },
            cityId: incident.cityId,
            active: true
          }
        });
        if (cityAdmin) {
          newAssigneeId = cityAdmin.id;
          newAssigneeRole = cityAdmin.role;
          newAssigneeEmail = cityAdmin.email;
        }
      }

      // Execute status transition and assignment updates in transaction
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.incident.update({
          where: { id: incident.id },
          data: {
            status: IncidentStatus.ESCALATED,
            slaBreached: true,
            isPublic: true,
            assignedTo: newAssigneeId || incident.assignedTo, // keep current if no fallback found
            assignedAt: newAssigneeId ? new Date() : incident.assignedAt
          },
          include: {
            ward: true,
            reports: true
          }
        });

        await logIncidentChange(
          tx,
          incident.id,
          'INCIDENT_SLA_BREACHED',
          'SLA_DAEMON_ENGINE',
          {
            previousStatus: incident.status,
            newStatus: IncidentStatus.ESCALATED,
            slaDeadline: incident.slaDeadline,
            escalatedToUser: newAssigneeId || null,
            escalatedToRole: newAssigneeRole || null,
            escalatedToEmail: newAssigneeEmail || null
          }
        );

        return updated;
      }, {
        timeout: 15000 // 15 seconds
      });

      try {
        broadcastIncident('incident:updated', result);
      } catch (wsErr) {
        console.error(`Socket broadcast failed on SLA breach for incident ${incident.id}:`, wsErr);
      }

      // Notify the new assignee about the escalation
      if (newAssigneeId) {
        try {
          const { createNotification } = require('../utils/notifications');
          createNotification(
            newAssigneeId,
            'SLA Escalation Alert',
            `URGENT: Incident #${incident.publicTrackingId} (${incident.category}) has breached its SLA and is escalated to you.`,
            'SLA_BREACH',
            incident.id
          ).catch((err: any) => console.error('Failed to notify assignee on SLA escalation:', err));
        } catch (notifErr) {
          console.error('Failed to require notification helper on SLA escalation:', notifErr);
        }
      }

      console.log(`[SLA Engine] Successfully escalated incident #${incident.publicTrackingId} to ${newAssigneeRole || 'unassigned'} (${newAssigneeEmail || 'none'}).`);
      escalatedCount++;
    } catch (err) {
      console.error(`[SLA Engine] Failed to escalate incident #${incident.publicTrackingId}:`, err);
    }
  }

  return {
    processedCount: breachedIncidents.length,
    escalatedCount
  };
}

/**
 * Initializes the background SLA monitoring loop.
 * Runs once every 60 seconds.
 */
export function startSlaEscalationJob() {
  console.log('[SLA Engine] Background SLA monitoring job scheduled (interval: 60s).');
  
  // Run scan immediately on startup
  runSlaScan().catch(err => console.error('[SLA Engine] Initial startup scan failed:', err));

  // Set interval to run scan every 60 seconds
  setInterval(async () => {
    try {
      await runSlaScan();
    } catch (err) {
      console.error('[SLA Engine] Background cron scan execution failed:', err);
    }
  }, 60 * 1000);
}
