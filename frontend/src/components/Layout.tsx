import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const navLinks = {
    patient: [
      { to: '/patient', label: 'Dashboard' },
      { to: '/patient/book', label: 'Book Appointment' },
      { to: '/patient/appointments', label: 'My Appointments' },
      { to: '/patient/timeline', label: 'Health Timeline' },
    ],
    doctor: [
      { to: '/doctor', label: 'Dashboard' },
      { to: '/doctor/appointments', label: 'Appointments' },
      { to: '/doctor/availability', label: 'Availability' },
      { to: '/doctor/leaves', label: 'Leave Days' },
    ],
    admin: [
      { to: '/admin', label: 'Dashboard' },
      { to: '/admin/doctors', label: 'Manage Doctors' },
      { to: '/admin/appointments', label: 'All Appointments' },
      { to: '/admin/notifications', label: 'Notifications' },
      { to: '/admin/audit', label: 'Audit Log' },
    ],
  };

  const links = user ? navLinks[user.role] ?? [] : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-brand-700">
              <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>HealthCare Clinic</span>
            </Link>

            {/* Nav */}
            {user && (
              <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
                {links.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* User menu */}
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <span className="text-sm text-slate-500 hidden sm:block">
                    {user.name} <span className="text-slate-400">({user.role})</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link to="/login" className="text-sm px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {children}
      </main>
    </div>
  );
}
