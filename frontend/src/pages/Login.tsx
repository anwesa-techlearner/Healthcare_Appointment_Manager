import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

const DASHBOARD: Record<string, string> = {
  patient: '/patient',
  doctor: '/doctor',
  admin: '/admin',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // login() sets the user in context AND stores tokens in localStorage
      const role = await login(email, password);
      toast.success('Welcome back!');
      navigate(DASHBOARD[role] ?? '/', { replace: true });
    } catch (err) {
      const msg = (err as AxiosError<{ error?: string }>).response?.data?.error ?? 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">HealthCare Clinic</h1>
          <p className="mt-2 text-slate-500">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-5"
          aria-label="Login form"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-slate-500">
            New patient?{' '}
            <Link to="/register" className="text-brand-600 hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </form>

        {/* Demo credentials */}
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
          <p className="font-medium text-amber-800 mb-1">Demo accounts</p>
          <ul className="text-amber-700 space-y-0.5">
            <li>Admin: <code>admin@clinic.com</code></li>
            <li>Doctor: <code>dr.sarah.chen@clinic.com</code></li>
            <li>Patient: <code>alice.johnson@email.com</code></li>
            <li>Password: <code>Demo@1234</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
