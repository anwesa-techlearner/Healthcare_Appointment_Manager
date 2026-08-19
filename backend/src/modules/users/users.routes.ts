import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import {
  createDoctor,
  listUsers,
  getUserById,
  updateUser,
  getPatientTimeline,
} from './users.controller';

const router = Router();

// Admin: create doctor accounts
router.post('/doctors', authenticate, authorize('admin'), createDoctor);

// Admin: list all users
router.get('/', authenticate, authorize('admin'), listUsers);

// Any authenticated user can get their own profile; admins can get any
router.get('/:id', authenticate, getUserById);

// Admin: update any user; user: update themselves
router.patch('/:id', authenticate, updateUser);

// Patient health timeline (patient sees own, doctor/admin see any)
router.get('/:id/timeline', authenticate, getPatientTimeline);

export default router;
