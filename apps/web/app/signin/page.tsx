'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiEye,
  FiEyeOff,
  FiAlertCircle,
  FiCheck,
  FiMail,
  FiLock,
  FiArrowRight,
  FiKey,
} from 'react-icons/fi';
import { apiFetch, type ApiError } from '../../lib/api/client';

export default function SignInPage() {
  const [roleType, setRoleType] = useState<'CITIZEN' | 'OFFICIAL'>('CITIZEN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Email and password are required');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch<any>(mfaChallenge ? '/auth/mfa/verify' : '/auth/login', {
        method: 'POST',
        body: JSON.stringify(
          mfaChallenge
            ? { challengeToken: mfaChallenge, code: mfaCode }
            : { email, password }
        ),
      });
      const loggedInUser = res?.user || res?.data?.user;
      if (typeof window !== 'undefined' && loggedInUser) {
        localStorage.setItem('civique_user', JSON.stringify(loggedInUser));
      }
      setSuccessMsg('Authentication confirmed. Entering Civique...');
      const targetRoute =
        loggedInUser?.role && loggedInUser.role !== 'CITIZEN' ? '/admin' : '/';
      setTimeout(() => router.push(targetRoute), 350);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.code === 'MFA_REQUIRED' && apiError.challengeToken) {
        setMfaChallenge(apiError.challengeToken);
        setErrorMsg('Enter the six-digit code from your authenticator app to continue.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Invalid credentials or server unavailable');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (roleEmail: string, role: 'CITIZEN' | 'OFFICIAL' = 'CITIZEN') => {
    setEmail(roleEmail);
    setPassword('CiviqueDemo2026!');
    setRoleType(role);
    setErrorMsg('');
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#192b21] font-sans antialiased overflow-hidden select-none">
      
      {/* ================= LEFT SECTION: SIGN IN STATION ================= */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 h-full px-6 sm:px-10 lg:px-12 xl:px-16 py-4 sm:py-5 overflow-y-auto lg:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Top-Left: Techno-Styled Civique Logo Only */}
        <div className="flex items-center shrink-0">
          <Link href="/" className="inline-flex items-center select-none group cursor-pointer" title="Civique Platform">
            <span
              style={{
                fontFamily: 'var(--font-orbitron), sans-serif',
                letterSpacing: '0.07em',
              }}
              className="text-2xl sm:text-[1.8rem] font-black tracking-wide text-[#143527] group-hover:text-black transition-colors"
            >
              Civique
            </span>
          </Link>
        </div>

        {/* Center: Sign In Form Box */}
        <div className="mx-auto w-full max-w-[380px] my-auto py-2">
          
          {/* Header Typography */}
          <div className="text-center space-y-1 mb-4">
            <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight text-[#192b21]">
              Sign In
            </h1>
            <p className="text-xs text-[#667a6e] font-medium">
              Welcome back! Please enter your details to continue
            </p>
          </div>

          {/* Role Radio Switcher */}
          <div className="flex items-center justify-center gap-6 mb-4 text-xs sm:text-sm font-semibold text-[#192b21]">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="roleSelector"
                checked={roleType === 'CITIZEN'}
                onChange={() => setRoleType('CITIZEN')}
                className="size-4 accent-[#143527] cursor-pointer"
              />
              <span>As a Citizen</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="radio"
                name="roleSelector"
                checked={roleType === 'OFFICIAL'}
                onChange={() => setRoleType('OFFICIAL')}
                className="size-4 accent-[#143527] cursor-pointer"
              />
              <span>As an Official</span>
            </label>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 animate-in fade-in">
                <FiAlertCircle className="size-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
                <FiCheck className="size-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Email Input Field */}
            {!mfaChallenge ? (
              <div className="space-y-1 text-left">
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-bold text-[#192b21]"
                >
                  Email <span className="text-[#143527]">*</span>
                </label>
                <div className="flex h-11 w-full items-center gap-3 rounded-full border border-[#dce2d6] bg-white px-4 shadow-2xs transition-all focus-within:border-[#143527] focus-within:ring-2 focus-within:ring-[#143527]/20">
                  <FiMail className="size-4 text-[#8a9b8e] shrink-0" />
                  <input
                    id="signin-email"
                    type="email"
                    required
                    placeholder="citizen@civique.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#192b21] placeholder:text-[#9ca8a0] focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 leading-relaxed text-left">
                <strong className="font-bold">Official Account Multi-Factor Challenge</strong>
                <p className="mt-0.5 text-slate-600">
                  Enter the six-digit TOTP code generated by your municipal authenticator app.
                </p>
              </div>
            )}

            {/* Password Input Field */}
            {!mfaChallenge ? (
              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-bold text-[#192b21]"
                  >
                    Password <span className="text-[#143527]">*</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-[#143527] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="flex h-11 w-full items-center gap-3 rounded-full border border-[#dce2d6] bg-white px-4 shadow-2xs transition-all focus-within:border-[#143527] focus-within:ring-2 focus-within:ring-[#143527]/20">
                  <FiLock className="size-4 text-[#8a9b8e] shrink-0" />
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#192b21] placeholder:text-[#9ca8a0] focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#8a9b8e] hover:text-[#192b21] transition-colors cursor-pointer"
                  >
                    {showPassword ? <FiEyeOff className="size-4" /> : <FiEye className="size-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-left">
                <label
                  htmlFor="signin-mfa"
                  className="block text-xs font-bold text-[#192b21]"
                >
                  6-Digit Authenticator Code
                </label>
                <div className="flex h-11 w-full items-center gap-3 rounded-full border border-[#dce2d6] bg-white px-4 shadow-2xs focus-within:border-[#143527] focus-within:ring-2 focus-within:ring-[#143527]/20">
                  <FiKey className="size-4 text-[#8a9b8e] shrink-0" />
                  <input
                    id="signin-mfa"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-transparent text-center font-mono text-base tracking-[0.35em] font-bold text-[#192b21] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Main Submit Button (Dark Forest Green Pill) */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 flex h-10 sm:h-11 w-full items-center justify-center gap-2 rounded-full bg-[#143527] hover:bg-[#143527] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mfaChallenge ? 'Verify & Sign In' : 'Sign In'}</span>
                  <FiArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Centered OR Divider */}
          <div className="relative my-3 flex items-center justify-center">
            <div className="w-full border-t border-[#e2e7dc]" />
            <span className="absolute bg-white px-3 text-[10px] font-bold text-[#8d9e92] uppercase tracking-wider">
              OR
            </span>
          </div>

          {/* Sign In with Google Pill (Placed After Form Fields) */}
          <button
            type="button"
            onClick={() =>
              handleQuickFill(
                roleType === 'CITIZEN'
                  ? 'demo.citizen@civique.local'
                  : 'demo.wardofficer@civique.local',
                roleType
              )
            }
            className="w-full h-10 sm:h-11 rounded-full bg-white border border-[#dce2d6] hover:border-[#cbd5c4] hover:bg-[#fafbf8] shadow-2xs flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold text-[#192b21] transition-all cursor-pointer"
          >
            {/* Google Multicolor SVG */}
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>

          {/* Bottom Sign-Up Link */}
          <div className="mt-3.5 text-center text-xs font-medium text-[#667a6e]">
            <span>Don&apos;t have an account? </span>
            <Link href="/signup" className="font-bold text-[#143527] underline underline-offset-4 hover:text-[#12271d]">
              Sign Up
            </Link>
          </div>

          {/* Quick Demo Credentials Footer Pills */}
          <div className="mt-3.5 pt-2.5 border-t border-[#e8ece3] text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d9e92] block mb-1.5">
              Quick Demo Accounts (Password: <code className="font-mono text-black font-semibold">CiviqueDemo2026!</code>)
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { label: 'Citizen', mail: 'demo.citizen@civique.local', role: 'CITIZEN' as const },
                { label: 'Ward Officer', mail: 'demo.wardofficer@civique.local', role: 'OFFICIAL' as const },
                { label: 'Field Worker', mail: 'demo.fieldworker@civique.local', role: 'OFFICIAL' as const },
                { label: 'Super Admin', mail: 'demo.superadmin@civique.local', role: 'OFFICIAL' as const },
              ].map((c) => (
                <button
                  key={c.mail}
                  type="button"
                  onClick={() => handleQuickFill(c.mail, c.role)}
                  className="rounded-full bg-white border border-[#dce2d6] px-2.5 py-0.5 text-[10px] font-bold text-[#35483e] hover:bg-[#143527] hover:text-white hover:border-[#143527] transition-all cursor-pointer shadow-2xs"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-[#8a9b8e] text-center lg:text-left shrink-0">
          © 2026 Civique Platform. Indore Municipal Corporation (IMC).
        </p>
      </div>

      {/* ================= RIGHT SECTION: QUOTE & ARCHITECTURAL BUILDINGS SKYLINE ================= */}
      <div className="relative hidden lg:flex flex-col justify-between w-1/2 h-full bg-white border-l border-[#eef1ea] overflow-hidden select-none shrink-0">
        
        {/* Top: Pure Inspirational Civic Quote (No Person Card, No extra capsules or paragraphs) */}
        <div className="relative z-10 px-8 xl:px-14 pt-8 xl:pt-12 max-w-xl">
          
          {/* Orange Opening Quote Icon */}
          <div className="text-[#ea580c] mb-3">
            <svg className="size-9 xl:size-10 fill-current opacity-90" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>

          {/* Inspirational Civic Quote */}
          <div className="space-y-2">
            <p className="text-xl xl:text-[1.6rem] font-black text-[#192b21] leading-snug tracking-tight">
              “Transforming citizen vigilance into swift municipal action. Where every street, ward, and corridor in Indore is monitored with real-time AI intelligence and verified public accountability.”
            </p>

            {/* Closing Orange Quote Icon on Right below quote */}
            <div className="flex justify-end pt-1 text-[#ea580c]">
              <svg className="size-8 xl:size-9 fill-current opacity-85 rotate-180" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>
          </div>

        </div>

        {/* Bottom: The Architectural Building Skyline (Anchored flush to bottom & right like Dribbble) */}
        <div className="absolute bottom-0 right-0 w-[96%] xl:w-[92%] 2xl:w-[88%] h-[58vh] xl:h-[64vh] max-h-[620px] pointer-events-none flex items-end justify-end">
          <svg
            viewBox="0 0 760 500"
            preserveAspectRatio="xMaxYMax meet"
            className="w-full h-full select-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* ================= BACKGROUND SKYLINE BUILDINGS ================= */}
            
            {/* Leftmost Slanted Louvered High-rise */}
            <polygon
              points="90,450 170,340 220,380 220,496 90,496"
              fill="#d8ece4"
              stroke="#143527"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            {/* Diagonal louvers */}
            <line x1="105" y1="435" x2="155" y2="375" stroke="#143527" strokeWidth="2.5" />
            <line x1="120" y1="450" x2="170" y2="390" stroke="#143527" strokeWidth="2.5" />
            <line x1="135" y1="465" x2="185" y2="405" stroke="#143527" strokeWidth="2.5" />
            <line x1="150" y1="480" x2="200" y2="420" stroke="#143527" strokeWidth="2.5" />

            {/* Midground Building 1 (Slanted roof behind left) */}
            <polygon
              points="180,300 300,195 370,245 370,496 180,496"
              fill="#ffffff"
              stroke="#143527"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <polygon
              points="180,300 220,260 340,165 300,195"
              fill="#eaf4ee"
              stroke="#143527"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            {/* Windows grid on Midground Building 1 */}
            <line x1="220" y1="320" x2="220" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="250" y1="300" x2="250" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="280" y1="280" x2="280" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="310" y1="260" x2="310" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="340" y1="270" x2="340" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />

            {/* Midground Building 2 (Tall Grid Windows) */}
            <polygon
              points="370,245 450,205 450,496 370,496"
              fill="#ffffff"
              stroke="#143527"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <line x1="390" y1="265" x2="390" y2="485" stroke="#143527" strokeWidth="2.5" strokeDasharray="8 6" />
            <line x1="410" y1="255" x2="410" y2="485" stroke="#143527" strokeWidth="2.5" strokeDasharray="8 6" />
            <line x1="430" y1="245" x2="430" y2="485" stroke="#143527" strokeWidth="2.5" strokeDasharray="8 6" />

            {/* ================= CENTRAL TALL MODERN SKYSCRAPER ================= */}
            
            {/* Central Skyscraper - Front Face */}
            <polygon
              points="450,160 565,90 565,496 450,496"
              fill="#fcfcf8"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Central Skyscraper - Right 3D Face */}
            <polygon
              points="565,90 635,130 635,496 565,496"
              fill="#f7f6ec"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            {/* Central Skyscraper - Top Angled Facet */}
            <polygon
              points="450,160 510,80 625,20 565,90"
              fill="#e8f3ec"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Four Vertical Dashed Window Columns in Warm Terracotta/Amber matching reference */}
            <line x1="475" y1="190" x2="475" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />
            <line x1="500" y1="175" x2="500" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />
            <line x1="525" y1="160" x2="525" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />
            <line x1="548" y1="145" x2="548" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />

            {/* ================= RIGHTMOST SKYSCRAPER (Bleeding off Right) ================= */}
            
            <polygon
              points="635,130 730,175 730,496 635,496"
              fill="#ffffff"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <polygon
              points="730,175 760,195 760,496 730,496"
              fill="#f4f7f4"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <polygon
              points="635,130 680,95 760,140 730,175"
              fill="#e8f3ec"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <line x1="665" y1="190" x2="665" y2="496" stroke="#143527" strokeWidth="2.2" strokeDasharray="8 6" />
            <line x1="695" y1="210" x2="695" y2="496" stroke="#143527" strokeWidth="2.2" strokeDasharray="8 6" />
            <line x1="745" y1="230" x2="745" y2="496" stroke="#143527" strokeWidth="2.2" strokeDasharray="8 6" />

            {/* ================= FOREGROUND ACCENT PAVILION (PEACH / CORAL) ================= */}
            
            <polygon
              points="330,385 420,335 420,496 330,496"
              fill="#fae4dd"
              stroke="#143527"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <line x1="345" y1="395" x2="405" y2="360" stroke="#e07a5f" strokeWidth="2.5" />
            <line x1="345" y1="415" x2="405" y2="380" stroke="#e07a5f" strokeWidth="2.5" />
            <line x1="345" y1="435" x2="405" y2="400" stroke="#e07a5f" strokeWidth="2.5" />
            <line x1="345" y1="455" x2="405" y2="420" stroke="#e07a5f" strokeWidth="2.5" />
            <line x1="345" y1="475" x2="405" y2="440" stroke="#e07a5f" strokeWidth="2.5" />

            {/* ================= STYLIZED GEOMETRIC FOREGROUND TREES ================= */}
            
            {/* Left Tree */}
            <circle cx="230" cy="435" r="32" fill="#ffffff" stroke="#143527" strokeWidth="3" />
            <line x1="230" y1="467" x2="230" y2="496" stroke="#143527" strokeWidth="3" />
            <line x1="230" y1="425" x2="215" y2="415" stroke="#143527" strokeWidth="2.5" />
            <line x1="230" y1="440" x2="245" y2="430" stroke="#143527" strokeWidth="2.5" />

            {/* Right Big Tree */}
            <circle cx="640" cy="445" r="42" fill="#ffffff" stroke="#143527" strokeWidth="3.2" />
            <line x1="640" y1="487" x2="640" y2="496" stroke="#143527" strokeWidth="3.2" />
            <line x1="640" y1="435" x2="625" y2="425" stroke="#143527" strokeWidth="2.5" />
            <line x1="640" y1="450" x2="655" y2="440" stroke="#143527" strokeWidth="2.5" />

            {/* Right Small Accent Tree */}
            <circle cx="705" cy="470" r="22" fill="#ffffff" stroke="#143527" strokeWidth="3" />
            <line x1="705" y1="492" x2="705" y2="496" stroke="#143527" strokeWidth="3" />

            {/* Baseline Ground Line */}
            <line x1="40" y1="496" x2="760" y2="496" stroke="#143527" strokeWidth="3.5" />
          </svg>
        </div>

      </div>

    </div>
  );
}
