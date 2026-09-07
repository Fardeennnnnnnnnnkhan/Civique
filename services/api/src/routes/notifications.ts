import { Router, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/preferences', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const preferences = await (prisma as any).notificationPreference.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } });
  res.json({ success: true, data: { preferences } });
});

router.patch('/preferences', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const data: Record<string, boolean> = {};
  for (const key of ['inApp', 'email', 'sms']) if (typeof req.body[key] === 'boolean') data[key] = req.body[key];
  const preferences = await (prisma as any).notificationPreference.upsert({ where: { userId: req.user!.id }, update: data, create: { userId: req.user!.id, ...data } });
  res.json({ success: true, data: { preferences } });
});

/**
 * GET /api/v1/notifications
 * Retrieve all in-app notifications for the authenticated user, sorted by date.
 */
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user!;

    const notifications = await prisma.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: 'desc' },
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

    return res.json({
      success: true,
      data: {
        notifications
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
