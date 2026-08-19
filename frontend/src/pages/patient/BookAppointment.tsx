import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { doctorsApi, appointmentsApi, symptomsApi } from '../../api/endpoints';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

type Step = 'search' | 'slots' | 'symptoms' | 'confirm';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [symptoms, setSymptoms] = useState('');
  const [heldAppointment, setHeldAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const idempotencyKey = useRef(uuidv4());

  // WebSocket for real-time slot updates (SPEC §8.1)
  const wsRef = useRef<WebSocket | null>(null);
  const [liveUnavailable, setLiveUnavailable] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (step === 'slots' && selectedDoctor) {
      const wsUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000')
        .replace('http', 'ws') + '/ws';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'subscribe_slots', doctorId: selectedDoctor.id }));
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'slot_update' && msg.slotStart) {
          setLiveUnavailable((prev) => {
            const next = new Set(prev);
            if (!msg.available) next.add(msg.slotStart);
            else next.delete(msg.slotStart);
            return next;
          });
        }
      };
      return () => ws.close();
    }
  }, [step, selectedDoctor]);

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', searchQuery, specialization],
    queryFn: () => doctorsApi.search({ q: searchQuery || undefined, specialization: specialization || undefined }).then((r) => r.data),
    enabled: step === 'search',
  });

  const { data: slots = [], refetch: refetchSlots } = useQuery({
    queryKey: ['slots', selectedDoctor?.id, selectedDate],
    queryFn: () => doctorsApi.getSlots(selectedDoctor.id, selectedDate).then((r) => r.data),
    enabled: !!selectedDoctor && step === 'slots',
  });

  async function handleHoldSlot() {
    if (!selectedSlot) return;
    setLoading(true);
    try {
      // Generate fresh idempotency key for each new booking attempt
      idempotencyKey.current = uuidv4();
      const res = await appointmentsApi.hold(selectedDoctor.id, selectedSlot.start, idempotencyKey.current);
      setHeldAppointment(res.data);
      setStep('symptoms');
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to hold slot';
      toast.error(msg);
      refetchSlots();
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!heldAppointment) return;
    setLoading(true);
    try {
      if (symptoms.trim().length >= 10) {
        await symptomsApi.submit(heldAppointment.id, symptoms);
      }
      await appointmentsApi.confirm(heldAppointment.id);
      toast.success('Appointment confirmed! Check your email for details.');
      navigate('/patient/appointments');
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to confirm appointment';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const specializations = ['Cardiology', 'General Practice', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Psychiatry'];
  const availableSlots = slots.filter((s: any) => s.available && !liveUnavailable.has(s.start));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Book an Appointment</h1>

      {/* Step indicator */}
      <nav aria-label="Booking steps">
        <ol className="flex items-center gap-2 text-sm">
          {(['search', 'slots', 'symptoms', 'confirm'] as Step[]).map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  s === step ? 'bg-brand-600 text-white' :
                  ['search', 'slots', 'symptoms', 'confirm'].indexOf(step) > i
                    ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}
                aria-current={s === step ? 'step' : undefined}
              >
                {i + 1}
              </span>
              <span className={s === step ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                {s === 'search' ? 'Find Doctor' : s === 'slots' ? 'Pick Slot' : s === 'symptoms' ? 'Symptoms' : 'Confirm'}
              </span>
              {i < 3 && <span className="text-slate-300" aria-hidden="true">→</span>}
            </li>
          ))}
        </ol>
      </nav>

      {/* Step: Search Doctors */}
      {step === 'search' && (
        <section>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor name..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Search doctors by name"
            />
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label="Filter by specialization"
            >
              <option value="">All specializations</option>
              {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {doctorsLoading ? (
            <p className="text-slate-500 text-sm">Searching...</p>
          ) : (
            <div className="space-y-3">
              {doctors.map((doc: any) => (
                <button
                  key={doc.id}
                  onClick={() => { setSelectedDoctor(doc); setStep('slots'); }}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-400 hover:shadow-sm transition-all"
                  aria-label={`Select ${doc.user.name}, ${doc.specialization}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{doc.user.name}</p>
                      <p className="text-sm text-brand-600 font-medium">{doc.specialization}</p>
                      {doc.bio && <p className="text-sm text-slate-500 mt-1">{doc.bio}</p>}
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{doc.slotDurationMinutes} min slots</span>
                  </div>
                </button>
              ))}
              {doctors.length === 0 && <p className="text-slate-500 text-sm">No doctors found. Try adjusting your search.</p>}
            </div>
          )}
        </section>
      )}

      {/* Step: Pick Slot */}
      {step === 'slots' && selectedDoctor && (
        <section>
          <button onClick={() => setStep('search')} className="text-sm text-brand-600 hover:underline mb-4 block">
            ← Back to search
          </button>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{selectedDoctor.user.name}</h2>
          <p className="text-sm text-slate-500 mb-4">{selectedDoctor.specialization}</p>

          <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">Select date</label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
          />

          {/* Real-time notice */}
          <p className="text-xs text-slate-400 mb-3" aria-live="polite">
            🔴 Slots update in real-time as others book
          </p>

          {availableSlots.length === 0 ? (
            <p className="text-slate-500 text-sm">No available slots on this date. Try another day.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="listbox" aria-label="Available time slots">
              {availableSlots.map((slot: any) => (
                <button
                  key={slot.start}
                  role="option"
                  aria-selected={selectedSlot?.start === slot.start}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedSlot?.start === slot.start
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                  }`}
                >
                  {format(new Date(slot.start), 'h:mm a')}
                </button>
              ))}
            </div>
          )}

          {selectedSlot && (
            <button
              onClick={handleHoldSlot}
              disabled={loading}
              className="mt-4 bg-brand-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Holding slot...' : `Hold ${format(new Date(selectedSlot.start), 'h:mm a')} slot`}
            </button>
          )}
        </section>
      )}

      {/* Step: Symptoms */}
      {step === 'symptoms' && heldAppointment && (
        <section>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800 font-medium">
              ⏱ Slot held for 5 minutes — please complete your booking before it expires
            </p>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Describe your symptoms</h2>
          <p className="text-sm text-slate-500 mb-3">
            This helps your doctor prepare. Your symptoms will be analyzed to provide a triage summary.
          </p>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            rows={4}
            placeholder="Describe your symptoms, how long you've had them, and any relevant medical history..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            aria-label="Describe your symptoms"
          />
          <p className="text-xs text-slate-400 mt-1">Optional but recommended. Min 10 characters to submit.</p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-brand-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Confirming...' : 'Confirm Appointment'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5"
            >
              Skip symptoms
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
