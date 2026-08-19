import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/endpoints';
import { format } from 'date-fns';

export default function FailedNotifications() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['failed-notifications'],
    queryFn: () => notificationsApi.getFailedNotifications().then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Failed Notifications</h1>
        <p className="text-slate-500 mt-1">Email and calendar notifications that failed after {3} retry attempts</p>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <p className="text-green-700 font-medium">All notifications delivered ✓</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Channel</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Type</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Attempts</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Error</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Date</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n: any) => (
                <tr key={n.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{n.appointment?.patient?.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{n.channel}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{n.type}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{n.attempts}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-xs truncate">{n.lastError ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {format(new Date(n.updatedAt), 'MMM d, h:mm a')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
