import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { doctorsApi } from '../../api/endpoints';
import toast from 'react-hot-toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export default function DoctorAvailability() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const doctorId = user?.doctorProfile?.id;
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['doctor-profile', doctorId],
    queryFn: () => doctorsApi.getById(doctorId!).then((r) => r.data),
    enabled: !!doctorId,
  });

  const existingSlots: AvailabilitySlot[] = profile?.availability ?? [];
  const [slots, setSlots] = useState<AvailabilitySlot[]>(() =>
    existingSlots.length > 0 ? existingSlots : [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]
  );

  function addSlot() {
    setSlots((prev) => [...prev, { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }]);
  }

  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSlot(i: number, field: keyof AvailabilitySlot, value: string | number) {
    setSlots((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await doctorsApi.setAvailability(doctorId!, slots);
      toast.success('Availability saved');
      queryClient.invalidateQueries({ queryKey: ['doctor-profile', doctorId] });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Working Hours</h1>
      <p className="text-slate-500 text-sm">Set the days and hours when patients can book appointments with you.</p>

      <div className="space-y-3">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-3 flex-wrap bg-white rounded-xl border border-slate-200 p-4">
            <select
              value={slot.dayOfWeek}
              onChange={(e) => updateSlot(i, 'dayOfWeek', parseInt(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`Day of week for slot ${i + 1}`}
            >
              {DAYS.map((day, idx) => (
                <option key={idx} value={idx}>{day}</option>
              ))}
            </select>
            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(i, 'startTime', e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`Start time for slot ${i + 1}`}
            />
            <span className="text-slate-400">to</span>
            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(i, 'endTime', e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              aria-label={`End time for slot ${i + 1}`}
            />
            <button
              onClick={() => removeSlot(i)}
              className="text-red-400 hover:text-red-600 text-sm"
              aria-label={`Remove slot ${i + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={addSlot} className="text-sm text-brand-600 hover:underline">+ Add day</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  );
}
