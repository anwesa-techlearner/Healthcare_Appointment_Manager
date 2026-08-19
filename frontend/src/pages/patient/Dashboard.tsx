import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appointmentsApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { format } from 'date-fns';

export default function PatientDashboard() {
  const { user } = useAuth();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => appointmentsApi.getMyAppointments().then((r) => r.data),
  });

  const upcoming = appointments.filter(
    (a: any) => ['confirmed', 'held'].includes(a.status) && new Date(a.slotStart) > new Date()
  );
  const past = appointments.filter(
    (a: any) => ['completed', 'cancelled'].includes(a.status)
  ).slice(0, 5);

  const statusColor: Record<string, string> = {
    confirmed: 'text-green-700 bg-green-50',
    held: 'text-amber-700 bg-amber-50',
    cancelled: 'text-red-700 bg-red-50',
    completed: 'text-slate-700 bg-slate-100',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mt-1">Manage your appointments and health records</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/patient/book"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-400 hover:shadow-sm transition-all group"
          aria-label="Book new appointment"
        >
          <div className="rounded-full bg-brand-100 p-3 group-hover:bg-brand-200 transition-colors">
            <svg className="w-5 h-5 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-slate-900">Book Appointment</p>
            <p className="text-sm text-slate-500">Find a doctor</p>
          </div>
        </Link>

        <Link
          to="/patient/timeline"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-400 hover:shadow-sm transition-all group"
          aria-label="View health timeline"
        >
          <div className="rounded-full bg-green-100 p-3 group-hover:bg-green-200 transition-colors">
            <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-slate-900">Health Timeline</p>
            <p className="text-sm text-slate-500">Past visits & prescriptions</p>
          </div>
        </Link>

        <Link
          to="/patient/appointments"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-400 hover:shadow-sm transition-all group"
          aria-label="View all appointments"
        >
          <div className="rounded-full bg-purple-100 p-3 group-hover:bg-purple-200 transition-colors">
            <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-slate-900">All Appointments</p>
            <p className="text-sm text-slate-500">{appointments.length} total</p>
          </div>
        </Link>
      </div>

      {/* Upcoming appointments */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Upcoming Appointments</h2>
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : upcoming.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-500 mb-3">No upcoming appointments</p>
            <Link to="/patient/book" className="text-brand-600 hover:underline text-sm font-medium">
              Book your first appointment →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt: any) => (
              <div key={appt.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">Dr. {appt.doctorProfile?.user?.name}</p>
                  <p className="text-sm text-slate-500">{appt.doctorProfile?.specialization}</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {format(new Date(appt.slotStart), 'EEEE, MMMM d, yyyy • h:mm a')}
                  </p>
                  {appt.symptoms?.[0] && (
                    <div className="mt-2">
                      <UrgencyBadge level={appt.symptoms[0].urgencyLevel} size="sm" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[appt.status]}`}>
                    {appt.status}
                  </span>
                  {appt.status === 'held' && (
                    <p className="text-xs text-amber-600">Awaiting confirmation</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent past appointments */}
      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Visits</h2>
          <div className="space-y-2">
            {past.map((appt: any) => (
              <Link
                key={appt.id}
                to={`/patient/appointments/${appt.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-800">Dr. {appt.doctorProfile?.user?.name}</p>
                  <p className="text-sm text-slate-500">{format(new Date(appt.slotStart), 'MMM d, yyyy')}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[appt.status]}`}>
                  {appt.status}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
