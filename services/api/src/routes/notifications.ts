import { Router, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT } from '../middleware/auth';
import { notificationLink } from '../services/notificationPolicy';

const router = Router();

router.get('/preferences', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const preferences = await (prisma as any).notificationPreference.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } });
  const oversight = await prisma.$queryRaw<Array<{ oversight_notifications: boolean }>>`SELECT oversight_notifications FROM users WHERE id=${req.user!.id}::uuid`;
  res.json({ success: true, data: { preferences: { ...preferences, oversight: oversight[0]?.oversight_notifications || false } } });
});

router.patch('/preferences', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  if (typeof req.body.oversight === 'boolean' && req.user!.role !== 'SUPER_ADMIN') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super administrators can configure platform oversight.' } });
  if (req.body.email === true || req.body.sms === true) return res.status(409).json({ success: false, error: { code: 'CHANNEL_NOT_AVAILABLE', message: 'Email and SMS delivery are not configured for this release.' } });
  const data: Record<string, boolean> = {};
  for (const key of ['inApp', 'email', 'sms']) if (typeof req.body[key] === 'boolean') data[key] = req.body[key];
  const preferences = await (prisma as any).notificationPreference.upsert({ where: { userId: req.user!.id }, update: data, create: { userId: req.user!.id, ...data } });
  if (typeof req.body.oversight === 'boolean') {
    await prisma.$executeRaw`UPDATE users SET oversight_notifications=${req.body.oversight} WHERE id=${req.user!.id}::uuid`;
  }
  res.json({ success: true, data: { preferences: { ...preferences, oversight: req.user!.role === 'SUPER_ADMIN' ? Boolean(req.body.oversight) : false } } });
});

/**
 * GET /api/v1/notifications
 * Retrieve all in-app notifications for the authenticated user, sorted by date.
 */
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;

    const limitValue = Number(req.query.limit); const limit = Number.isFinite(limitValue) ? Math.min(Math.max(Math.trunc(limitValue), 1), 50) : 20;
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : undefined;
    const notifications = await prisma.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        incident: {
          select: {
            id: true,
            publicTrackingId: true,
            category: true,
            status: true
          }
        }
      }
    });

    const hasMore = notifications.length > limit; const page = notifications.slice(0, limit); const unreadCount = await prisma.notification.count({ where: { userId: actor.id, read: false } });
    return res.json({
      success: true,
      data: {
        notifications: page.map((notification) => ({
          ...notification,
          link: notificationLink(notification.type, notification.incidentId),
        })),
        unreadCount,
        pagination: { limit, hasMore, nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null }
      }
    });
  } catch (error: any) {
    console.error('Failed to query notifications:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while querying notifications.'
      }
    });
  }
});

router.get('/unread-count', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });
  return res.json({ success: true, data: { unreadCount } });
});

/**
 * POST /api/v1/notifications/:id/read
 * Marks a single notification as read.
 */
router.post('/:id/read', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const actor = req.user!;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found.'
        }
      });
    }

    if (notification.userId !== actor.id) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to modify this notification.'
        }
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    return res.json({
      success: true,
      data: {
        notification: updated
      }
    });
  } catch (error: any) {
    console.error('Failed to mark notification as read:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while marking notification as read.'
      }
    });
  }
});

/**
 * POST /api/v1/notifications/read-all
 * Marks all notifications for the user as read.
 */
router.post('/read-all', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;

    await prisma.notification.updateMany({
      where: { 
        userId: actor.id,
        read: false
      },
      data: { read: true }
    });

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error: any) {
    console.error('Failed to mark all notifications as read:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message || 'An unexpected error occurred while marking all notifications as read.'
      }
    });
  }
});

export default router;
