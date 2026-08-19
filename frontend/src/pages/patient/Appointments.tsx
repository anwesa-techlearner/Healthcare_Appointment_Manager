import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../../api/endpoints';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function PatientAppointments() {
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => appointmentsApi.getMyAppointments().then((r) => r.data),
  });

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setCancellingId(id);
    try {
      await appointmentsApi.cancel(id, 'patient_requested');
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  }

  const statusColor: Record<string, string> = {
    confirmed: 'text-green-700 bg-green-50',
    held: 'text-amber-700 bg-amber-50',
    cancelled: 'text-red-700 bg-red-50',
    completed: 'text-slate-700 bg-slate-100',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>No appointments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt: any) => (
            <div key={appt.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-slate-900">Dr. {appt.doctorProfile?.user?.name}</p>
                  <p className="text-sm text-brand-600">{appt.doctorProfile?.specialization}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {format(new Date(appt.slotStart), 'EEEE, MMM d, yyyy • h:mm a')} –{' '}
                    {format(new Date(appt.slotEnd), 'h:mm a')}
                  </p>

                  {appt.symptoms?.[0] && (
                    <div className="mt-2 flex items-center gap-2">
                      <UrgencyBadge level={appt.symptoms[0].urgencyLevel} size="sm" />
                      <span className="text-xs text-slate-400">triage urgency</span>
                    </div>
                  )}

                  {appt.visitNote?.aiPatientSummary && (
                    <details className="mt-3">
                      <summary className="text-sm text-brand-600 cursor-pointer hover:underline">
                        View visit summary
                      </summary>
                      <div className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        {(() => {
                          try {
                            const parsed = JSON.parse(appt.visitNote.aiPatientSummary);
                            return (
                              <div>
                                <p className="mb-2">{parsed.summary}</p>
                                {parsed.follow_up_steps?.length > 0 && (
                                  <div>
                                    <p className="font-medium text-slate-700 mb-1">Follow-up steps:</p>
                                    <ul className="list-disc list-inside space-y-0.5">
                                      {parsed.follow_up_steps.map((s: string, i: number) => (
                                        <li key={i}>{s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          } catch {
                            return <p>{appt.visitNote.aiPatientSummary}</p>;
                          }
                        })()}
                      </div>
                    </details>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor[appt.status]}`}>
                    {appt.status}
                  </span>
                  {['confirmed', 'held'].includes(appt.status) && (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={cancellingId === appt.id}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      {cancellingId === appt.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
