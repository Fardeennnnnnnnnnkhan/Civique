import { PrismaClient, IncidentStatus } from '@prisma/client';
import { runMlRetryScan } from '../jobs/mlRetry';

const prisma = new PrismaClient();

async function main() {
  console.log('--- AI CLASSIFICATION & RETRY TEST START ---');

  // 1. Resolve geography boundaries
  const ward = await prisma.ward.findFirst({
    include: { zone: true }
  });
  if (!ward) {
    console.error('No wards found in database. Please run seed script first.');
    return;
  }

  // Find city ID
  const city = await prisma.city.findFirst();
  if (!city) {
    console.error('No cities found in database.');
    return;
  }

  console.log(`Using Ward: ${ward.name}, City: ${city.name}`);

  // 2. Create a mock Incident in REPORTED status and a linked Report with null confidence (simulating offline ML on submit)
  const trackingId = `TEST-ML-${Date.now().toString().slice(-4)}`;
  const mockImageUrl = 'https://picsum.photos/200/300'; // Random public placeholder image

  console.log(`Creating mock incident ${trackingId} and report...`);
  
  const incident = await prisma.incident.create({
    data: {
      publicTrackingId: trackingId,
      category: 'GARBAGE', // User-supplied category
      status: IncidentStatus.REPORTED, // Starts as REPORTED because ML was skipped/offline
      latitude: 22.7196,
      longitude: 75.8577,
      cityId: city.id,
      zoneId: ward.zoneId,
      wardId: ward.id,
      reportCount: 1,
      beforePhotoUrls: [mockImageUrl],
    }
  });

  const report = await prisma.report.create({
    data: {
      incidentId: incident.id,
      photoUrl: mockImageUrl,
      description: 'There is a big pile of trash and garbage blocking the pavement near the shop.',
      categorySuggested: 'GARBAGE',
      categoryConfirmed: 'GARBAGE',
      categoryConfidence: null, // Null indicates ML classification is pending retry
      latitude: 22.7196,
      longitude: 75.8577,
      captureMethod: 'CAMERA_LIVE',
      citizenName: 'Tester Citizen',
      citizenPhone: '9876543210',
      landmark: 'Pavement Shop',
      severity: 'MEDIUM'
    }
  });

  console.log(`Created pending Report ID: ${report.id} linked to Incident ID: ${incident.id}`);
  console.log(`Initial Incident Status: ${incident.status}`);
  console.log(`Initial Report Category Confidence: ${report.categoryConfidence}`);

  // 3. Run the background ML Retry scanner synchronously to process this report
  console.log('\n--- Running ML Retry scan... ---');
  const result = await runMlRetryScan();
  console.log(`Scan completed: Processed: ${result.processedCount}, Success: ${result.successCount}`);

  // 4. Verify updates
  console.log('\n--- Verification checks... ---');
  const updatedReport = await prisma.report.findUnique({
    where: { id: report.id }
  });

  const updatedIncident = await prisma.incident.findUnique({
    where: { id: incident.id }
  });

  if (!updatedReport || !updatedIncident) {
    console.error('Failed to query updated records!');
    return;
  }

  const department = updatedIncident.departmentId
    ? await prisma.department.findUnique({ where: { id: updatedIncident.departmentId } })
    : null;

  console.log(`Updated Report Category Suggested: ${updatedReport.categorySuggested}`);
  console.log(`Updated Report Category Confirmed: ${updatedReport.categoryConfirmed}`);
  console.log(`Updated Report Category Confidence: ${updatedReport.categoryConfidence}`);
  console.log(`Updated Incident Category: ${updatedIncident.category}`);
  console.log(`Updated Incident Status: ${updatedIncident.status} (Expected: OPEN)`);
  console.log(`Assigned Department: ${department ? department.name : 'None'} (Expected: Sanitation Department)`);
  console.log(`SLA Deadline: ${updatedIncident.slaDeadline}`);

  // 5. Clean up test records
  console.log('\nCleaning up mock test records...');
  await prisma.report.delete({ where: { id: report.id } });
  await prisma.incident.delete({ where: { id: incident.id } });
  console.log('Cleanup completed successfully.');

  console.log('--- AI CLASSIFICATION & RETRY TEST FINISHED ---');
}

main()
  .catch((error) => {
    console.error('Test execution failed with error:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
