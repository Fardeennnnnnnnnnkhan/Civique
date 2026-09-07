'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FiMapPin, 
  FiAlertTriangle, 
  FiActivity, 
  FiClock, 
  FiArrowRight, 
  FiPlus, 
  FiCheckCircle, 
  FiZap
} from 'react-icons/fi';
import CitizenHeader from './components/CitizenHeader';
import Shell from './components/Shell';
import LoadingState from './components/LoadingState';

export default function Home() {
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role !== 'CITIZEN') {
          window.location.href = '/admin';
          return;
        }
        setUser(parsedUser);

        // Fetch reports count and recent feed
        fetch(getApiUrl('/reports'), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(resData => {
            if (resData.success && resData.reports) {
              setReports(resData.reports);
            }
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      } catch (e) {
        localStorage.clear();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/signin';
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-screen">
        <LoadingState />
      </div>
    );
  }

  const welcomeName = user ? user.email.split('@')[0] : 'Citizen';

  // AUTHENTICATED CITIZEN PORTAL (WRAPPED IN SHELL)
  if (user) {
    return (
      <Shell user={user} onLogout={handleLogout}>
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in text-left">
          
          {/* Profile Welcome Message */}
          <div className="space-y-1.5 border-b border-[#E9E1D8] pb-6">
            <h2 className="text-2xl font-bold text-[#2B2523] tracking-tight">
              Good evening, <span className="text-[#5E1801]">{welcomeName}</span>.
            </h2>
            <p className="text-sm font-medium text-[#6F625C]">Here is the status of your neighborhood and civic activity.</p>
          </div>

          {/* TWO-COLUMN BENTO GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT MAIN COLUMN: Actions, Contribution Stats, Recent Updates (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Action buttons row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link 
                  href="/report" 
                  className="bg-[#5E1801] hover:bg-[#421000] text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between h-36 transition-all hover:shadow-md cursor-pointer group"
                >
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                    <FiPlus className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide uppercase text-[#f2ddbb]">Report an Issue</h3>
                    <p className="text-xs text-white/90 font-medium mt-1.5 leading-normal">Snap a photo to register a municipal grievance file.</p>
                  </div>
                </Link>

                <Link 
                  href="/map" 
                  className="bg-white border border-[#E9E1D8] p-6 rounded-2xl shadow-sm flex flex-col justify-between h-36 transition-all hover:border-[#CCB999] hover:shadow-md cursor-pointer group"
                >
                  <div className="w-9 h-9 bg-[#faf9f6] border border-[#E9E1D8] rounded-xl flex items-center justify-center text-[#5E1801] shrink-0 group-hover:scale-105 transition-transform">
                    <FiMapPin className="text-base" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide uppercase text-[#2B2523] group-hover:text-[#5E1801] transition-colors">Explore Indore</h3>
                    <p className="text-xs text-[#6F625C] font-medium mt-1.5 leading-normal">Browse active reports and tracking overlays on live maps.</p>
                  </div>
                </Link>
              </div>

              {/* Civic Activity Metrics counters */}
              <div className="bg-white border border-[#D8CCC0] rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider">Your Civic Contribution</h3>
                
                <Link 
                  href="/profile" 
                  className="grid grid-cols-3 gap-4 border-t border-[#E9E1D8]/60 pt-4 text-center hover:bg-[#faf9f6]/40 transition-colors rounded-xl block cursor-pointer"
                >
                  <div>
                    <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold">Reports Filed</span>
                    <span className="text-xl font-bold text-[#2B2523] mt-1 block">{reports.length}</span>
                  </div>
                  <div className="border-x border-[#E9E1D8] px-2">
                    <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold">In Progress</span>
                    <span className="text-xl font-bold text-[#7F56D9] mt-1 block">
                      {reports.filter(r => (r.incident?.status || 'REPORTED') !== 'RESOLVED').length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold">Resolved</span>
                    <span className="text-xl font-bold text-[#12B76A] mt-1 block">
                      {reports.filter(r => (r.incident?.status || 'REPORTED') === 'RESOLVED').length}
                    </span>
                  </div>
                </Link>
              </div>

              {/* Live Activity Feed list */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider">Recent Local Updates</h3>
                
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <div className="bg-white border border-[#E9E1D8] p-6 rounded-2xl text-center space-y-2">
                      <p className="text-xs font-semibold text-[#6F625C]">No recent updates registered yet.</p>
                      <p className="text-[10px] text-[#9B9088]">Reported civic cases will show active timeline updates here.</p>
                    </div>
                  ) : (
                    reports.slice(0, 3).map((report) => {
                      const isResolved = (report.incident?.status || 'REPORTED') === 'RESOLVED';
                      return (
                        <Link 
                          key={report.id}
                          href={`/report/${report.id}`}
                          className="bg-white border border-[#E9E1D8] p-4 rounded-2xl flex items-start gap-4 shadow-sm hover:border-[#CCB999] transition-all cursor-pointer block text-left"
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isResolved 
                              ? 'bg-green-50 border border-green-100 text-[#12B76A]' 
                              : 'bg-[#f2ddbb]/40 text-[#5E1801]'
                          }`}>
                            {isResolved ? <FiCheckCircle className="text-base" /> : <FiAlertTriangle className="text-base" />}
                          </div>
                          <div className="text-xs font-medium text-[#6F625C] space-y-1 flex-grow">
                            <div className="flex justify-between flex-wrap gap-1">
                              <span className="font-bold text-[#2B2523] truncate max-w-[200px]">
                                {report.categoryConfirmed || report.categorySuggested || 'OTHER'} Grievance
                              </span>
                              <span className="text-[9px] text-[#9B9088] font-bold">
                                {report.incident?.status || 'REPORTED'} · {new Date(report.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="leading-relaxed truncate max-w-[400px]">{report.description}</p>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT SIDE PANEL: Map Area, AI Alerts, Ward Directory (4 cols) */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Local Area map card */}
              <div className="bg-white border border-[#D8CCC0] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-5 border-b border-[#E9E1D8] flex justify-between items-center bg-white">
                  <h3 className="font-bold text-xs text-[#5E1801] uppercase tracking-wider">Your Civic Area</h3>
                  <Link href="/map" className="text-xs text-[#5E1801] hover:underline font-bold flex items-center gap-0.5">
                    Explore <FiArrowRight />
                  </Link>
                </div>
                
                <div className="h-36 bg-[#faf9f6] relative flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#5E1801_1px,transparent_1px),linear-gradient(to_bottom,#5E1801_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                  <div className="absolute top-[40%] left-[45%] flex flex-col items-center">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF6820] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-[#EF6820] border-2 border-white shadow-md"></span>
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2 text-xs font-medium text-[#2B2523]">
                  <p className="font-bold text-[#2B2523] flex items-center gap-1">
                    <FiMapPin className="text-[#5E1801]" /> Ward 44 · Zone 12 · Indore
                  </p>
                  <div className="bg-[#faf9f6] border border-[#E9E1D8] rounded-xl p-2.5 text-xs font-bold text-[#5E1801] flex items-center gap-1.5">
                    <FiActivity className="text-sm shrink-0 animate-pulse text-[#EF6820]" />
                    <span>12 active issues near you</span>
                  </div>
                </div>
              </div>

              {/* AI Hotspot Insights Card */}
              <div className="bg-white border border-[#D8CCC0] rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden flex flex-col justify-center">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#5E1801]"></div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#f2ddbb]/40 text-[#5E1801] rounded-xl">
                    <FiZap className="text-sm" />
                  </div>
                  <h3 className="font-bold text-xs text-[#5E1801] uppercase tracking-wider">AI Clustering Alerts</h3>
                </div>
                <p className="text-xs text-[#6F625C] font-semibold leading-relaxed">
                  Noticeable cluster of waste incidents identified near market limits. Crews have been alerted to optimize bin capacity schedules.
                </p>
              </div>

              {/* NEW: Indore Ward Helpline Directory Card */}
              <div className="bg-white border border-[#D8CCC0] rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#f2ddbb]/40 text-[#5E1801] rounded-xl">
                    <FiPlus className="text-sm" />
                  </div>
                  <h3 className="font-bold text-xs text-[#5E1801] uppercase tracking-wider">Ward 44 Helplines</h3>
                </div>
                <div className="space-y-3.5 text-xs text-[#6F625C] font-semibold">
                  <div className="flex justify-between border-b border-[#E9E1D8]/60 pb-2">
                    <span>Ward Officer Desk</span>
                    <span className="text-[#351008] font-bold">0731-2541244</span>
                  </div>
                  <div className="flex justify-between border-b border-[#E9E1D8]/60 pb-2">
                    <span>Drainage Dispatch Line</span>
                    <span className="text-[#351008] font-bold">0731-2541245</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Indore Helpline Portal</span>
                    <span className="text-[#5E1801] font-bold">181 (Toll-Free)</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </Shell>
    );
  }

  // PUBLIC GUEST LANDING HERO PAGE
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#2B2523] font-sans text-left">
      <CitizenHeader />

      <main className="flex-grow p-6 md:p-12 max-w-4xl w-full mx-auto flex items-center justify-center">
        <div className="py-12 md:py-24 text-center space-y-10 w-full">
          <div className="space-y-4">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[#5E1801] bg-[#f2ddbb]/40 px-3 py-1 rounded-full">
              Civic Governance Redefined
            </span>
            <h1 className="font-display text-4xl md:text-5xl text-[#2B2523] font-extrabold leading-tight tracking-tight">
              Empowering Citizens.<br />
              <span className="text-[#5E1801]">Building Better Cities.</span>
            </h1>
            <p className="text-xs md:text-sm text-[#6F625C] max-w-xl mx-auto font-medium leading-relaxed">
              Civique establishes a transparent, auditable loop connecting resident reports directly to verified city crew resolutions. Snap, submit, and track live in Indore.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xs mx-auto">
            <Link 
              href="/signup" 
              className="premium-btn-primary flex-grow py-3 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2"
            >
              Create Account <FiArrowRight />
            </Link>
            <Link 
              href="/signin" 
              className="flex-grow py-3 border border-[#D8CCC0] text-[#2B2523] font-semibold uppercase tracking-wider rounded-xl hover:bg-[#faf9f6] transition-all text-xs flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
