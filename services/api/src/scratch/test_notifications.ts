import { PrismaClient } from '@prisma/client';
import { createNotification } from '../utils/notifications';

const prisma = new PrismaClient();

async function main() {
  console.log('--- NOTIFICATIONS SYSTEM TEST START ---');

  // 1. Fetch any active user
  const user = await prisma.user.findFirst({
    where: { active: true }
  });

  if (!user) {
    console.error('No active users found in database to run notifications test.');
    return;
  }

  console.log(`Using user: ${user.email} (ID: ${user.id})`);

  // 2. Create notification
  const title = `Verification Test #${Date.now().toString().slice(-4)}`;
  const message = 'The quick brown fox jumps over the lazy dog notification test.';
  const type = 'INCIDENT_CREATED';

  console.log('Creating notification in database...');
  const notif = await createNotification(user.id, title, message, type);

  console.log(`Created Notification ID: ${notif.id}`);

  // 3. Verify database state
  const fetchedNotif = await prisma.notification.findUnique({
    where: { id: notif.id }
  });

  if (fetchedNotif) {
    console.log('\n--- VERIFICATION ---');
    console.log(`Title: ${fetchedNotif.title}`);
    console.log(`Message: ${fetchedNotif.message}`);
    console.log(`Read Status (Expected: false): ${fetchedNotif.read}`);
    console.log(`Type: ${fetchedNotif.type}`);
    
    if (
      fetchedNotif.title === title &&
      fetchedNotif.message === message &&
      fetchedNotif.read === false &&
      fetchedNotif.type === type
    ) {
      console.log('✅ DATABASE VERIFICATION PASSED: Notification successfully saved with correct parameters.');
    } else {
      console.error('❌ DATABASE VERIFICATION FAILED: Field values mismatch.');
    }
  } else {
    console.error('❌ DATABASE VERIFICATION FAILED: Could not query created notification.');
  }

  // 4. Test Mark As Read status transition
  console.log('\nSimulating marking notification as read...');
  const updated = await prisma.notification.update({
    where: { id: notif.id },
    data: { read: true }
  });

  console.log(`Read Status after update (Expected: true): ${updated.read}`);
  if (updated.read === true) {
    console.log('✅ STATE TRANSITION PASSED: Read flag set to true.');
  } else {
    console.error('❌ STATE TRANSITION FAILED: Read flag remained false.');
  }

  // 5. Cleanup test notification
  console.log('\nCleaning up notification...');
  await prisma.notification.delete({
    where: { id: notif.id }
  });
  console.log('Removed test notification record.');
  console.log('--- TEST FINISHED ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
