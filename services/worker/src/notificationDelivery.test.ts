import assert from 'node:assert/strict';
import { processNotificationDelivery } from './notificationDelivery';

class FakePool {
  queries: string[] = [];
  async query(sql: string): Promise<{ rowCount: number; rows: unknown[] }> {
    this.queries.push(sql);
    if (sql.startsWith('UPDATE delivery_attempts SET status=\'RUNNING\'')) return { rowCount: 1, rows: [] };
    if (sql.startsWith('SELECT n.title')) return { rowCount: 1, rows: [{ title: 'Test', message: 'Body', email: 'citizen@example.invalid', phone_number: null }] };
    return { rowCount: 1, rows: [] };
  }
}

async function main() {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const pool = new FakePool();
  await processNotificationDelivery(pool as never, { id: 'job', type: 'NOTIFICATION_DELIVERY', payload: { notificationId: '00000000-0000-0000-0000-000000000001', channel: 'EMAIL' }, attempts: 1, max_attempts: 5 });
  assert.match(pool.queries[2], /PENDING_CONFIGURATION/);
  if (previousKey) process.env.RESEND_API_KEY = previousKey;
  else delete process.env.RESEND_API_KEY;
  console.log('Notification delivery payload and provider-safety tests passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
