import { prisma } from '../db';
import { getIO } from './socket';
import { enqueueJob } from '../jobs/queue';

/**
 * Creates an in-app notification in the database and dispatches it in real time
 * to the target user via WebSockets.
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  incidentId?: string,
  idempotencyKey?: string
) {
  try {
    if (idempotencyKey) {
      const existing = await (prisma.notification as any).findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
    }
    const prefs = await (prisma as any).notificationPreference.upsert({ where: { userId }, update: {}, create: { userId } });
    const notification = await prisma.$transaction(async (tx) => {
      const created = await (tx.notification as any).create({ data: { userId, title, message, type, incidentId: incidentId || null, read: false, idempotencyKey: idempotencyKey || null } });
      if (prefs.inApp !== false) {
        await (tx as any).deliveryAttempt.upsert({ where: { notificationId_channel: { notificationId: created.id, channel: 'IN_APP' } }, update: { status: 'SENT', attemptCount: { increment: 1 }, sentAt: new Date() }, create: { notificationId: created.id, channel: 'IN_APP', status: 'SENT', attemptCount: 1, sentAt: new Date() } });
      }
      for (const channel of [prefs.email ? 'EMAIL' : null, prefs.sms ? 'SMS' : null].filter(Boolean) as string[]) {
        await (tx as any).deliveryAttempt.create({ data: { notificationId: created.id, channel, status: 'QUEUED' } });
        await enqueueJob(tx, { type: 'NOTIFICATION_DELIVERY', payload: { notificationId: created.id, channel }, idempotencyKey: `notification:${created.id}:${channel}` });
      }
      return created;
    });

    if (prefs.inApp !== false) {
      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('notification:received', notification);
      } catch (socketErr) {
        console.warn('[Socket] Socket.io not active or user room emit failed:', socketErr);
      }
    }

    return notification;
  } catch (error) {
    if (idempotencyKey) {
      const existing = await (prisma.notification as any).findUnique({ where: { idempotencyKey } }).catch(() => null);
      if (existing) return existing;
    }
    console.error('[Notification Engine] Failed to create notification:', error);
    throw error;
  }
}

/**
 * Dispatches notifications to multiple user IDs in parallel.
 */
export async function notifyUsers(
  userIds: string[],
  title: string,
  message: string,
  type: string,
  incidentId?: string,
  idempotencyPrefix?: string
) {
  const promises = userIds.map(uid => createNotification(uid, title, message, type, incidentId, idempotencyPrefix ? `${idempotencyPrefix}:${uid}` : undefined));
  return Promise.all(promises);
}
