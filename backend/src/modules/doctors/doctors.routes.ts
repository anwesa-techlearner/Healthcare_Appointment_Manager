import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import {
  searchDoctors,
  getDoctorById,
  updateDoctorProfile,
  setAvailability,
  getAvailableSlots,
  addLeave,
  removeLeave,
  getDoctorLeaves,
  getDoctorAppointments,
} from './doctors.controller';

const router = Router();

// Public-ish: search doctors and get available slots
router.get('/', authenticate, searchDoctors);
router.get('/:id', authenticate, getDoctorById);
router.get('/:id/slots', authenticate, getAvailableSlots);

// Doctor: manage own profile
router.patch('/:id/profile', authenticate, authorize('doctor', 'admin'), updateDoctorProfile);
router.put('/:id/availability', authenticate, authorize('doctor', 'admin'), setAvailability);

// Leave management
router.post('/:id/leaves', authenticate, authorize('doctor', 'admin'), addLeave);
router.delete('/:id/leaves/:leaveId', authenticate, authorize('doctor', 'admin'), removeLeave);
router.get('/:id/leaves', authenticate, getDoctorLeaves);

// Doctor: view own appointments
router.get('/:id/appointments', authenticate, authorize('doctor', 'admin'), getDoctorAppointments);

export default router;
