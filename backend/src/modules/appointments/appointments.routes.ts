import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { bookingLimiter } from '../../middleware/rateLimiter.middleware';
import {
  holdSlot,
  confirmAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getAppointment,
  listPatientAppointments,
  listAllAppointments,
  completeAppointment,
} from './appointments.controller';

const router = Router();

// Patient: hold a slot (first step of booking)
router.post('/hold', authenticate, authorize('patient'), bookingLimiter, holdSlot);

// Patient: confirm a held slot (second step — like "payment confirm")
router.post('/:id/confirm', authenticate, authorize('patient'), bookingLimiter, confirmAppointment);

// Get a single appointment
router.get('/:id', authenticate, getAppointment);

// Patient: own appointments
router.get('/patient/my', authenticate, authorize('patient'), listPatientAppointments);

// Admin: all appointments
router.get('/', authenticate, authorize('admin'), listAllAppointments);

// Cancel (patient: own | doctor: own patients | admin: any)
router.post('/:id/cancel', authenticate, cancelAppointment);

// Reschedule (patient: own | doctor: own | admin: any)
router.post('/:id/reschedule', authenticate, rescheduleAppointment);

// Doctor marks appointment completed
router.post('/:id/complete', authenticate, authorize('doctor', 'admin'), completeAppointment);

export default router;
