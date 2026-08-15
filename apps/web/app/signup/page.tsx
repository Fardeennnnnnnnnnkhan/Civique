'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiEye, FiEyeOff, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('CITIZEN');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [strength, setStrength] = useState({ text: 'Weak', level: 1, color: 'bg-error' });

  // Robust API Base URL resolver
  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setStrength({ text: 'Weak', level: 1, color: 'bg-error' });
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    
    if (score === 0 || score === 1) {
      setStrength({ text: 'Weak', level: 1, color: 'bg-error' });
    } else if (score === 2) {
      setStrength({ text: 'Medium', level: 2, color: 'bg-[#EF6820]' });
    } else {
      setStrength({ text: 'Strong', level: 3, color: 'bg-[#12B76A]' });
    }
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

    const targetUrl = getApiUrl('/auth/register');

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg('Account created successfully! Redirecting...');
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        setTimeout(() => {
          window.location.href = '/signin';
        }, 1500);
      } else {
        setErrorMsg(data.error?.message || 'Registration failed');
      }
    } catch (err) {
      setErrorMsg('Unable to connect to the server at ' + targetUrl);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#faf9f6]">
      {/* LEFT SIDE: Brand Storytelling Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#5E1801] flex-col justify-between p-16 overflow-hidden">
        {/* Architectural background overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-15 mix-blend-overlay bg-cover bg-center" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80')" }}
        ></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between items-start">
          {/* Large Logo Card to make text fully legible */}
          <div className="bg-white p-2 rounded-2xl shadow-xl inline-block w-fit">
            <img 
              src="/civique.png" 
              alt="Civique Logo" 
              className="h-28 w-auto object-contain"
            />
          </div>
          
          <div className="max-w-lg my-12 text-left">
            <h2 className="text-4xl font-light mb-6 text-[#f2ddbb] leading-tight tracking-wide">Empowering modern civic management.</h2>
            <p className="text-lg text-white/90 font-light leading-relaxed">
              Join the next generation platform built for clarity, performance, and trust. Connect your community with tools designed for tomorrow.
            </p>
          </div>
          
          <div className="border-t border-white/20 pt-8 flex items-center gap-6 w-full">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#f2ddbb] shadow-md bg-white">
              <img 
                className="w-full h-full object-cover" 
                alt="Sarah Jenkins Profile"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqQDfiBYpLp6injfDVvSLJjXvND0ajvh9vrLnPe1DmKQJsebx7NMi1bcwapw7jU190pnxzC4xxQ6qz4aSC7oeZpFD8BYxr1GQ-RaDuN4-WYEikpROE_JKEGWMZzT_G3A4IHVM-jTK1D1jNLJGQj3kylaKUoCuz8A-2zYHH1kE83mZEzXc3SKfyfCPMAXD13UrOkGDqrHKiMcHX_Bsp3wsZt5IyCRxzpgzTyfQGpbLVt6iQvlR5mSEilA"
              />
            </div>
            <div>
              <p className="font-light text-white italic">"A complete paradigm shift for our operations."</p>
              <p className="text-xs text-[#f4e0be]/80 font-light mt-1">Sarah Jenkins, Director of Urban Planning</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#f2ddbb] rounded-tl-full opacity-10 mix-blend-plus-lighter blur-2xl"></div>
      </div>

      {/* RIGHT SIDE: Signup Form Area */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#faf9f6] z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Logo prominently displayed at the top of the form */}
          <div className="flex justify-start">
            <img 
              src="/civique.png" 
              alt="Civique Logo" 
              className="h-28 w-auto object-contain" 
            />
          </div>

          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl text-primary font-light tracking-tight">Create your account</h2>
            <p className="text-text-secondary text-sm font-light">Enter your details below to register.</p>
          </div>

          <form className="space-y-4 w-full" onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 text-error rounded-xl text-sm flex items-center gap-2">
                <FiAlertCircle className="text-lg flex-shrink-0" />
                <span className="font-light">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-4 bg-green-50 border border-green-200 text-status-resolved rounded-xl text-sm flex items-center gap-2">
                <FiCheck className="text-lg flex-shrink-0" />
                <span className="font-light">{successMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block font-light text-text-primary text-[10px] tracking-wider uppercase" htmlFor="fullName">Full Name</label>
              <input 
                className="premium-input w-full px-4 py-3 text-on-surface placeholder-text-muted text-sm font-light" 
                id="fullName" 
                placeholder="Jane Doe" 
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-light text-text-primary text-[10px] tracking-wider uppercase" htmlFor="email">Email Address</label>
              <input 
                className="premium-input w-full px-4 py-3 text-on-surface placeholder-text-muted text-sm font-light" 
                id="email" 
                placeholder="jane.doe@example.com" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Role dropdown select field */}
            <div className="space-y-1">
              <label className="block font-light text-text-primary text-[10px] tracking-wider uppercase" htmlFor="role">Account Role</label>
              <select 
                className="premium-input w-full px-4 py-3 text-on-surface text-sm font-light bg-white focus:border-[#CCB999]" 
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="CITIZEN">Citizen</option>
                <option value="CITY_ADMIN">City Administrator</option>
                <option value="ZONE_OFFICER">Zone Officer</option>
                <option value="WARD_OFFICER">Ward Officer</option>
                <option value="DEPARTMENT_HEAD">Department Head</option>
                <option value="FIELD_WORKER">Field Worker</option>
                <option value="HELP_DESK">Help Desk Agent</option>
                <option value="SUPER_ADMIN">Super Administrator</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-light text-text-primary text-[10px] tracking-wider uppercase" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  className="premium-input w-full px-4 py-3 text-on-surface placeholder-text-muted pr-10 text-sm font-light" 
                  id="password" 
                  placeholder="••••••••" 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  aria-label="Toggle password visibility" 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary focus:outline-none" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEye className="text-lg" /> : <FiEyeOff className="text-lg" />}
                </button>
              </div>
            </div>

            {/* Password Strength Requirement Box */}
            {password && (
              <div className="space-y-3 bg-[#F7F4EE] p-4 rounded-xl border border-border-light">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-secondary font-light">Password strength: <span className="font-medium text-text-primary">{strength.text}</span></span>
                </div>
                <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-border-light">
                  <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: strength.text === 'Weak' ? '25%' : strength.text === 'Medium' ? '50%' : '100%' }}></div>
                </div>
                <ul className="text-xs text-text-secondary space-y-1.5 mt-1 font-light">
                  <li className="flex items-center gap-2">
                    {password.length >= 8 ? (
                      <FiCheck className="text-status-resolved text-sm flex-shrink-0" />
                    ) : (
                      <FiX className="text-error text-sm flex-shrink-0" />
                    )}
                    <span>At least 8 characters</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {/[A-Z]/.test(password) ? (
                      <FiCheck className="text-status-resolved text-sm flex-shrink-0" />
                    ) : (
                      <FiX className="text-error text-sm flex-shrink-0" />
                    )}
                    <span>Contains uppercase letter</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {(/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) ? (
                      <FiCheck className="text-status-resolved text-sm flex-shrink-0" />
                    ) : (
                      <FiX className="text-error text-sm flex-shrink-0" />
                    )}
                    <span>Contains number or symbol</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="space-y-1">
              <label className="block font-light text-text-primary text-[10px] tracking-wider uppercase" htmlFor="confirmPassword">Confirm Password</label>
              <input 
                className="premium-input w-full px-4 py-3 text-on-surface placeholder-text-muted text-sm font-light" 
                id="confirmPassword" 
                placeholder="••••••••" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button 
              className="premium-btn-primary w-full mt-2 py-3.5 px-6 text-sm font-light tracking-wide uppercase" 
              type="submit"
            >
              Create Account
            </button>
          </form>

          <div className="text-center pt-4 border-t border-border-light">
            <p className="text-sm text-text-secondary font-light">
              Already have an account?{' '}
              <Link href="/signin" className="font-medium text-primary hover:underline underline-offset-4 decoration-[#CCB999]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
