import { PrismaClient, IncidentStatus, UserRole } from '@prisma/client';
import { runSlaScan } from '../jobs/slaEscalation';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SLA SCAN TEST START ---');

  // 1. Find a ward and zone to map the test to
  const ward = await prisma.ward.findFirst({
    include: { zone: true }
  });
  if (!ward) {
    console.error('No wards found in database. Seed geography first.');
    return;
  }

  // 2. Find or create a WARD_OFFICER for this ward
  const officerEmail = `ward_officer_test_${ward.id}@civique.org`;
  let officer = await prisma.user.findUnique({
    where: { email: officerEmail }
  });
  if (!officer) {
    officer = await prisma.user.create({
      data: {
        email: officerEmail,
        role: UserRole.WARD_OFFICER,
        wardId: ward.id,
        active: true
      }
    });
    console.log(`Created test WARD_OFFICER: ${officerEmail}`);
  } else {
    console.log(`Using existing test WARD_OFFICER: ${officerEmail}`);
  }

  // 3. Find or create an unresolved incident with an expired SLA deadline
  let incident = await prisma.incident.findFirst({
    where: {
      wardId: ward.id,
      status: { notIn: ['RESOLVED', 'REJECTED', 'DUPLICATE'] }
    }
  });

  if (!incident) {
    // Create a mock incident
    incident = await prisma.incident.create({
      data: {
        publicTrackingId: `TEST-SLA-${Date.now().toString().slice(-4)}`,
        category: 'POTHOLE',
        status: IncidentStatus.ASSIGNED,
        latitude: 22.7196,
        longitude: 75.8577,
        wardId: ward.id,
        cityId: ward.zone?.cityId || null,
        zoneId: ward.zoneId || null,
        slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours in the past
        slaBreached: false,
        isPublic: false
      }
    });
    console.log(`Created test incident with expired deadline: #${incident.publicTrackingId}`);
  } else {
    // Update existing incident to expired deadline for testing
    incident = await prisma.incident.update({
      where: { id: incident.id },
      data: {
        slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours in the past
        slaBreached: false,
        isPublic: false
      }
    });
    console.log(`Updated incident #${incident.publicTrackingId} to have expired SLA deadline.`);
  }

  // 4. Run the SLA Scan logic
  console.log('Running SLA scan...');
  const stats = await runSlaScan();
  console.log('SLA Scan Results:', stats);

  // 5. Verify the updates on the target incident
  const updatedIncident = await prisma.incident.findUnique({
    where: { id: incident.id }
  });

  if (updatedIncident) {
    console.log('\n--- VERIFICATION ---');
    console.log(`Tracking ID: ${updatedIncident.publicTrackingId}`);
    console.log(`Status (Expected: ESCALATED): ${updatedIncident.status}`);
    console.log(`slaBreached (Expected: true): ${updatedIncident.slaBreached}`);
    console.log(`isPublic (Expected: true): ${updatedIncident.isPublic}`);
    console.log(`Assigned To (Expected Ward Officer ID ${officer.id}): ${updatedIncident.assignedTo}`);
    
    if (
      updatedIncident.status === IncidentStatus.ESCALATED &&
      updatedIncident.slaBreached === true &&
      updatedIncident.isPublic === true &&
      updatedIncident.assignedTo === officer.id
    ) {
      console.log('✅ TEST PASSED: SLA Escalation successfully updated levels, reassigned officer, and marked public!');
    } else {
      console.error('❌ TEST FAILED: Verification parameters mismatch.');
    }
  } else {
    console.error('❌ TEST FAILED: Could not query updated incident.');
  }

  // 6. Cleanup test records
  console.log('Cleaning up test records...');
  // We keep the ward officer but reset or remove the mock incident if created
  if (updatedIncident?.publicTrackingId.startsWith('TEST-SLA-')) {
    await prisma.incident.delete({ where: { id: updatedIncident.id } });
    console.log('Removed test mock incident.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
