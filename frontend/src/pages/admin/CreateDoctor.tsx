import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../api/endpoints';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = [
  'Cardiology', 'General Practice', 'Neurology', 'Orthopedics', 'Pediatrics',
  'Dermatology', 'Psychiatry', 'Gynecology', 'Oncology', 'Radiology', 'Other',
];

export default function CreateDoctor() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    specialization: 'General Practice',
    bio: '',
    slotDurationMinutes: 30,
    timezone: 'America/New_York',
  });
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await usersApi.createDoctor(form);
      toast.success(`Dr. ${form.name} account created`);
      navigate('/admin/doctors');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to create doctor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => navigate(-1)} className="text-sm text-brand-600 hover:underline">← Back</button>
      <h1 className="text-2xl font-bold text-slate-900">Add New Doctor</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {[
          { id: 'name', label: 'Full name', type: 'text', placeholder: 'Dr. Jane Smith' },
          { id: 'email', label: 'Email', type: 'email', placeholder: 'dr.jane@clinic.com' },
          { id: 'password', label: 'Temporary password (min 8 chars)', type: 'password', placeholder: '••••••••' },
          { id: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+1-555-000-0000' },
          { id: 'bio', label: 'Bio (optional)', type: 'text', placeholder: 'Brief professional bio' },
        ].map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
            <input
              id={field.id}
              type={field.type}
              required={!['phone', 'bio'].includes(field.id)}
              value={form[field.id as keyof typeof form] as string}
              onChange={(e) => update(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ))}

        <div>
          <label htmlFor="specialization" className="block text-sm font-medium text-slate-700 mb-1">Specialization</label>
          <select
            id="specialization"
            value={form.specialization}
            onChange={(e) => update('specialization', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="slotDuration" className="block text-sm font-medium text-slate-700 mb-1">Slot duration (min)</label>
            <input
              id="slotDuration"
              type="number"
              min={10}
              max={120}
              step={5}
              value={form.slotDurationMinutes}
              onChange={(e) => update('slotDurationMinutes', parseInt(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
            <input
              id="timezone"
              type="text"
              value={form.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              placeholder="America/New_York"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating...' : 'Create Doctor Account'}
        </button>
      </form>
    </div>
  );
}
