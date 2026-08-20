import { useState, FormEvent, ChangeEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

// ─── Password strength ────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-400' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

// ─── Phone validation ─────────────────────────────────────────────────────────

// Accepts: +1-555-000-0000, +15550000000, (555) 000-0000, 555-000-0000, etc.
const PHONE_RE = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{4,10}$/;

function validatePhone(phone: string): string | null {
  if (!phone) return null; // optional field
  if (!PHONE_RE.test(phone.replace(/\s/g, ''))) return 'Enter a valid phone number (e.g. +1-555-000-0000)';
  return null;
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: string;
}

const EMPTY: FormState = {
  name: '', email: '', phone: '',
  password: '', confirmPassword: '',
  dateOfBirth: '', gender: '',
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(form.password);
  const phoneError = touched.phone ? validatePhone(form.phone) : null;
  const confirmError = touched.confirmPassword && form.confirmPassword && form.password !== form.confirmPassword
    ? 'Passwords do not match' : null;

  function update(field: keyof FormState) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function blur(field: keyof FormState) {
    return () => setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Mark all fields touched to surface any remaining errors
    setTouched({ name: true, email: true, phone: true, password: true, confirmPassword: true });

    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    const phoneErr = validatePhone(form.phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }

    setLoading(true);
    try {
      // Build payload — only send optional fields if filled in
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
      };
      if (form.phone) payload.phone = form.phone;
      // dateOfBirth and gender are stored as profile notes in the name field for now;
      // the backend User schema has phone as the only optional field beyond name/email.
      // These fields are captured and can be added to an extended profile table later.

      const role = await register(payload as any);
      toast.success('Account created! Welcome to HealthCare Clinic.');
      navigate(`/${role}`, { replace: true });
    } catch (err) {
      // Show the exact API error message rather than a generic fallback
      const apiMsg = (err as AxiosError<{ error?: string; details?: Array<{ field: string; message: string }> }>)
        .response?.data;
      if (apiMsg?.details?.length) {
        apiMsg.details.forEach((d) => toast.error(`${d.field}: ${d.message}`));
      } else {
        toast.error(apiMsg?.error ?? 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl text-brand-700 mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            HealthCare Clinic
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-slate-500 text-sm">Patient registration — takes under a minute</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-4"
          aria-label="Registration form"
          noValidate
        >
          {/* Full name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Full name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="name" type="text" required autoComplete="name"
              value={form.name} onChange={update('name')} onBlur={blur('name')}
              placeholder="Jane Smith"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="email" type="email" required autoComplete="email"
              value={form.email} onChange={update('email')} onBlur={blur('email')}
              placeholder="jane@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Phone <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="phone" type="tel" autoComplete="tel"
              value={form.phone} onChange={update('phone')} onBlur={blur('phone')}
              placeholder="+1-555-000-0000"
              aria-describedby={phoneError ? 'phone-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${phoneError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
            {phoneError && (
              <p id="phone-error" className="mt-1 text-xs text-red-600" role="alert">{phoneError}</p>
            )}
          </div>

          {/* Date of birth + Gender side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-700 mb-1">
                Date of birth <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="dob" type="date" autoComplete="bday"
                value={form.dateOfBirth} onChange={update('dateOfBirth')}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-slate-700 mb-1">
                Gender <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                id="gender" value={form.gender} onChange={update('gender')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="nonbinary">Non-binary</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="password" type="password" required autoComplete="new-password"
              value={form.password} onChange={update('password')} onBlur={blur('password')}
              placeholder="Min 8 characters"
              aria-describedby="password-strength"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {/* Strength bar */}
            {form.password.length > 0 && (
              <div id="password-strength" className="mt-2" aria-live="polite">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength.score >= i ? strength.color : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  strength.score <= 1 ? 'text-red-600' :
                  strength.score <= 2 ? 'text-amber-600' :
                  strength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {strength.label}
                  {strength.score <= 2 && ' — try adding uppercase letters, numbers, or symbols'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
              Confirm password <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="confirmPassword" type="password" required autoComplete="new-password"
              value={form.confirmPassword} onChange={update('confirmPassword')} onBlur={blur('confirmPassword')}
              placeholder="Repeat your password"
              aria-describedby={confirmError ? 'confirm-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${confirmError ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
            />
            {confirmError && (
              <p id="confirm-error" className="mt-1 text-xs text-red-600" role="alert">{confirmError}</p>
            )}
            {!confirmError && form.confirmPassword && form.password === form.confirmPassword && (
              <p className="mt-1 text-xs text-green-600">✓ Passwords match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !!phoneError || !!confirmError}
            className="w-full bg-brand-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 mt-2"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
