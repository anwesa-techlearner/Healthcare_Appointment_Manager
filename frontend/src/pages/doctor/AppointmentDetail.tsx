import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, visitNotesApi } from '../../api/endpoints';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface PrescriptionItem {
  medication: string;
  dosage?: string;
  frequency: string;
  duration?: string;
}

export default function DoctorAppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    { medication: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const { data: appt, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentsApi.getById(id!).then((r) => r.data),
    enabled: !!id,
  });

  async function handleComplete() {
    if (!confirm('Mark this appointment as completed?')) return;
    setCompleting(true);
    try {
      await appointmentsApi.complete(id!);
      toast.success('Appointment marked completed');
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to complete');
    } finally {
      setCompleting(false);
    }
  }

  async function handleSubmitNotes(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorNotes.trim()) { toast.error('Notes are required'); return; }
    setSubmitting(true);
    try {
      const cleanPrescriptions = prescriptions.filter((p) => p.medication.trim());
      await visitNotesApi.submit(id!, {
        doctorNotes,
        prescriptionJson: cleanPrescriptions.length > 0 ? cleanPrescriptions : undefined,
      });
      toast.success('Visit notes submitted. Patient summary generated.');
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to submit notes');
    } finally {
      setSubmitting(false);
    }
  }

  function addPrescriptionRow() {
    setPrescriptions((prev) => [...prev, { medication: '', dosage: '', frequency: '', duration: '' }]);
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;
  if (!appt) return <p className="text-red-500">Appointment not found</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">← Back</button>

      {/* Appointment Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{appt.patient?.name}</h1>
            <p className="text-slate-500 text-sm">{appt.patient?.email} · {appt.patient?.phone}</p>
            <p className="text-slate-700 mt-2">
              {format(new Date(appt.slotStart), 'EEEE, MMMM d, yyyy')} ·{' '}
              {format(new Date(appt.slotStart), 'h:mm a')} – {format(new Date(appt.slotEnd), 'h:mm a')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              appt.status === 'confirmed' ? 'bg-green-50 text-green-700' :
              appt.status === 'completed' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-500'
            }`}>{appt.status}</span>
            {appt.status === 'confirmed' && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 disabled:opacity-50"
              >
                {completing ? 'Completing...' : 'Mark Completed'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pre-visit AI Summary (SPEC §3) */}
      {appt.symptoms?.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pre-Visit AI Triage Summary</h2>
          {appt.symptoms.map((symptom: any) => (
            <div key={symptom.id}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-medium text-slate-600">Urgency:</span>
                <UrgencyBadge level={symptom.urgencyLevel} />
              </div>
              <div className="text-sm text-slate-700 space-y-2">
                <div>
                  <span className="font-medium">Raw symptoms: </span>
                  {symptom.rawText}
                </div>
                {symptom.aiSummaryJson && (
                  <>
                    <div>
                      <span className="font-medium">Chief complaint: </span>
                      {symptom.aiSummaryJson.chief_complaint}
                    </div>
                    {symptom.aiSummaryJson.suggested_questions?.length > 0 && (
                      <div>
                        <p className="font-medium mb-1">Suggested questions to ask:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {symptom.aiSummaryJson.suggested_questions.map((q: string, i: number) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {!symptom.aiGenerated && (
                  <p className="text-amber-600 text-xs">⚠ AI summary unavailable — raw symptoms shown</p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Visit Notes form */}
      {appt.status === 'completed' && !appt.visitNote && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Submit Visit Notes</h2>
          <form onSubmit={handleSubmitNotes} className="space-y-4">
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                Clinical Notes *
              </label>
              <textarea
                id="notes"
                rows={5}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Examination findings, diagnosis, treatment plan..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                required
                aria-required="true"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prescription</label>
              {prescriptions.map((rx, i) => (
                <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {['medication', 'dosage', 'frequency', 'duration'].map((field) => (
                    <input
                      key={field}
                      type="text"
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      value={rx[field as keyof PrescriptionItem] ?? ''}
                      onChange={(e) => {
                        const updated = [...prescriptions];
                        updated[i] = { ...updated[i], [field]: e.target.value };
                        setPrescriptions(updated);
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      aria-label={`${field} for prescription ${i + 1}`}
                    />
                  ))}
                </div>
              ))}
              <button type="button" onClick={addPrescriptionRow} className="text-sm text-brand-600 hover:underline">
                + Add medication
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Notes & Generate Patient Summary'}
            </button>
          </form>
        </section>
      )}

      {/* Existing visit note */}
      {appt.visitNote && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Visit Notes</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-slate-600 mb-1">Clinical notes:</p>
              <p className="text-slate-700">{appt.visitNote.doctorNotes}</p>
            </div>
            {appt.visitNote.aiPatientSummary && (
              <div>
                <p className="font-medium text-slate-600 mb-1">AI patient summary:</p>
                <div className="bg-slate-50 rounded-lg p-3 text-slate-700">
                  {(() => {
                    try {
                      const p = JSON.parse(appt.visitNote.aiPatientSummary);
                      return <p>{p.summary}</p>;
                    } catch { return <p>{appt.visitNote.aiPatientSummary}</p>; }
                  })()}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
