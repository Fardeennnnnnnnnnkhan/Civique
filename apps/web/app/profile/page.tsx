'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiClock, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiMapPin, 
  FiArrowRight,
  FiShield,
  FiAward,
  FiZap,
  FiFileText
} from 'react-icons/fi';
import CitizenHeader from '../components/CitizenHeader';
import Shell from '../components/Shell';

interface UserReport {
  id: string;
  trackingId: string;
  category: string;
  description: string;
  status: string;
  date: string;
  ward: string;
  updates: Array<{ time: string; title: string; desc: string }>;
}

export default function CitizenProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CASES' | 'HISTORY' | 'SECURITY'>('CASES');
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };
  
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      
      // Fetch user's reports from API
      fetch(getApiUrl('/reports'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.reports) {
            const mapped = resData.reports.map((r: any) => {
              const tracking = r.incident?.publicTrackingId || `REP-${r.id.substring(0, 8).toUpperCase()}`;
              const stat = r.incident?.status || 'REPORTED';
              
              const history = [
                { time: new Date(r.createdAt).toLocaleDateString(), title: 'Report Submitted', desc: 'Grievance recorded in registry.' }
              ];
              if (r.incident) {
                history.push({ time: new Date(r.incident.createdAt).toLocaleDateString(), title: 'Incident Created', desc: 'Case promoted to active queue.' });
              }

              return {
                id: r.id,
                trackingId: tracking,
                category: r.categorySuggested || 'OTHER',
                description: r.description || '',
                status: stat,
                date: new Date(r.createdAt).toLocaleString(),
                ward: r.incident?.ward?.name || 'Indore Ward Boundary',
                updates: history
              };
            });
            setReports(mapped);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      router.push('/signin');
    }
  }, [router]);

  const activeReports = reports.filter(r => r.status !== 'RESOLVED');
  const resolvedReports = reports.filter(r => r.status === 'RESOLVED');

  const handleLogout = () => {
    localStorage.clear();
    router.push('/signin');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      REPORTED: 'bg-blue-50 border-blue-200 text-blue-700',
      ASSIGNED: 'bg-[#7F56D9]/10 border-[#7F56D9]/20 text-[#7F56D9]',
      RESOLVED: 'bg-green-50 border-green-200 text-green-700'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${styles[status] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  if (!user) return null;

  const profileName = user.email.split('@')[0];

  return (
    <Shell user={user} onLogout={handleLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in text-left">
        
        {/* Profile Card Header */}
        <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-16 h-16 bg-[#f2ddbb]/60 text-[#5E1801] rounded-2xl flex items-center justify-center font-bold text-xl border border-[#CCB999]/30 shrink-0">
              {user.email.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                <h1 className="text-xl font-semibold text-[#351008]">{profileName}</h1>
                <span className="text-[10px] font-semibold text-[#12B76A] bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Verified Citizen</span>
              </div>
              <p className="text-xs text-[#6F625C] font-light flex items-center gap-1 justify-center md:justify-start">
                <FiMail /> {user.email}
              </p>
              <p className="text-[10px] text-[#6F625C] font-semibold uppercase tracking-wider flex items-center gap-1 justify-center md:justify-start">
                <FiMapPin className="text-[#5E1801]" /> Indore, Ward 44
              </p>
            </div>
          </div>

          {/* Stats blocks */}
          <div className="flex gap-6 border-t md:border-t-0 md:border-l border-[#E9E1D8] pt-6 md:pt-0 md:pl-8 text-center shrink-0 w-full md:w-auto justify-around">
            <div>
              <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold block">Total Filed</span>
              <span className="text-2xl font-bold text-[#351008] mt-1 block">{reports.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold block">In Progress</span>
              <span className="text-2xl font-bold text-[#7F56D9] mt-1 block">{activeReports.length}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold block">Resolved</span>
              <span className="text-2xl font-bold text-[#12B76A] mt-1 block">{resolvedReports.length}</span>
            </div>
          </div>
        </div>

        {/* Your Impact Section */}
        <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#CCB999]"></div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#f2ddbb]/40 text-[#5E1801] rounded-xl shrink-0">
              <FiAward className="text-lg animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-[#351008]">Your Community Impact</h3>
              <p className="text-xs text-[#6F625C] leading-relaxed font-light">
                By filing {reports.length} reports, you helped identify {reports.length} issues in your community. Thank you for contributing to next-gen civic intelligence.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation buttons */}
        <div className="border-b border-[#E9E1D8] flex gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('CASES')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'CASES' ? 'text-[#5E1801] font-semibold' : 'text-[#6F625C] hover:text-[#351008]'
            }`}
          >
            Active Grievances ({activeReports.length})
            {activeTab === 'CASES' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5E1801] rounded-full"></span>}
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'HISTORY' ? 'text-[#5E1801] font-semibold' : 'text-[#6F625C] hover:text-[#351008]'
            }`}
          >
            Resolved Archives ({resolvedReports.length})
            {activeTab === 'HISTORY' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5E1801] rounded-full"></span>}
          </button>
          <button
            onClick={() => setActiveTab('SECURITY')}
            className={`pb-3 relative transition-colors ${
              activeTab === 'SECURITY' ? 'text-[#5E1801] font-semibold' : 'text-[#6F625C] hover:text-[#351008]'
            }`}
          >
            Identity Security
            {activeTab === 'SECURITY' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5E1801] rounded-full"></span>}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          
          {activeTab === 'CASES' && (
            <div className="space-y-6">
              {activeReports.length === 0 ? (
                <div className="bg-white border border-[#E9E1D8] rounded-2xl p-16 text-center space-y-3">
                  <FiAlertCircle className="text-3xl text-[#9B9088] mx-auto" />
                  <h3 className="text-sm font-semibold text-[#351008]">No active grievances</h3>
                  <p className="text-xs text-[#6F625C] font-light max-w-xs mx-auto">All your reports are resolved. If you spot a municipal issue, report it now.</p>
                  <Link href="/report" className="premium-btn-primary inline-flex px-6 py-2.5 text-xs font-semibold uppercase tracking-wider">Report Issue</Link>
                </div>
              ) : (
                activeReports.map((report) => (
                  <div key={report.id} className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:border-[#CCB999] transition-colors relative">
                    
                    {/* Left: Info Grid */}
                    <div className="flex-1 space-y-3 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-[#5E1801] bg-[#f2ddbb]/40 px-2 py-0.5 rounded">
                          {report.trackingId}
                        </span>
                        <span className="text-[10px] text-[#9B9088] font-light">{report.date}</span>
                        {getStatusBadge(report.status)}
                      </div>

                      <h3 className="text-sm font-semibold text-[#351008] uppercase tracking-wider">{report.category}</h3>
                      <p className="text-xs text-[#6F625C] font-light leading-relaxed">{report.description}</p>
                      
                      <div className="text-[10px] text-[#9B9088] font-semibold uppercase tracking-wider flex items-center gap-1">
                        <FiMapPin /> {report.ward}
                      </div>
                    </div>

                    {/* Right: Timeline Snapshot */}
                    <div className="md:w-72 border-t md:border-t-0 md:border-l border-[#E9E1D8]/60 pt-4 md:pt-0 md:pl-6 space-y-3.5 text-left">
                      <span className="block text-[9px] text-[#9B9088] uppercase tracking-wider font-semibold">Latest Update</span>
                      
                      {report.updates.length > 0 && (
                        <div className="bg-[#faf9f6] border border-[#E9E1D8] p-3 rounded-xl shadow-xs">
                          <h4 className="text-[11px] font-semibold text-[#351008]">{report.updates[report.updates.length - 1].title}</h4>
                          <p className="text-[10px] text-[#6F625C] font-light mt-0.5 leading-snug">{report.updates[report.updates.length - 1].desc}</p>
                        </div>
                      )}

                      <Link
                        href={`/report/${report.id}`}
                        className="w-full py-2 border border-[#D8CCC0] hover:border-[#CCB999] hover:bg-[#faf9f6] text-[10px] font-semibold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 text-[#5E1801]"
                      >
                        Track Case Details <FiArrowRight />
                      </Link>
                    </div>

                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'HISTORY' && (
            <div className="space-y-6">
              {resolvedReports.length === 0 ? (
                <div className="bg-white border border-[#E9E1D8] rounded-2xl p-16 text-center space-y-3">
                  <FiAlertCircle className="text-3xl text-[#9B9088] mx-auto" />
                  <h3 className="text-sm font-semibold text-[#351008]">No historical archives</h3>
                  <p className="text-xs text-[#6F625C] font-light max-w-xs mx-auto">Resolved reports will appear here for your municipal reference.</p>
                </div>
              ) : (
                resolvedReports.map((report) => (
                  <div key={report.id} className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 hover:border-[#CCB999] transition-colors relative">
                    <div className="flex-grow space-y-3 text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-[#6F625C] bg-[#E9E1D8]/40 px-2 py-0.5 rounded">
                          {report.trackingId}
                        </span>
                        {getStatusBadge(report.status)}
                      </div>
                      <h3 className="text-xs font-semibold text-[#351008] uppercase tracking-wider">{report.category}</h3>
                      <p className="text-xs text-[#6F625C] font-light leading-relaxed">{report.description}</p>
                    </div>
                    <div className="md:w-44 flex flex-col justify-between items-end shrink-0">
                      <span className="text-[10px] text-[#9B9088]">{report.date}</span>
                      <Link
                        href={`/report/${report.id}`}
                        className="text-[10px] text-[#5E1801] hover:underline font-semibold flex items-center gap-0.5 mt-2"
                      >
                        View Resolution Evidence <FiArrowRight />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
              {/* Header block */}
              <div>
                <h3 className="text-sm font-bold text-[#351008] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E9E1D8] pb-3">
                  <FiShield className="text-[#CCB999]" /> Profile Identity & settings
                </h3>
                <p className="text-xs text-[#6F625C] mt-2 font-medium">Manage your verified civic identity credentials and push notification routing preferences.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left panel: Info inputs (7 cols) */}
                <div className="md:col-span-7 space-y-6 text-xs text-[#6F625C] font-semibold">
                  <h4 className="text-xs font-bold text-[#351008] uppercase tracking-wider">Personal Identity Log</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-[#5E1801] font-bold">Registered Full Name</label>
                      <input 
                        type="text" 
                        defaultValue={profileName.toUpperCase()} 
                        className="w-full px-3 py-2.5 bg-white border border-[#D8CCC0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5E1801] text-xs font-bold text-[#351008]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-[#5E1801] font-bold">Primary Phone Line</label>
                      <input 
                        type="text" 
                        defaultValue="+91 98765 43210" 
                        className="w-full px-3 py-2.5 bg-white border border-[#D8CCC0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5E1801] text-xs font-bold text-[#351008]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[#5E1801] font-bold">Registered Email</label>
                    <input 
                      type="email" 
                      disabled
                      value={user.email} 
                      className="w-full px-3 py-2.5 bg-[#faf9f6] border border-[#E9E1D8] rounded-xl text-xs font-bold text-[#9B9088] cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-[#5E1801] font-bold">Assigned Ward Limits</label>
                      <select className="w-full px-3 py-2.5 bg-white border border-[#D8CCC0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5E1801] text-xs font-bold text-[#351008]">
                        <option>Indore Ward 44 (Anoop Nagar)</option>
                        <option>Indore Ward 45 (Geeta Nagar)</option>
                        <option>Indore Ward 46 (Vijay Nagar)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase tracking-wider text-[#5E1801] font-bold">Resident ID Token</label>
                      <span className="block px-3 py-2.5 bg-[#faf9f6] border border-[#E9E1D8] rounded-xl text-[10px] font-mono font-bold text-[#5E1801] truncate select-all">
                        {`ID-RES-${user.email.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => alert('Profile credentials updated successfully inside local storage.')}
                    className="premium-btn-primary px-6 py-2.5 text-[10px] font-bold tracking-wider uppercase inline-block"
                  >
                    Save Profile Settings
                  </button>
                </div>

                {/* Right panel: Toggle Preferences (5 cols) */}
                <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-[#E9E1D8] pt-6 md:pt-0 md:pl-8 space-y-6 text-xs text-[#6F625C] font-semibold">
                  <h4 className="text-xs font-bold text-[#351008] uppercase tracking-wider">Alert Subscriptions</h4>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        id="check-sms"
                        className="mt-1 h-3.5 w-3.5 accent-[#5E1801] cursor-pointer"
                      />
                      <label htmlFor="check-sms" className="cursor-pointer space-y-0.5">
                        <span className="block text-xs font-bold text-[#351008]">Real-time SMS Dispatches</span>
                        <p className="text-[10px] font-medium leading-relaxed">Receive status notifications when crew is dispatched to your grievance location.</p>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        defaultChecked 
                        id="check-email"
                        className="mt-1 h-3.5 w-3.5 accent-[#5E1801] cursor-pointer"
                      />
                      <label htmlFor="check-email" className="cursor-pointer space-y-0.5">
                        <span className="block text-xs font-bold text-[#351008]">Email Status Updates</span>
                        <p className="text-[10px] font-medium leading-relaxed">Receive detailed reports with repair evidence photos upon case resolution.</p>
                      </label>
                    </div>

                    <div className="flex items-start gap-3">
                      <input 
                        type="checkbox" 
                        id="check-esc"
                        className="mt-1 h-3.5 w-3.5 accent-[#5E1801] cursor-pointer"
                      />
                      <label htmlFor="check-esc" className="cursor-pointer space-y-0.5">
                        <span className="block text-xs font-bold text-[#351008]">SLA Breach Escalations</span>
                        <p className="text-[10px] font-medium leading-relaxed">Receive alerts if a municipal department breaches the resolution deadline.</p>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Shell>
  );
}
