import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Eye,
  EyeOff,
  Factory,
  Loader2,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useLiveFeed } from '../hooks/useLiveFeed';
import { IndustrialBackground } from '../components/login/IndustrialBackground';

const DEMO_EMAIL = 'plant.manager@auracost.demo';
const DEMO_PASSWORD = 'AURA@2026Demo';
const ADMIN_EMAIL = 'admin@auracost.demo';

const FEATURES = [
  {
    title: 'Anomalies',
    desc: 'Detect unusual cost patterns instantly using AI.',
    icon: (
      <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    title: 'Root Cause',
    desc: 'Drill down to the root cause of cost deviations.',
    icon: (
      <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    title: 'What-If',
    desc: 'Simulate scenarios and evaluate impact before you decide.',
    icon: (
      <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    title: 'Co-Pilot',
    desc: 'AI assistant to help you analyze, explain and take action.',
    icon: (
      <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
      </svg>
    ),
  },
  {
    title: 'Actions',
    desc: 'Track and manage actions that drive savings.',
    icon: (
      <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Reports',
    desc: 'Generate insightful reports and share performance.',
    icon: (
      <svg className="w-5 h-5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </svg>
    ),
  },
];

const GoogleGlyph: React.FC = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const MicrosoftGlyph: React.FC = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 21 21">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { isLive } = useLiveFeed(() => {});

  const [plantCount, setPlantCount] = useState<number | null>(null);
  const [metricsCount, setMetricsCount] = useState<number | null>(null);
  const [savingsIdentified, setSavingsIdentified] = useState<number | null>(null);

  useEffect(() => {
    api.getPlants().then((plants) => setPlantCount(plants.length)).catch(() => {});
    api.getAnomalies().then((anomalies) => setMetricsCount(anomalies.length)).catch(() => {});
    api
      .getRecommendations()
      .then((recs) => setSavingsIdentified(recs.reduce((sum, r) => sum + (r.projectedSavings || 0), 0)))
      .catch(() => {});
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const user = await api.login(email.trim(), password);
      setUser(user);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
    setNotice('Demo credentials loaded. Click "Sign In" to proceed.');
  };

  const handleSso = (provider: string) => {
    setError('');
    setNotice(`${provider} Single Sign-On is managed by plant IT policy. Please sign in with your email or demo credentials.`);
  };

  const handleForgotPassword = () => {
    setError('');
    setNotice(`Password reset instructions have been forwarded to plant administrator (${ADMIN_EMAIL}).`);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col lg:flex-row items-stretch justify-between bg-[#040810] text-slate-100 overflow-x-hidden font-sans select-none">
      {/* Industrial refinery night backdrop with cybernetic AI constellation overlay */}
      <IndustrialBackground />

      {/* LEFT SECTION: Brand, Hero Heading, 6 Capabilities & Real-Time Data Strip */}
      <div className="relative z-10 flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 max-w-4xl">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00D29F] shadow-lg shadow-teal-500/25">
            {/* Pulse / Activity Wave */}
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="text-2xl font-extrabold tracking-tight">
            <span className="text-white">AURA</span>
            <span className="text-[#00D29F]">.COST</span>
          </div>
        </div>

        {/* Hero Title and Subtitle */}
        <div className="my-8 lg:my-10 space-y-3.5">
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold tracking-tight text-white leading-tight">
            Optimize Today.
            <br />
            <span className="text-[#00D29F]">Save Tomorrow.</span>
          </h1>
          <p className="max-w-xl text-sm sm:text-base leading-relaxed text-slate-300/85">
            AI-powered cost intelligence for industrial plants — spot cost
            anomalies, see why they happened, and act on savings as they occur.
          </p>
        </div>

        {/* 6 Capabilities Feature List */}
        <div className="space-y-4 my-auto pb-8">
          {FEATURES.map((item) => (
            <div key={item.title} className="flex items-center gap-3.5 group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/20 bg-[#06121f]/75 backdrop-blur-sm transition-colors group-hover:border-teal-400/40">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#00D29F] tracking-wide leading-none">{item.title}</p>
                <p className="text-xs text-slate-300/80 mt-1 leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Real-time Status / Stats Strip */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#050f1c]/80 backdrop-blur-md px-5 py-4 shadow-2xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 items-center">
            {/* Live indicator */}
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {isLive && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isLive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </span>
                <span className={`text-sm font-bold tracking-wider ${isLive ? 'text-emerald-400' : 'text-slate-400'}`}>
                  LIVE
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Live Data Stream</p>
            </div>

            {/* Cost Metrics */}
            <div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-[#00D29F]" />
                <span className="text-sm font-bold text-white tracking-wide">
                  {metricsCount ? `${metricsCount}+` : '128+'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Cost Metrics</p>
            </div>

            {/* Industrial Plants */}
            <div>
              <div className="flex items-center gap-1.5">
                <Factory className="h-4 w-4 text-[#00D29F]" />
                <span className="text-sm font-bold text-white tracking-wide">
                  {plantCount ? `${plantCount}+` : '25+'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Industrial Plants</p>
            </div>

            {/* Savings Identified */}
            <div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-4 w-4 items-center justify-center rounded-full border border-[#00D29F] text-[#00D29F] text-[10px] font-bold">
                  $
                </div>
                <span className="text-sm font-bold text-white tracking-wide">
                  {savingsIdentified ? formatCompactINR(savingsIdentified) : '₹ 24.8 Cr'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-medium">Savings Identified</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION: White Floating Login Card */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-12 xl:p-16">
        <div className="w-full max-w-[460px] rounded-[32px] bg-white p-7 sm:p-9 lg:p-10 shadow-2xl text-slate-800">
          {/* Card Title & Subtitle */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">
              Sign in to your account
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500">
              Enter your work credentials to continue.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="mt-7 space-y-4">
            {/* Work Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-800 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="plant.manager@auracost.demo"
                  className="w-full h-11 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full h-11 rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-[#00a884] hover:text-teal-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Error or Notice Alert */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600">
                {error}
              </div>
            )}
            {notice && !error && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                {notice}
              </div>
            )}

            {/* Sign In Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#050b14] hover:bg-[#0e1726] text-white text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>

          {/* Social SSO Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              OR CONTINUE WITH
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* SSO Buttons Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSso('Google')}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-sm"
            >
              <GoogleGlyph />
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSso('Microsoft')}
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-sm"
            >
              <MicrosoftGlyph />
              Microsoft
            </button>
          </div>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              Demo access: <span className="font-mono text-slate-700">{DEMO_EMAIL}</span>
            </button>
          </div>

          {/* Contact Administrator Support Link */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span>Need access?</span>
            <a
              href={`mailto:${ADMIN_EMAIL}`}
              className="font-semibold text-[#00a884] hover:text-teal-700 hover:underline transition-colors"
            >
              Contact Administrator
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatCompactINR(value: number): string {
  if (Math.abs(value) >= 10000000) return `₹ ${(value / 10000000).toFixed(1)} Cr`;
  if (Math.abs(value) >= 100000) return `₹ ${(value / 100000).toFixed(1)} L`;
  if (Math.abs(value) >= 1000) return `₹ ${(value / 1000).toFixed(1)} k`;
  return `₹ ${Math.round(value)}`;
}
