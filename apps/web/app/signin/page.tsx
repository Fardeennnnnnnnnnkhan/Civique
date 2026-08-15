'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FiEye, FiEyeOff, FiAlertCircle, FiCheck } from 'react-icons/fi';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Robust API Base URL resolver
  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Email and password are required');
      return;
    }

    const targetUrl = getApiUrl('/auth/login');

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg('Login successful! Redirecting...');
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.data.user));

        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setErrorMsg(data.error?.message || 'Invalid email or password');
      }
    } catch (err) {
      setErrorMsg('Unable to connect to the server at ' + targetUrl);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-surface-bright flex-col md:flex-row antialiased">
      {/* LEFT SIDE: Brand Storytelling */}
      <div className="hidden md:flex md:w-1/2 bg-[#5E1801] relative flex-col justify-between p-16 overflow-hidden border-r border-border-light">
        {/* Abstract City Background Visualization overlay */}
        <div 
          className="absolute inset-0 z-0 opacity-15 mix-blend-overlay bg-cover bg-center" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80')" }}
        ></div>
        
        <div className="relative z-10 flex flex-col h-full justify-between items-start">
          {/* Logo container precisely fitted to the image with zero extra white space */}
          <div className="bg-white p-3 rounded-2xl shadow-xl inline-block w-fit">
            <img 
              src="/civique.png" 
              alt="Civique Logo" 
              className="h-28 w-auto object-contain"
            />
          </div>
          
          <div className="max-w-lg my-12 text-left">
            <h1 className="text-4xl font-light text-[#f2ddbb] mb-6 leading-tight tracking-wide">
              Better cities begin with better participation.
            </h1>
            <p className="text-lg text-white/90 font-light leading-relaxed">
              Join a community of thousands of citizens and administrators working together to resolve civic issues efficiently and transparently.
            </p>
          </div>

          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex items-center gap-4 max-w-xs shadow-sm">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12B76A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#12B76A]"></span>
            </div>
            <div>
              <div className="text-[10px] text-white/60 uppercase tracking-wider font-light">City Pulse</div>
              <div className="text-sm font-light text-white">1,284 issues tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-[#faf9f6] z-10">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Brand logo placed at the top of the form */}
          <div className="flex justify-start">
            <img 
              src="/civique.png" 
              alt="Civique Logo" 
              className="h-28 w-auto object-contain" 
            />
          </div>

          <div className="space-y-1.5 text-left">
            <h2 className="text-2xl text-text-primary mb-1 font-light tracking-tight">Welcome back</h2>
            <p className="text-text-secondary text-sm font-light">Please enter your details to sign in.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
              <label className="block font-light text-text-primary text-[10px] tracking-wider uppercase mb-1" htmlFor="email">Email address</label>
              <input 
                className="premium-input w-full px-4 py-3 text-text-primary placeholder:text-text-muted text-sm font-light" 
                id="email" 
                placeholder="Enter your email" 
                required 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block font-light text-text-primary text-[10px] tracking-wider uppercase mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <input 
                  className="premium-input w-full px-4 py-3 text-text-primary placeholder:text-text-muted text-sm pr-10 font-light" 
                  id="password" 
                  placeholder="••••••••" 
                  required 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none" 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEye className="text-lg" /> : <FiEyeOff className="text-lg" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between font-light text-xs">
              <div className="flex items-center">
                <input 
                  className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary cursor-pointer" 
                  id="remember-me" 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="ml-2 block text-text-secondary cursor-pointer" htmlFor="remember-me">
                  Remember for 30 days
                </label>
              </div>
              <div>
                <a className="font-medium text-primary hover:underline decoration-[#CCB999]" href="#">Forgot password?</a>
              </div>
            </div>

            <button 
              className="premium-btn-primary w-full flex justify-center py-3.5 px-4 text-sm font-light tracking-wide uppercase" 
              type="submit"
            >
              Sign In
            </button>
          </form>

          <div className="text-center pt-4 border-t border-border-light">
            <p className="text-sm text-text-secondary font-light">
              Don't have an account?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline underline-offset-4 decoration-[#CCB999]">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
