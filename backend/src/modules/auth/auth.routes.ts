import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimiter.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { register, login, refreshToken, logout, getMe } from './auth.controller';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
