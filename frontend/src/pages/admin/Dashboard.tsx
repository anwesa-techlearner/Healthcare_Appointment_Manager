import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appointmentsApi, usersApi, notificationsApi } from '../../api/endpoints';

export default function AdminDashboard() {
  const { data: appointments = [] } = useQuery({
    queryKey: ['admin-appointments'],
    queryFn: () => appointmentsApi.getAllAppointments().then((r) => r.data),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.listUsers().then((r) => r.data),
  });

  const { data: failedNotifications = [] } = useQuery({
    queryKey: ['failed-notifications'],
    queryFn: () => notificationsApi.getFailedNotifications().then((r) => r.data),
  });

  const stats = {
    total: appointments.length,
    confirmed: appointments.filter((a: any) => a.status === 'confirmed').length,
    cancelled: appointments.filter((a: any) => a.status === 'cancelled').length,
    doctors: users.filter((u: any) => u.role === 'doctor').length,
    patients: users.filter((u: any) => u.role === 'patient').length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Appointments', value: stats.total },
          { label: 'Confirmed', value: stats.confirmed },
          { label: 'Cancelled', value: stats.cancelled },
          { label: 'Doctors', value: stats.doctors },
          { label: 'Patients', value: stats.patients },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Failed notifications alert */}
      {failedNotifications.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-red-800">{failedNotifications.length} failed notifications</p>
            <p className="text-sm text-red-600">These require attention</p>
          </div>
          <Link to="/admin/notifications" className="text-sm bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            View
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { to: '/admin/doctors/new', label: 'Add Doctor', desc: 'Create a new doctor account', icon: '👨‍⚕️' },
          { to: '/admin/appointments', label: 'All Appointments', desc: 'View and manage', icon: '📅' },
          { to: '/admin/notifications', label: 'Notifications', desc: 'Email & calendar logs', icon: '🔔' },
          { to: '/admin/audit', label: 'Audit Log', desc: 'Admin action history', icon: '📋' },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-400 hover:shadow-sm transition-all"
          >
            <span className="text-2xl mb-2 block" aria-hidden="true">{action.icon}</span>
            <p className="font-medium text-slate-900">{action.label}</p>
            <p className="text-sm text-slate-500">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent appointments */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Appointments</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Doctor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.slice(0, 10).map((appt: any) => (
                <tr key={appt.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{appt.patient?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{appt.doctorProfile?.user?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      appt.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                      appt.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      appt.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {appt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
