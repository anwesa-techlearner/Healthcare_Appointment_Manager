import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { getFailedNotifications } from './notifications.service';

const router = Router();

// Admin view: failed notification log
router.get('/failed', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const failed = await getFailedNotifications();
    res.json(failed);
  } catch (err) { next(err); }
});

export default router;
