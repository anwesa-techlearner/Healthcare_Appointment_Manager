import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { getAuthUrl, handleOAuthCallback } from './calendar.service';

const router = Router();

// Initiate Google OAuth flow
router.get('/oauth/connect', authenticate, (req: Request, res: Response) => {
  const url = getAuthUrl(req.user!.userId);
  res.json({ url });
});

// OAuth callback from Google
router.get('/oauth/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state: userId } = req.query as { code: string; state: string };
    if (!code || !userId) {
      res.status(400).json({ error: 'Missing code or state' });
      return;
    }
    await handleOAuthCallback(code, userId);
    res.redirect(`${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/calendar/connected`);
  } catch (err) {
    next(err);
  }
});

export default router;
