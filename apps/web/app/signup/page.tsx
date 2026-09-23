'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiCheck, FiAlertCircle, FiArrowRight, FiUser, FiMail, FiLock } from 'react-icons/fi';
import { apiFetch } from '../../lib/api/client';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { text: 'Weak', level: 1, color: 'bg-rose-500' };
    if (score === 2) return { text: 'Medium', level: 2, color: 'bg-amber-500' };
    return { text: 'Strong', level: 3, color: 'bg-[#143527]' };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSuccessMsg('Citizen profile confirmed! Entering Civique...');
      setTimeout(() => router.push('/'), 400);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed or server unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white text-[#192b21] font-sans antialiased overflow-hidden select-none">
      
      {/* ================= LEFT SECTION: REGISTRATION STATION ================= */}
      <div className="flex flex-col justify-between w-full lg:w-1/2 h-full px-6 sm:px-10 lg:px-12 xl:px-16 py-4 sm:py-5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
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

        {/* Center: Sign Up Form Box */}
        <div className="mx-auto w-full max-w-[390px] my-auto py-2">
          
          {/* Header Typography */}
          <div className="text-center space-y-1 mb-4">
            <h1 className="text-2xl sm:text-[1.7rem] font-black tracking-tight text-[#192b21]">
              Create Account
            </h1>
            <p className="text-xs text-[#667a6e] font-medium">
              Join Civique to report and verify municipal resolutions
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 animate-in fade-in">
                <FiAlertCircle className="size-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 rounded-2xl border border-[#d6e5da] bg-[#f2f7f4] p-3 text-xs font-semibold text-[#143527] animate-in fade-in">
                <FiCheck className="size-4 shrink-0 text-[#143527]" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1 text-left">
              <label htmlFor="signup-name" className="block text-xs font-bold text-[#192b21]">
                Full Name <span className="text-[#143527]">*</span>
              </label>
              <div className="flex h-10 sm:h-11 w-full items-center gap-3 rounded-full border border-[#dce2d6] bg-white px-4 shadow-2xs transition-all focus-within:border-[#143527] focus-within:ring-2 focus-within:ring-[#143527]/20">
                <FiUser className="size-4 text-[#8a9b8e] shrink-0" />
                <input
                  id="signup-name"
                  type="text"
                  required
                  placeholder="Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#192b21] placeholder:text-[#9ca8a0] focus:outline-none"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1 text-left">
              <label htmlFor="signup-email" className="block text-xs font-bold text-[#192b21]">
                Email Address <span className="text-[#143527]">*</span>
              </label>
              <div className="flex h-10 sm:h-11 w-full items-center gap-3 rounded-full border border-[#dce2d6] bg-white px-4 shadow-2xs transition-all focus-within:border-[#143527] focus-within:ring-2 focus-within:ring-[#143527]/20">
                <FiMail className="size-4 text-[#8a9b8e] shrink-0" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  placeholder="citizen@civique.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#192b21] placeholder:text-[#9ca8a0] focus:outline-none"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1 text-left">
              <label htmlFor="signup-password" className="block text-xs font-bold text-[#192b21]">
                Password <span className="text-[#143527]">*</span>
              </label>
              <div className="flex h-10 sm:h-11 w-full items-center gap-3 rounded-full border border-[#dce2d6] bg-white px-4 shadow-2xs transition-all focus-within:border-[#143527] focus-within:ring-2 focus-within:ring-[#143527]/20">
                <FiLock className="size-4 text-[#8a9b8e] shrink-0" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 8 characters"
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

              {password.length > 0 && (
                <div className="flex items-center justify-between px-1 pt-0.5 text-[10px] text-[#667a6e]">
                  <span>Strength: <strong className="font-bold text-[#192b21]">{strength.text}</strong></span>
                  <div className="h-1 w-24 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${(strength.level / 3) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1 text-left">
              <label htmlFor="signup-confirm" className="block text-xs font-bold text-[#192b21]">
                Confirm Password <span className="text-[#143527]">*</span>
              </label>
              <div className="flex h-10 sm:h-11 w-full items-center gap-3 rounded-full border border-[#dce2d6] bg-white px-4 shadow-2xs transition-all focus-within:border-[#143527] focus-within:ring-2 focus-within:ring-[#143527]/20">
                <FiLock className="size-4 text-[#8a9b8e] shrink-0" />
                <input
                  id="signup-confirm"
                  type="password"
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-[#192b21] placeholder:text-[#9ca8a0] focus:outline-none"
                />
              </div>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex h-10 sm:h-11 w-full items-center justify-center gap-2 rounded-full bg-[#143527] hover:bg-[#0e271c] text-white font-bold text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Registering...</span>
              ) : (
                <>
                  <span>Create Citizen Account</span>
                  <FiArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Sign-In Link */}
          <div className="mt-4 text-center text-xs font-medium text-[#667a6e]">
            <span>Already have an account? </span>
            <Link href="/signin" className="font-bold text-[#143527] underline underline-offset-4 hover:text-[#0b2419]">
              Sign In
            </Link>
          </div>

        </div>

        {/* Footer Note */}
        <p className="text-[11px] text-[#8a9b8e] text-center lg:text-left shrink-0">
          © 2026 Civique Platform. Indore Municipal Corporation (IMC).
        </p>
      </div>

      {/* ================= RIGHT SECTION: QUOTE & ARCHITECTURAL BUILDINGS SKYLINE ================= */}
      <div className="relative hidden lg:flex flex-col justify-between w-1/2 h-full bg-white border-l border-[#eef1ea] overflow-hidden select-none shrink-0">
        
        {/* Top: Pure Inspirational Civic Quote */}
        <div className="relative z-10 px-8 xl:px-14 pt-8 xl:pt-12 max-w-xl">
          
          {/* Orange Opening Quote Icon */}
          <div className="text-[#ea580c] mb-3">
            <svg className="size-9 xl:size-10 fill-current opacity-90" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </div>

          {/* Pure Civic Quote */}
          <div className="space-y-2">
            <p className="text-xl xl:text-[1.6rem] font-black text-[#192b21] leading-snug tracking-tight">
              “Every civic observation reported by a citizen brings our city one step closer to spotless streets, reliable infrastructure, and transparent public governance.”
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
            {/* Background Skyline Buildings */}
            <polygon
              points="90,450 170,340 220,380 220,496 90,496"
              fill="#d8ece4"
              stroke="#143527"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            <line x1="105" y1="435" x2="155" y2="375" stroke="#143527" strokeWidth="2.5" />
            <line x1="120" y1="450" x2="170" y2="390" stroke="#143527" strokeWidth="2.5" />
            <line x1="135" y1="465" x2="185" y2="405" stroke="#143527" strokeWidth="2.5" />
            <line x1="150" y1="480" x2="200" y2="420" stroke="#143527" strokeWidth="2.5" />

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
            <line x1="220" y1="320" x2="220" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="250" y1="300" x2="250" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="280" y1="280" x2="280" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="310" y1="260" x2="310" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="340" y1="270" x2="340" y2="496" stroke="#143527" strokeWidth="2" strokeDasharray="6 6" />

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

            {/* Central Hero Skyscraper */}
            <polygon
              points="450,160 565,90 565,496 450,496"
              fill="#fcfcf8"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <polygon
              points="565,90 635,130 635,496 565,496"
              fill="#f7f6ec"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <polygon
              points="450,160 510,80 625,20 565,90"
              fill="#e8f3ec"
              stroke="#143527"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            <line x1="475" y1="190" x2="475" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />
            <line x1="500" y1="175" x2="500" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />
            <line x1="525" y1="160" x2="525" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />
            <line x1="548" y1="145" x2="548" y2="485" stroke="#ea580c" strokeWidth="3.2" strokeDasharray="10 8" strokeLinecap="round" />

            {/* Rightmost Skyscraper */}
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

            {/* Foreground Pavilion */}
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

            {/* Foreground Trees */}
            <circle cx="230" cy="435" r="32" fill="#ffffff" stroke="#143527" strokeWidth="3" />
            <line x1="230" y1="467" x2="230" y2="496" stroke="#143527" strokeWidth="3" />
            <line x1="230" y1="425" x2="215" y2="415" stroke="#143527" strokeWidth="2.5" />
            <line x1="230" y1="440" x2="245" y2="430" stroke="#143527" strokeWidth="2.5" />

            <circle cx="640" cy="445" r="42" fill="#ffffff" stroke="#143527" strokeWidth="3.2" />
            <line x1="640" y1="487" x2="640" y2="496" stroke="#143527" strokeWidth="3.2" />
            <line x1="640" y1="435" x2="625" y2="425" stroke="#143527" strokeWidth="2.5" />
            <line x1="640" y1="450" x2="655" y2="440" stroke="#143527" strokeWidth="2.5" />

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
