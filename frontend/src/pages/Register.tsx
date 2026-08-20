import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const role = await register(form);
      toast.success('Account created!');
      navigate(`/${role}`, { replace: true });
    } catch (err) {
      const msg = (err as AxiosError<{ error?: string }>).response?.data?.error ?? 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Create Account</h1>
          <p className="mt-2 text-slate-500">Join HealthCare Clinic as a patient</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-5"
          aria-label="Registration form"
        >
          {[
            { id: 'name', label: 'Full name', type: 'text', placeholder: 'Jane Smith', autocomplete: 'name' },
            { id: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com', autocomplete: 'email' },
            { id: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+1-555-000-0000', autocomplete: 'tel' },
            { id: 'password', label: 'Password (min 8 chars)', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
          ].map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="block text-sm font-medium text-slate-700 mb-1">
                {field.label}
              </label>
              <input
                id={field.id}
                type={field.type}
                autoComplete={field.autocomplete}
                required={field.id !== 'phone'}
                value={form[field.id as keyof typeof form]}
                onChange={update(field.id)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
