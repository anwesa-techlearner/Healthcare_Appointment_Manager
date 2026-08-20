import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';

// Patient pages
import PatientDashboard from './pages/patient/Dashboard';
import BookAppointment from './pages/patient/BookAppointment';
import PatientAppointments from './pages/patient/Appointments';
import PatientTimeline from './pages/patient/Timeline';

// Doctor pages
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorAppointmentDetail from './pages/doctor/AppointmentDetail';
import DoctorAvailability from './pages/doctor/Availability';
import DoctorLeaves from './pages/doctor/Leaves';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import CreateDoctor from './pages/admin/CreateDoctor';
import AuditLog from './pages/admin/AuditLog';
import FailedNotifications from './pages/admin/FailedNotifications';

export default function App() {
  return (
    <Routes>
      {/* Homepage — public, no auth required */}
      <Route path="/" element={<Home />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Patient routes */}
      <Route path="/patient" element={
        <ProtectedRoute roles={['patient']}>
          <Layout><PatientDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/patient/book" element={
        <ProtectedRoute roles={['patient']}>
          <Layout><BookAppointment /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/patient/appointments" element={
        <ProtectedRoute roles={['patient']}>
          <Layout><PatientAppointments /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/patient/timeline" element={
        <ProtectedRoute roles={['patient']}>
          <Layout><PatientTimeline /></Layout>
        </ProtectedRoute>
      } />

      {/* Doctor routes */}
      <Route path="/doctor" element={
        <ProtectedRoute roles={['doctor']}>
          <Layout><DoctorDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/doctor/appointments" element={
        <ProtectedRoute roles={['doctor']}>
          <Layout><DoctorDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/doctor/appointments/:id" element={
        <ProtectedRoute roles={['doctor']}>
          <Layout><DoctorAppointmentDetail /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/doctor/availability" element={
        <ProtectedRoute roles={['doctor']}>
          <Layout><DoctorAvailability /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/doctor/leaves" element={
        <ProtectedRoute roles={['doctor']}>
          <Layout><DoctorLeaves /></Layout>
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/doctors" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/doctors/new" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><CreateDoctor /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/appointments" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/notifications" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><FailedNotifications /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute roles={['admin']}>
          <Layout><AuditLog /></Layout>
        </ProtectedRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
