import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { doctorsApi } from '../../api/endpoints';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DoctorLeaves() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const doctorId = user?.doctorProfile?.id;
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['doctor-leaves', doctorId],
    queryFn: () => doctorsApi.getLeaves(doctorId!).then((r) => r.data),
    enabled: !!doctorId,
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!date) { toast.error('Please select a date'); return; }
    setAdding(true);
    try {
      const result = await doctorsApi.addLeave(doctorId!, date, reason);
      toast.success(`Leave added. ${result.data.cancelledAppointments} appointment(s) cancelled.`);
      setDate('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['doctor-leaves', doctorId] });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to add leave');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(leaveId: string) {
    if (!confirm('Remove this leave day?')) return;
    try {
      await doctorsApi.removeLeave(doctorId!, leaveId);
      toast.success('Leave removed');
      queryClient.invalidateQueries({ queryKey: ['doctor-leaves', doctorId] });
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to remove');
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Leave Days</h1>
      <p className="text-slate-500 text-sm">
        Adding a leave day will automatically cancel any confirmed appointments and notify affected patients.
      </p>

      {/* Add leave form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Add Leave Day</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="leave-date" className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              id="leave-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="leave-reason" className="block text-sm font-medium text-slate-700 mb-1">Reason (optional)</label>
            <input
              id="leave-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Conference, vacation"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="bg-brand-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {adding ? 'Adding...' : 'Add Leave Day'}
        </button>
      </form>

      {/* Existing leaves */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Scheduled Leaves</h2>
        {isLoading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : leaves.length === 0 ? (
          <p className="text-slate-400 text-sm">No leave days scheduled.</p>
        ) : (
          <div className="space-y-2">
            {leaves.map((leave: any) => (
              <div key={leave.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
                <div>
                  <p className="font-medium text-slate-900">{format(new Date(leave.date), 'EEEE, MMMM d, yyyy')}</p>
                  {leave.reason && <p className="text-sm text-slate-500">{leave.reason}</p>}
                </div>
                <button
                  onClick={() => handleRemove(leave.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                  aria-label={`Remove leave on ${format(new Date(leave.date), 'MMM d')}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
