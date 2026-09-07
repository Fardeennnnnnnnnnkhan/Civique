import { prisma } from '../db';
import { IncidentStatus } from '@prisma/client';
import { logIncidentChange } from '../utils/audit';
import { broadcastIncident } from '../utils/socket';
import { classifyReportImage } from '../utils/ml';
import { Buffer } from 'buffer';

/**
 * Downloads an image from a public URL and returns its buffer.
 */
async function downloadImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error downloading image: ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: contentType
  };
}

/**
 * Queries the database for reports that missed synchronous ML classification,
 * attempts to classify them, and updates their category / routing / status.
 */
export async function runMlRetryScan(): Promise<{ processedCount: number; successCount: number }> {
  console.log('[ML Retry Engine] Initiating background classification scan...');

  // Find reports that haven't been successfully classified yet
  const pendingReports = await prisma.report.findMany({
    where: {
      categoryConfidence: null,
    },
    include: {
      incident: true
    },
    orderBy: {
      createdAt: 'asc'
    },
    take: 10 // process in small batches to avoid blocking
  });

  if (pendingReports.length === 0) {
    return { processedCount: 0, successCount: 0 };
  }

  console.log(`[ML Retry Engine] Found ${pendingReports.length} reports awaiting classification.`);
  let successCount = 0;

  for (const report of pendingReports) {
    try {
      console.log(`[ML Retry Engine] Processing Report ID: ${report.id} (photoUrl: ${report.photoUrl})`);

      // 1. Download the photo from its public storage URL
      const { buffer, mimeType } = await downloadImageBuffer(report.photoUrl);

      // 2. Query the FastAPI classification service
      const mlResult = await classifyReportImage(
        buffer,
        `report_${report.id}.jpg`,
        mimeType,
        report.description || ''
      );

      if (!mlResult.success || mlResult.confidence === null) {
        console.warn(`[ML Retry Engine] ML classifier returned failure or null confidence for report ${report.id}`);
        continue;
      }

      const suggestedCategory = mlResult.category;
      const confidence = mlResult.confidence;
      const engine = mlResult.engine;

      // 3. Determine final confirmed category based on classification confidence threshold (>= 0.40)
      const originalCategory = report.categoryConfirmed || 'OTHERS';
      const confirmedCategory = (confidence >= 0.40 && suggestedCategory !== 'OTHERS')
        ? suggestedCategory
        : originalCategory;

      console.log(`[ML Retry Engine] Report ${report.id} classified as ${suggestedCategory} (conf: ${confidence}). Confirmed: ${confirmedCategory}`);

      // 4. Update the database inside a transaction
      await prisma.$transaction(async (tx) => {
        // Update report model properties
        await tx.report.update({
          where: { id: report.id },
          data: {
            categorySuggested: suggestedCategory,
            categoryConfirmed: confirmedCategory,
            categoryConfidence: confidence,
          }
        });

        // If the report is linked to an active incident, update the incident details
        if (report.incidentId) {
          const incident = report.incident;
          
          // Find matching department by the newly confirmed category
          let department = await tx.department.findFirst({
            where: {
              cityId: incident?.cityId || undefined,
              handledCategories: {
                has: confirmedCategory,
              },
            },
          });

          if (!department && incident?.cityId) {
            department = await tx.department.findFirst({
              where: {
                cityId: incident.cityId,
                name: 'General Administration',
              },
            });
          }

          // Calculate SLA deadline if department matches
          let slaDeadline = incident?.slaDeadline;
          if (department && incident && incident.status === IncidentStatus.REPORTED) {
            const now = new Date();
            slaDeadline = new Date(now.getTime() + department.defaultSlaHours * 60 * 60 * 1000);
          }

          // Transition status from REPORTED to OPEN upon classification completion
          const newStatus = incident?.status === IncidentStatus.REPORTED 
            ? IncidentStatus.OPEN 
            : (incident?.status || IncidentStatus.OPEN);

          const updatedIncident = await tx.incident.update({
            where: { id: report.incidentId },
            data: {
              category: confirmedCategory,
              status: newStatus,
              departmentId: department ? department.id : undefined,
              slaDeadline: slaDeadline,
            },
            include: {
              ward: true,
              reports: true
            }
          });

          // Log transaction change in the audit trail
          await logIncidentChange(
            tx,
            report.incidentId,
            'INCIDENT_AI_CLASSIFIED',
            'ML_RETRY_DAEMON_ENGINE',
            {
              reportId: report.id,
              previousCategory: originalCategory,
              confirmedCategory: confirmedCategory,
              suggestedCategory: suggestedCategory,
              confidence: confidence,
              engine: engine,
              newStatus: newStatus
            }
          );

          // Broadcast real-time incident update
          try {
            broadcastIncident('incident:updated', updatedIncident);
          } catch (wsErr) {
            console.error(`[ML Retry Engine] Socket broadcast failed for incident ${report.incidentId}:`, wsErr);
          }
        }
      }, {
        timeout: 15000 // 15 seconds timeout
      });

      successCount++;
    } catch (err: any) {
      console.error(`[ML Retry Engine] Failed to process pending report ${report.id}:`, err.message || err);
    }
  }

  console.log(`[ML Retry Engine] Finished scan. Successfully processed ${successCount}/${pendingReports.length} reports.`);
  return {
    processedCount: pendingReports.length,
    successCount
  };
}

/**
 * Initializes the background ML Retry queue loop.
 * Runs once every 30 seconds.
 */
export function startMlRetryJob() {
  console.log('[ML Retry Engine] Background ML classification retry job scheduled (interval: 30s).');

  // Set interval to run retry scan every 30 seconds
  setInterval(async () => {
    try {
      await runMlRetryScan();
    } catch (err) {
      console.error('[ML Retry Engine] Background cron execution failed:', err);
    }
  }, 30 * 1000);
}
