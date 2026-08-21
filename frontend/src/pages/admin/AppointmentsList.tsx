import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../../api/endpoints';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['all', 'confirmed', 'held', 'completed', 'cancelled'] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  held: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-50 text-red-700',
};

const PAGE_SIZE = 20;

export default function AdminAppointmentsList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['admin-appointments-full'],
    queryFn: () => appointmentsApi.getAllAppointments().then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const base = statusFilter === 'all'
      ? all
      : all.filter((a: any) => a.status === statusFilter);
    // Sort newest first
    return [...base].sort((a: any, b: any) =>
      new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime()
    );
  }, [all, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filter changes
  function handleFilterChange(val: StatusFilter) {
    setStatusFilter(val);
    setPage(1);
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this appointment? The patient will be notified.')) return;
    setCancellingId(id);
    try {
      await appointmentsApi.cancel(id, 'admin_cancelled');
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: ['admin-appointments-full'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Appointments</h1>
          <p className="text-slate-500 mt-1">
            {filtered.length} appointment{filtered.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
          </p>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap" scope="col">Date & Time</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Patient</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Doctor</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((appt: any) => (
                  <tr key={appt.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      <p>{format(new Date(appt.slotStart), 'MMM d, yyyy')}</p>
                      <p className="text-xs text-slate-400">{format(new Date(appt.slotStart), 'h:mm a')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{appt.patient?.name}</p>
                      <p className="text-xs text-slate-400">{appt.patient?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{appt.doctorProfile?.user?.name}</p>
                      <p className="text-xs text-slate-400">{appt.doctorProfile?.specialization}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {appt.status}
                      </span>
                      {appt.cancelledReason && (
                        <p className="text-xs text-slate-400 mt-0.5">{appt.cancelledReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {['confirmed', 'held'].includes(appt.status) && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          disabled={cancellingId === appt.id}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          {cancellingId === appt.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <p className="text-slate-500">
                Page {page} of {totalPages} · {filtered.length} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
