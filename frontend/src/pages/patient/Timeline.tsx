import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { usersApi } from '../../api/endpoints';
import { UrgencyBadge } from '../../components/UrgencyBadge';
import { format } from 'date-fns';

export default function PatientTimeline() {
  const { user } = useAuth();

  const { data: timeline = [], isLoading } = useQuery({
    queryKey: ['patient-timeline', user?.id],
    queryFn: () => usersApi.getTimeline(user!.id).then((r) => r.data),
    enabled: !!user?.id,
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Health Timeline</h1>
        <p className="text-slate-500 mt-1">Your complete visit history, summaries, and prescriptions</p>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : timeline.length === 0 ? (
        <p className="text-slate-500">No completed visits yet.</p>
      ) : (
        <ol className="relative border-l-2 border-slate-200 space-y-8 ml-3" aria-label="Health timeline">
          {timeline.map((appt: any) => (
            <li key={appt.id} className="ml-6">
              <span className="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold" aria-hidden="true">
                {format(new Date(appt.slotStart), 'd')}
              </span>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">Dr. {appt.doctorProfile?.user?.name}</p>
                    <p className="text-sm text-brand-600">{appt.doctorProfile?.specialization}</p>
                    <time className="text-sm text-slate-500" dateTime={appt.slotStart}>
                      {format(new Date(appt.slotStart), 'MMMM d, yyyy')}
                    </time>
                  </div>
                  {appt.symptoms?.[0] && (
                    <UrgencyBadge level={appt.symptoms[0].urgencyLevel} />
                  )}
                </div>

                {appt.symptoms?.[0]?.rawText && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reported Symptoms</p>
                    <p className="text-sm text-slate-700">{appt.symptoms[0].rawText}</p>
                  </div>
                )}

                {appt.visitNote && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Visit Summary</p>
                    {(() => {
                      try {
                        const parsed = JSON.parse(appt.visitNote.aiPatientSummary ?? '{}');
                        return (
                          <div className="text-sm text-slate-700 space-y-2">
                            <p>{parsed.summary ?? appt.visitNote.aiPatientSummary}</p>
                            {parsed.medication_schedule?.length > 0 && (
                              <div>
                                <p className="font-medium text-slate-600 mt-2">Medications:</p>
                                <ul className="space-y-1">
                                  {parsed.medication_schedule.map((med: any, i: number) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="text-brand-600">•</span>
                                      <span>{med.medication} — {med.frequency}{med.duration ? ` for ${med.duration}` : ''}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      } catch {
                        return <p className="text-sm text-slate-700">{appt.visitNote.aiPatientSummary}</p>;
                      }
                    })()}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
