'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#faf9f6] min-h-screen">
        <div className="relative flex h-8 w-8">
          <span className="animate-ping absolute inline-flex h-full w-full bg-[#5E1801] rounded-full opacity-75"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-[#5E1801]"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-[#faf9f6] min-h-screen font-sans">
      {/* Header bar */}
      <header className="border-b border-[#E9E1D8] bg-white/80 backdrop-blur-md sticky top-0 z-50 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <img src="/civique.png" alt="Civique Logo" className="h-10 w-auto object-contain" />
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-[#5E1801] bg-[#f2ddbb] px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                {user.role}
              </span>
              <button 
                onClick={handleLogout}
                className="text-xs text-text-secondary hover:text-primary transition-colors cursor-pointer underline underline-offset-4 font-medium"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <Link href="/signin" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="premium-btn-primary px-5 py-2.5 text-xs uppercase tracking-wider font-semibold">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main body content */}
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto space-y-8">
        {user ? (
          <div className="space-y-6 bg-white p-8 rounded-2xl border border-[#E9E1D8] shadow-md text-left max-w-md w-full animate-fade-in">
            <div className="border-b border-[#E9E1D8] pb-4">
              <h1 className="font-display text-2xl text-text-primary font-bold">Welcome Back</h1>
              <p className="text-text-secondary text-sm">Authenticated session details</p>
            </div>
            <div className="space-y-3.5 pt-2 text-sm font-sans">
              <div className="flex justify-between">
                <span className="text-text-muted">Account Email:</span>
                <span className="font-medium text-text-primary">{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Role Assignment:</span>
                <span className="font-medium text-text-primary">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Session Status:</span>
                <span className="font-medium text-[#12B76A] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#12B76A] inline-block"></span>
                  Active
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 py-16">
            <div className="space-y-4">
              <h1 className="font-display text-5xl md:text-6xl text-text-primary font-extrabold leading-tight">
                Civic Intelligence for <br />
                <span className="text-primary">Next-Gen Governance</span>
              </h1>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto font-light leading-relaxed">
                Civique bridges the gap between smart city administrators and citizens. Report issues, track resolutions, and monitor city improvements in real-time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/signup" 
                className="premium-btn-primary px-8 py-4 text-sm uppercase tracking-wider font-semibold"
              >
                Get Started
              </Link>
              <Link 
                href="/signin" 
                className="px-8 py-4 border border-[#D8CCC0] text-text-primary font-medium rounded-xl hover:bg-[#F7F4EE] transition-all text-sm cursor-pointer"
              >
                Sign In
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
