import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { format } from 'date-fns';

const ACTION_LABELS: Record<string, string> = {
  doctor_created: 'Doctor Created',
  leave_added: 'Leave Added',
  leave_removed: 'Leave Removed',
  appointment_cancelled: 'Appointment Cancelled',
  appointment_rescheduled: 'Appointment Rescheduled',
  doctor_profile_updated: 'Profile Updated',
  user_role_changed: 'Role Changed',
};

export default function AuditLog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => adminApi.getAuditLogs().then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 mt-1">Admin action history</p>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-slate-400">No audit entries yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Time</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Admin</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Action</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{log.admin?.name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{log.targetId?.slice(0, 8) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
