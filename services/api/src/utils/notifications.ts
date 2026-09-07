import { prisma } from '../db';
import { getIO } from './socket';

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
    const prefs = await (prisma as any).notificationPreference.findUnique({ where: { userId } }).catch(() => null);
    if (prefs && prefs.inApp === false) return undefined as any;
    if (idempotencyKey) {
      const existing = await (prisma.notification as any).findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
    }
    // 1. Save notification to database
    const notification = await (prisma.notification as any).create({
      data: {
        userId,
        title,
        message,
        type,
        incidentId: incidentId || null,
        read: false
        , idempotencyKey: idempotencyKey || null
      }
    });
    await (prisma as any).deliveryAttempt.upsert({ where: { notificationId_channel: { notificationId: notification.id, channel: 'IN_APP' } }, update: { status: 'SENT', attemptCount: { increment: 1 }, sentAt: new Date() }, create: { notificationId: notification.id, channel: 'IN_APP', status: 'SENT', attemptCount: 1, sentAt: new Date() } });

    // 2. Broadcast via Socket.io to the specific user's room
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification:received', notification);
      console.log(`[Socket] Dispatched notification:received to user room: ${userId}`);
    } catch (socketErr) {
      console.warn('[Socket] Socket.io not active or user room emit failed:', socketErr);
    }

    return notification;
  } catch (error) {
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
