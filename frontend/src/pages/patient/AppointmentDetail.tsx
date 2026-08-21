import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../../api/endpoints';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700',
  held: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-50 text-red-700',
};

export default function PatientAppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsApi.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setCancelling(true);
    try {
      await appointmentsApi.cancel(id!, 'patient_requested');
      toast.success('Appointment cancelled');
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      navigate('/patient/appointments');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return <p className="text-slate-500">Loading...</p>;
  }
  if (!appt) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-3">Appointment not found.</p>
        <Link to="/patient/appointments" className="text-brand-600 hover:underline text-sm">
          ← Back to appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">
        ← Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Dr. {appt.doctorProfile?.user?.name}
            </h1>
            <p className="text-sm text-brand-600 font-medium mt-0.5">
              {appt.doctorProfile?.specialization}
            </p>
            <p className="text-slate-700 mt-3">
              {format(new Date(appt.slotStart), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-slate-500 text-sm">
              {format(new Date(appt.slotStart), 'h:mm a')} – {format(new Date(appt.slotEnd), 'h:mm a')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {appt.status}
            </span>
            {['confirmed', 'held'].includes(appt.status) && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-xs text-red-600 hover:underline disabled:opacity-50 mt-1"
              >
                {cancelling ? 'Cancelling…' : 'Cancel appointment'}
              </button>
            )}
          </div>
        </div>
        {appt.cancelledReason && (
          <p className="mt-3 text-xs text-slate-400">
            Cancellation reason: {appt.cancelledReason.replace(/_/g, ' ')}
          </p>
        )}
      </div>

      {/* Symptoms you submitted */}
      {appt.symptoms?.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Symptoms you reported</h2>
          {appt.symptoms.map((symptom: any) => (
            <div key={symptom.id} className="space-y-2 text-sm text-slate-700">
              <p>{symptom.rawText}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500">Triage urgency:</span>
                <UrgencyBadge level={symptom.urgencyLevel} size="sm" />
              </div>
              {!symptom.aiGenerated && (
                <p className="text-xs text-amber-600">AI summary unavailable for this visit</p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Visit summary (read-only for patient) */}
      {appt.visitNote && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Visit Summary</h2>
          {appt.visitNote.aiPatientSummary ? (
            (() => {
              try {
                const parsed = JSON.parse(appt.visitNote.aiPatientSummary);
                return (
                  <div className="space-y-4 text-sm text-slate-700">
                    <p>{parsed.summary}</p>
                    {parsed.medication_schedule?.length > 0 && (
                      <div>
                        <p className="font-medium text-slate-800 mb-2">Medications prescribed:</p>
                        <ul className="space-y-2">
                          {parsed.medication_schedule.map((med: any, i: number) => (
                            <li key={i} className="flex gap-3 bg-slate-50 rounded-lg p-3">
                              <span className="text-brand-600 font-medium shrink-0">•</span>
                              <div>
                                <p className="font-medium">{med.medication}</p>
                                <p className="text-slate-500 text-xs mt-0.5">
                                  {med.frequency}{med.duration ? ` · ${med.duration}` : ''}
                                  {med.dosage ? ` · ${med.dosage}` : ''}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {parsed.follow_up_steps?.length > 0 && (
                      <div>
                        <p className="font-medium text-slate-800 mb-2">Follow-up steps:</p>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          {parsed.follow_up_steps.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              } catch {
                return <p className="text-sm text-slate-700">{appt.visitNote.aiPatientSummary}</p>;
              }
            })()
          ) : (
            <p className="text-sm text-slate-500">Summary not yet available.</p>
          )}
        </section>
      )}

      {/* No notes yet */}
      {appt.status === 'completed' && !appt.visitNote && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Visit notes haven't been submitted by your doctor yet.</p>
        </div>
      )}
    </div>
  );
}
