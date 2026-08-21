import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usersApi } from '../../api/endpoints';

export default function AdminDoctorsList() {
  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: () => usersApi.listUsers('doctor').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctors</h1>
          <p className="text-slate-500 mt-1">{doctors.length} doctor{doctors.length !== 1 ? 's' : ''} registered</p>
        </div>
        <Link
          to="/admin/doctors/new"
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          + Add Doctor
        </Link>
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading...</p>
      ) : doctors.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="text-slate-500 mb-3">No doctors yet.</p>
          <Link to="/admin/doctors/new" className="text-brand-600 hover:underline text-sm font-medium">
            Create the first doctor account →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Specialization</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Slot</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600" scope="col">Timezone</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc: any) => (
                <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{doc.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {doc.doctorProfile?.specialization ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{doc.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {doc.doctorProfile?.slotDurationMinutes ? `${doc.doctorProfile.slotDurationMinutes} min` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {doc.doctorProfile?.timezone ?? '—'}
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
