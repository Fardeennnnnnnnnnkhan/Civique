import { Pool } from 'pg';
import { Job } from './queue';

type Payload = { notificationId: string; channel: 'EMAIL' | 'SMS' };

function parsePayload(payload: unknown): Payload {
  if (!payload || typeof payload !== 'object') throw new Error('INVALID_NOTIFICATION_PAYLOAD');
  const value = payload as Partial<Payload>;
  if (!value.notificationId || (value.channel !== 'EMAIL' && value.channel !== 'SMS')) throw new Error('INVALID_NOTIFICATION_PAYLOAD');
  return value as Payload;
}

export async function processNotificationDelivery(pool: Pool, job: Job): Promise<void> {
  const { notificationId, channel } = parsePayload(job.payload);
  const attempt = await pool.query<{ status: string }>(`UPDATE delivery_attempts SET status='RUNNING', attempt_count=attempt_count+1, next_attempt_at=NULL WHERE notification_id=$1::uuid AND channel=$2 AND status NOT IN ('SENT','SKIPPED','PENDING_CONFIGURATION') RETURNING status`, [notificationId, channel]);
  if (!attempt.rowCount) return;
  const notification = await pool.query<{ title: string; message: string; email: string | null; phone_number: string | null }>(`SELECT n.title, n.message, u.email, u.phone_number FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.id=$1::uuid`, [notificationId]);
  if (!notification.rowCount) throw new Error('NOTIFICATION_NOT_FOUND');
  const row = notification.rows[0];
  if (channel === 'SMS') {
    await pool.query(`UPDATE delivery_attempts SET status='PENDING_CONFIGURATION', last_error='SMS provider is not configured' WHERE notification_id=$1::uuid AND channel=$2`, [notificationId, channel]);
    return;
  }
  if (process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'true' || !process.env.RESEND_API_KEY) {
    await pool.query(`UPDATE delivery_attempts SET status='PENDING_CONFIGURATION', last_error='Resend is not configured' WHERE notification_id=$1::uuid AND channel=$2`, [notificationId, channel]);
    return;
  }
  if (!row.email) {
    await pool.query(`UPDATE delivery_attempts SET status='SKIPPED', last_error='Recipient has no email address' WHERE notification_id=$1::uuid AND channel=$2`, [notificationId, channel]);
    return;
  }
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'Civique <notifications@civique.local>', to: [row.email], subject: row.title, text: row.message }) });
  if (!response.ok) throw new Error(`RESEND_${response.status}`);
  const result = await response.json() as { id?: string };
  await pool.query(`UPDATE delivery_attempts SET status='SENT', sent_at=NOW(), provider_message_id=$3, last_error=NULL WHERE notification_id=$1::uuid AND channel=$2`, [notificationId, channel, result.id || null]);
}
