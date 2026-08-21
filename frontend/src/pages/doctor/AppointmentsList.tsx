import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { doctorsApi } from '../../api/endpoints';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { format, isToday, isFuture, isPast } from 'date-fns';

const STATUS_OPTIONS = ['all', 'confirmed', 'completed', 'cancelled', 'held'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  held: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function DoctorAppointmentsList() {
  const { user } = useAuth();
  const doctorProfileId = user?.doctorProfile?.id;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['doctor-appointments-all', doctorProfileId],
    queryFn: () => doctorsApi.getAppointments(doctorProfileId!).then((r) => r.data),
    enabled: !!doctorProfileId,
  });

  const filtered = useMemo(() => {
    const base = statusFilter === 'all'
      ? appointments
      : appointments.filter((a: any) => a.status === statusFilter);
    return [...base].sort((a: any, b: any) =>
      new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime()
    );
  }, [appointments, statusFilter]);

  // Group into upcoming and past for better scannability
  const upcoming = filtered.filter((a: any) =>
    (isFuture(new Date(a.slotStart)) || isToday(new Date(a.slotStart))) &&
    ['confirmed', 'held'].includes(a.status)
  );
  const past = filtered.filter((a: any) =>
    !upcoming.includes(a)
  );

  function renderRow(appt: any) {
    const isUpcoming = isFuture(new Date(appt.slotStart)) || isToday(new Date(appt.slotStart));
    return (
      <Link
        key={appt.id}
        to={`/doctor/appointments/${appt.id}`}
        className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-300 transition-colors gap-4"
        aria-label={`View appointment with ${appt.patient?.name}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-slate-900">{appt.patient?.name}</p>
            {isToday(new Date(appt.slotStart)) && (
              <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">Today</span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(appt.slotStart), 'EEE, MMM d, yyyy · h:mm a')}
            {' – '}{format(new Date(appt.slotEnd), 'h:mm a')}
          </p>
          {appt.symptoms?.[0] && (
            <div className="mt-1.5 flex items-center gap-2">
              <UrgencyBadge level={appt.symptoms[0].urgencyLevel} size="sm" />
              {appt.symptoms[0].aiSummaryJson?.chief_complaint && (
                <span className="text-xs text-slate-400 truncate max-w-xs">
                  {appt.symptoms[0].aiSummaryJson.chief_complaint}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {appt.status}
          </span>
          {appt.visitNote && (
            <span className="text-xs text-slate-400">Notes ✓</span>
          )}
          <span className="text-xs text-brand-600">View →</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 mt-1">{appointments.length} total</p>
        </div>
        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-brand-300'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-500">No appointments matching this filter.</p>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-2">{upcoming.map(renderRow)}</div>
            </section>
          )}

          {/* Past / other */}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Past & Other ({past.length})
              </h2>
              <div className="space-y-2">{past.map(renderRow)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
