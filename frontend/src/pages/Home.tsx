import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SPECIALIZATIONS = [
  { name: 'Cardiology', icon: '🫀', desc: 'Heart health, prevention & intervention' },
  { name: 'General Practice', icon: '🩺', desc: 'Everyday health & chronic condition care' },
  { name: 'Neurology', icon: '🧠', desc: 'Brain, spine & nervous system disorders' },
  { name: 'Orthopedics', icon: '🦴', desc: 'Sports injuries, joints & bone health' },
  { name: 'Pediatrics', icon: '👶', desc: 'Child & adolescent health care' },
  { name: 'Dermatology', icon: '✨', desc: 'Skin, hair & nail conditions' },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Real-time slot booking',
    desc: 'See live availability and hold your slot in under a minute — no phone calls.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'AI triage summaries',
    desc: 'Describe your symptoms before the visit. Your doctor gets an AI-generated triage summary.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Medication reminders',
    desc: 'After your visit, get automatic email reminders for your prescribed medications.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Health timeline',
    desc: 'All your past visits, prescriptions, and summaries in one chronological view.',
  },
];

export default function Home() {
  const { user, isLoading } = useAuth();

  const ctaHref = isLoading ? '#' : user ? `/${user.role}` : '/register';
  const ctaLabel = user ? 'Go to dashboard' : 'Book your first appointment';

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-brand-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            HealthCare Clinic
          </Link>
          <nav className="flex items-center gap-3" aria-label="Site navigation">
            {user ? (
              <Link
                to={`/${user.role}`}
                className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" aria-hidden="true" />
          AI-powered appointments
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-5">
          Healthcare that works<br className="hidden sm:block" />
          <span className="text-brand-600"> around your schedule</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8">
          Book appointments with top specialists, get AI triage before your visit,
          and manage your complete health record — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={ctaHref}
            className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors text-sm"
            aria-label={ctaLabel}
          >
            {ctaLabel}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          {!user && (
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
            >
              Sign in to existing account
            </Link>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16" aria-labelledby="features-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 id="features-heading" className="text-2xl font-bold text-slate-900 text-center mb-10">
            Everything you need in one clinic platform
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">{f.title}</h3>
                <p className="text-slate-500 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6" aria-labelledby="specializations-heading">
        <div className="text-center mb-10">
          <h2 id="specializations-heading" className="text-2xl font-bold text-slate-900 mb-2">
            Find a specialist
          </h2>
          <p className="text-slate-500 text-sm">Our doctors cover a wide range of specializations</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {SPECIALIZATIONS.map((s) => (
            <Link
              key={s.name}
              to={user ? '/patient/book' : '/register'}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-400 hover:shadow-sm transition-all group"
              aria-label={`Book with ${s.name} specialist`}
            >
              <span className="text-2xl" aria-hidden="true">{s.icon}</span>
              <div>
                <p className="font-medium text-slate-900 text-sm group-hover:text-brand-700 transition-colors">{s.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            to={user ? '/patient/book' : '/register'}
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            Browse all doctors →
          </Link>
        </div>
      </section>

      {/* CTA banner */}
      {!user && (
        <section className="bg-brand-600 py-14" aria-labelledby="cta-heading">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 id="cta-heading" className="text-2xl font-bold text-white mb-3">
              Ready to take control of your health?
            </h2>
            <p className="text-brand-100 mb-6 text-sm">
              Create a free patient account in under a minute. No credit card required.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-6 py-3 rounded-xl hover:bg-brand-50 transition-colors text-sm"
            >
              Create free account
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-400">
          <p>© 2026 HealthCare Clinic. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-slate-600 transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-slate-600 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
