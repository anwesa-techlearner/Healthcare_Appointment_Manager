import { api } from './client';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
};

// ─── Doctors ──────────────────────────────────────────────────────────────────
export const doctorsApi = {
  search: (params?: { q?: string; specialization?: string }) =>
    api.get('/doctors', { params }),
  getById: (id: string) => api.get(`/doctors/${id}`),
  getSlots: (doctorId: string, date: string) =>
    api.get(`/doctors/${doctorId}/slots`, { params: { date } }),
  updateProfile: (id: string, data: object) =>
    api.patch(`/doctors/${id}/profile`, data),
  setAvailability: (id: string, slots: object[]) =>
    api.put(`/doctors/${id}/availability`, { slots }),
  addLeave: (id: string, date: string, reason?: string) =>
    api.post(`/doctors/${id}/leaves`, { date, reason }),
  removeLeave: (doctorId: string, leaveId: string) =>
    api.delete(`/doctors/${doctorId}/leaves/${leaveId}`),
  getLeaves: (id: string) => api.get(`/doctors/${id}/leaves`),
  getAppointments: (id: string) => api.get(`/doctors/${id}/appointments`),
};

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointmentsApi = {
  hold: (doctorProfileId: string, slotStart: string, idempotencyKey?: string) =>
    api.post('/appointments/hold', { doctorProfileId, slotStart, idempotencyKey }),
  confirm: (id: string) => api.post(`/appointments/${id}/confirm`),
  cancel: (id: string, reason?: string) =>
    api.post(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id: string, newSlotStart: string) =>
    api.post(`/appointments/${id}/reschedule`, { newSlotStart }),
  getById: (id: string) => api.get(`/appointments/${id}`),
  getMyAppointments: () => api.get('/appointments/patient/my'),
  getAllAppointments: () => api.get('/appointments'),
  complete: (id: string) => api.post(`/appointments/${id}/complete`),
};

// ─── Symptoms ─────────────────────────────────────────────────────────────────
export const symptomsApi = {
  submit: (appointmentId: string, rawText: string) =>
    api.post(`/appointments/${appointmentId}/symptoms`, { rawText }),
  get: (appointmentId: string) =>
    api.get(`/appointments/${appointmentId}/symptoms`),
};

// ─── Visit Notes ──────────────────────────────────────────────────────────────
export const visitNotesApi = {
  submit: (appointmentId: string, data: { doctorNotes: string; prescriptionJson?: object[] }) =>
    api.post(`/appointments/${appointmentId}/notes`, data),
  get: (appointmentId: string) =>
    api.get(`/appointments/${appointmentId}/notes`),
};

// ─── Users / Admin ────────────────────────────────────────────────────────────
export const usersApi = {
  createDoctor: (data: object) => api.post('/users/doctors', data),
  listUsers: (role?: string) => api.get('/users', { params: { role } }),
  getById: (id: string) => api.get(`/users/${id}`),
  getTimeline: (id: string) => api.get(`/users/${id}/timeline`),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  getFailedNotifications: () => api.get('/notifications/failed'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getAuditLogs: () => api.get('/admin/audit-logs'),
};

// ─── Health ───────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health', { baseURL: import.meta.env.VITE_API_URL }),
};
