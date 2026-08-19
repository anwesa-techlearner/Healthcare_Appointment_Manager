import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doctorsApi } from '../../api/endpoints';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { format, isToday, isTomorrow } from 'date-fns';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const doctorProfileId = user?.doctorProfile?.id;

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor-appointments', doctorProfileId],
    queryFn: () => doctorsApi.getAppointments(doctorProfileId!).then((r) => r.data),
    enabled: !!doctorProfileId,
  });

  const today = appointments.filter(
    (a: any) => isToday(new Date(a.slotStart)) && ['confirmed', 'completed'].includes(a.status)
  );
  const upcoming = appointments.filter(
    (a: any) => !isToday(new Date(a.slotStart)) && new Date(a.slotStart) > new Date() && a.status === 'confirmed'
  );
  const highUrgency = upcoming.filter(
    (a: any) => a.symptoms?.[0]?.urgencyLevel === 'High'
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mt-1">{user?.doctorProfile?.specialization}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Today's patients", value: today.length, color: 'text-brand-700' },
          { label: 'Upcoming', value: upcoming.length, color: 'text-green-700' },
          { label: 'High urgency', value: highUrgency.length, color: 'text-red-700' },
          { label: 'Total all-time', value: appointments.length, color: 'text-slate-700' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* High urgency triage queue (SPEC §8.2) */}
      {highUrgency.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            High Urgency Triage Queue
          </h2>
          <div className="space-y-3">
            {highUrgency.map((appt: any) => (
              <div key={appt.id} className="bg-red-50 rounded-xl border border-red-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{appt.patient?.name}</p>
                    <p className="text-sm text-slate-500">{format(new Date(appt.slotStart), 'MMM d, h:mm a')}</p>
                    {appt.symptoms?.[0]?.aiSummaryJson?.chief_complaint && (
                      <p className="text-sm text-red-700 mt-1">
                        Chief complaint: {appt.symptoms[0].aiSummaryJson.chief_complaint}
                      </p>
                    )}
                  </div>
                  <UrgencyBadge level="High" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Today's appointments */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Today's Schedule</h2>
        {isLoading ? (
          <p className="text-slate-500">Loading...</p>
        ) : today.length === 0 ? (
          <p className="text-slate-400 text-sm">No appointments today.</p>
        ) : (
          <div className="space-y-3">
            {today.sort((a: any, b: any) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime())
              .map((appt: any) => (
                <Link
                  key={appt.id}
                  to={`/doctor/appointments/${appt.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{appt.patient?.name}</p>
                    <p className="text-sm text-slate-500">{format(new Date(appt.slotStart), 'h:mm a')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {appt.symptoms?.[0] && (
                      <UrgencyBadge level={appt.symptoms[0].urgencyLevel} size="sm" />
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${appt.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700'}`}>
                      {appt.status}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/doctor/availability" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors">
          <p className="font-medium text-slate-900">Set Availability</p>
          <p className="text-sm text-slate-500 mt-0.5">Manage working hours</p>
        </Link>
        <Link to="/doctor/leaves" className="bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors">
          <p className="font-medium text-slate-900">Leave Days</p>
          <p className="text-sm text-slate-500 mt-0.5">Block days off</p>
        </Link>
      </div>
    </div>
  );
}
