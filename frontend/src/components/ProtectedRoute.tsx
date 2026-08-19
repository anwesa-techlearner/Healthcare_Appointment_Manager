import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Array<'patient' | 'doctor' | 'admin'>;
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600" aria-hidden="true" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Redirect to the correct dashboard for this role
    const dashboardMap = { patient: '/patient', doctor: '/doctor', admin: '/admin' };
    return <Navigate to={dashboardMap[user.role] ?? '/'} replace />;
  }

  return <>{children}</>;
}
