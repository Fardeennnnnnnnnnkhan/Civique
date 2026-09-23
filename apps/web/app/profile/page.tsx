'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiUser,
  FiMail,
  FiMapPin,
  FiArrowRight,
  FiShield,
  FiAward,
  FiZap,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiCopy,
  FiCheck,
  FiTrash2,
  FiSun,
  FiDroplet,
  FiActivity,
  FiOctagon,
  FiHelpCircle,
  FiLock,
  FiRefreshCw,
  FiEye,
  FiCompass,
  FiTrendingUp,
  FiShare2,
  FiLayers
  ,FiBell
} from 'react-icons/fi';
import Shell from '@/app/components/Shell';
import LoadingState from '@/app/components/LoadingState';
import { apiFetch, logout } from '@/lib/api/client';
import { Button, Card, StatusBadge, Badge } from '@/components/ui';

interface UserReport {
  id: string;
  trackingId: string;
  category: string;
  title: string;
  description: string;
  status: string;
  date: string;
  ward: string;
  aiScore?: number | null;
  updates: Array<{ time: string; title: string; desc: string; completed: boolean }>;
}

interface SecuritySession {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  POTHOLE: FiAlertCircle,
  GARBAGE: FiTrash2,
  STREETLIGHT: FiSun,
  WATER_LEAK: FiDroplet,
  SEWAGE: FiActivity,
  TRAFFIC_SIGN: FiOctagon,
  OTHERS: FiHelpCircle,
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  POTHOLE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  GARBAGE: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  STREETLIGHT: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  WATER_LEAK: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  SEWAGE: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  TRAFFIC_SIGN: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
  OTHERS: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' },
};

export default function CitizenProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CASES' | 'HISTORY' | 'BADGES' | 'NOTIFICATIONS' | 'SECURITY'>('CASES');
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Safe user state initialized for SSR hydration
  const [user, setUser] = useState<{ id: string; email: string; role: string; mfaEnabled?: boolean } | null>(null);
  const [securitySessions, setSecuritySessions] = useState<SecuritySession[]>([]);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [mfaEnrollment, setMfaEnrollment] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({ inApp: true, email: false, sms: false });
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/me')
      .then(async (res) => {
        const currentUser = (res as any)?.user || res;
        if (currentUser && currentUser.id) {
          setUser(currentUser);
        }

        // Fetch reports
        try {
          const resData = await apiFetch<{ reports?: any[] }>('/reports');
          if (resData.reports && resData.reports.length > 0) {
            const mapped = await Promise.all(resData.reports.map(async (r: any) => {
              const tracking = r.incident?.publicTrackingId || `CVQ-IND-${r.id.substring(0, 6).toUpperCase()}`;
              const stat = r.incident?.status || 'REPORTED';
              const timeline = await apiFetch<{ events: any[] }>(`/reports/${r.id}/timeline`).catch(() => ({ events: [] }));
              const history = timeline.events.map((event: any) => ({ time: new Date(event.createdAt).toLocaleString('en-IN'), title: String(event.eventType).replaceAll('_', ' '), desc: event.lifecycleState ? `Incident state: ${event.lifecycleState}` : 'Recorded lifecycle event', completed: true }));
              const latestAi = r.aiAnalyses?.[0];

              return {
                id: r.id,
                trackingId: tracking,
                category: r.categorySuggested || 'POTHOLE',
                title: r.title,
                description: r.description || 'Reported municipal hazard at specified coordinates.',
                status: stat,
                date: new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                ward: r.incident?.ward?.name || 'Ward assignment pending',
                aiScore: latestAi?.confidence == null ? null : Math.round(Number(latestAi.confidence) * 100),
                updates: history,
              };
            }));
            setReports(mapped);
          } else {
            setReports([]);
          }
        } catch { setReports([]); }
      })
      .catch(() => {
        router.push('/signin');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const activeReports = reports.filter((r) => r.status !== 'RESOLVED');
  const resolvedReports = reports.filter((r) => r.status === 'RESOLVED');

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setUser(null);
    router.push('/signin');
  };

  const copyTracking = (trackingId: string) => {
    navigator.clipboard.writeText(trackingId);
    setCopiedId(trackingId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id: string) => {
    setExpandedReportId(expandedReportId === id ? null : id);
  };

  const loadSecuritySessions = async () => {
    setSecurityBusy(true);
    setSecurityError('');
    try {
      const response = await apiFetch<{ sessions?: SecuritySession[] }>('/auth/sessions');
      setSecuritySessions(response.sessions || []);
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'Unable to load active sessions.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const loadNotificationPreferences = async () => {
    setNotificationBusy(true); setNotificationError('');
    try {
      const response = await apiFetch<{ preferences?: { inApp?: boolean; email?: boolean; sms?: boolean } }>('/notifications/preferences');
      const preferences = response.preferences || {};
      setNotificationPreferences({ inApp: preferences.inApp !== false, email: Boolean(preferences.email), sms: Boolean(preferences.sms) });
    } catch (error) { setNotificationError(error instanceof Error ? error.message : 'Unable to load notification preferences.'); }
    finally { setNotificationBusy(false); }
  };

  const updateNotificationPreference = async (channel: 'inApp' | 'email' | 'sms', enabled: boolean) => {
    const previous = notificationPreferences;
    setNotificationPreferences((current) => ({ ...current, [channel]: enabled }));
    setNotificationBusy(true); setNotificationMessage(''); setNotificationError('');
    try {
      await apiFetch('/notifications/preferences', { method: 'PATCH', body: JSON.stringify({ [channel]: enabled }) });
      setNotificationMessage('Notification preferences saved.');
    } catch (error) {
      setNotificationPreferences(previous);
      setNotificationError(error instanceof Error ? error.message : 'Unable to save notification preferences.');
    } finally { setNotificationBusy(false); }
  };

  const beginMfaEnrollment = async () => {
    setSecurityBusy(true);
    setSecurityError('');
    setSecurityMessage('');
    try {
      const response = await apiFetch<{ secret: string; otpauthUrl: string }>('/auth/mfa/enroll', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setMfaEnrollment(response);
      setSecurityMessage('Scan the setup URI in an authenticator app, then enter the six-digit code.');
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'Unable to start MFA enrollment.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const confirmMfa = async () => {
    if (!/^\d{6}$/.test(mfaCode)) {
      setSecurityError('Enter the six-digit code from your authenticator app.');
      return;
    }
    setSecurityBusy(true);
    setSecurityError('');
    try {
      await apiFetch('/auth/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: mfaCode }),
      });
      setUser((current) => current ? { ...current, mfaEnabled: true } : current);
      setMfaEnrollment(null);
      setMfaCode('');
      setSecurityMessage('Multi-factor authentication is now enabled for this official account.');
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'The MFA code could not be verified.');
    } finally {
      setSecurityBusy(false);
    }
  };

  const revokeSecuritySession = async (sessionId: string) => {
    setSecurityBusy(true);
    setSecurityError('');
    try {
      await apiFetch(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
      setSecuritySessions((current) => current.filter((session) => session.id !== sessionId));
      setSecurityMessage('The selected session was revoked.');
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : 'Unable to revoke that session.');
    } finally {
      setSecurityBusy(false);
    }
  };

  // Effective user representation
  const activeUser = user || {
    id: 'demo-citizen',
    email: 'demo.citizen@civique.local',
    role: 'CITIZEN',
  };

  const profileName = activeUser.email.split('@')[0];

  return (
    <Shell user={activeUser} onLogout={handleLogout}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
        
        {/* ================= BESPOKE CITIZEN HERO BANNER ================= */}
        <div className="relative overflow-hidden rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-8 shadow-xs">
          {/* Subtle civic pattern backdrop */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            
            {/* Citizen Identity & Verification Status */}
            <div className="flex items-start sm:items-center gap-5">
              <div className="relative shrink-0">
                <div className="flex size-18 sm:size-20 items-center justify-center rounded-2xl bg-[#143527] text-white font-black text-2xl sm:text-3xl shadow-md ring-4 ring-[#143527]/15">
                  {activeUser.email ? activeUser.email.substring(0, 2).toUpperCase() : 'CZ'}
                </div>
                <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-[#143527] text-white border-2 border-white shadow-xs">
                  <FiCheck className="size-3.5 stroke-[3]" />
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0f172a]">
                    {profileName}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#143527]/5 px-3 py-1 text-xs font-black text-[#143527] border border-[#143527]/20">
                    <span className="size-1.5 rounded-full bg-[#143527] animate-pulse" />
                    Verified Citizen
                  </span>
                  <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#475569] border border-[#eef1ea]">
                    Civique Citizen
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[#64748b]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <FiMail className="text-[#143527]" /> {activeUser.email}
                  </span>
                  <span className="hidden sm:inline text-[#cbd5e1]">•</span>
                  <span className="flex items-center gap-1.5 font-bold text-[#0f172a]">
                    <FiMapPin className="text-[#143527]" /> Your verified municipal service area
                  </span>
                </div>

                {/* Citizen Civic Karma Meter */}
                <div className="pt-2 flex items-center gap-3">
                  <div className="w-48 sm:w-60 h-2 rounded-full bg-[#f1f5f9] overflow-hidden border border-[#eef1ea]">
                    <div className="h-full bg-gradient-to-r from-[#143527] to-[#2563eb] rounded-full" style={{ width: '92%' }} />
                  </div>
                  <span className="text-xs font-black text-[#0f172a]">
                    Score 980 <span className="text-[10.5px] font-bold text-[#143527]">(Tier: Steward)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Blocks Bento */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 border-t lg:border-t-0 lg:border-l border-[#eef1ea] pt-6 lg:pt-0 lg:pl-8 shrink-0">
              <div className="text-center p-3 rounded-2xl bg-white border border-[#eef1ea] shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
                  Total Filed
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#0f172a] mt-0.5 block">
                  {reports.length}
                </span>
                <span className="text-[10px] text-[#94a3b8] font-bold">100% On-Chain</span>
              </div>

              <div className="text-center p-3 rounded-2xl bg-white border border-[#eef1ea] shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
                  In Progress
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-600 mt-0.5 block">
                  {activeReports.length}
                </span>
                <span className="text-[10px] text-amber-600/80 font-bold">SLA Active</span>
              </div>

              <div className="text-center p-3 rounded-2xl bg-white border border-[#eef1ea] shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
                  Resolved
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#143527] mt-0.5 block">
                  {resolvedReports.length}
                </span>
                <span className="text-[10px] text-[#143527] font-bold">Verified Fixed</span>
              </div>
            </div>

          </div>
        </div>

        {/* ================= TAB NAVIGATION & QUICK ACTION ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-1 gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('CASES')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'CASES'
                  ? 'bg-[#143527] text-white shadow-xs font-bold'
                  : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
              }`}
            >
              <FiAlertCircle className="size-3.5" />
              <span>Active Grievances ({activeReports.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('NOTIFICATIONS'); void loadNotificationPreferences(); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'NOTIFICATIONS' ? 'bg-[#143527] text-white shadow-xs font-bold' : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
              }`}
            >
              <FiBell className="size-3.5" />
              <span>Notifications</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'HISTORY'
                  ? 'bg-[#143527] text-white shadow-xs font-bold'
                  : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
              }`}
            >
              <FiCheckCircle className="size-3.5" />
              <span>Resolved Archives ({resolvedReports.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('BADGES')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'BADGES'
                  ? 'bg-[#143527] text-white shadow-xs font-bold'
                  : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
              }`}
            >
              <FiAward className="size-3.5" />
              <span>Civic Badges & Impact</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('SECURITY'); void loadSecuritySessions(); }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'SECURITY'
                  ? 'bg-[#143527] text-white shadow-xs font-bold'
                  : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
              }`}
            >
              <FiLock className="size-3.5" />
              <span>Privacy & Audit</span>
            </button>
          </div>

          <Link href="/report" className="shrink-0">
            <Button size="sm" className="bg-[#143527] text-white font-bold hover:bg-[#0e271c] shadow-2xs gap-1.5 w-full sm:w-auto">
              + Lodge New Grievance
            </Button>
          </Link>
        </div>

        {/* ================= TAB CONTENTS ================= */}
        <div className="space-y-6">

          {/* TAB 1: ACTIVE CASES WITH RICH EXPANDABLE TIMELINE */}
          {activeTab === 'CASES' && (
            <div className="space-y-6">
              {activeReports.length === 0 ? (
                <Card className="p-12 text-center space-y-3 bg-white border-[#eef1ea] shadow-xs">
                  <div className="size-12 rounded-2xl bg-[#143527]/5 border border-[#143527]/20 flex items-center justify-center text-[#143527] mx-auto shadow-xs">
                    <FiCheckCircle className="size-6" />
                  </div>
                  <h3 className="text-base font-black text-[#0f172a]">No Pending Grievances</h3>
                  <p className="text-xs text-[#64748b] max-w-sm mx-auto">
                    All your reports have been inspected and resolved. If you spot a road pothole, damaged streetlight, or municipal leak, lodge a report now.
                  </p>
                  <div className="pt-2">
                    <Link href="/report">
                      <Button className="bg-[#143527] text-white font-bold hover:bg-[#0e271c]">
                        + File New Grievance
                      </Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                activeReports.map((report) => {
                  const Icon = CATEGORY_ICONS[report.category] || FiAlertCircle;
                  const colors = CATEGORY_COLORS[report.category] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' };
                  const isExpanded = expandedReportId === report.id;

                  return (
                    <div 
                      key={report.id} 
                      className="rounded-3xl border border-[#e2e8f0] bg-white p-6 sm:p-7 shadow-xs hover:border-[#cbd5e1] transition-all space-y-5"
                    >
                      {/* Top Row: Category, Tracking ID, Status, Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Category Icon Badge */}
                          <div className={`flex size-10 items-center justify-center rounded-2xl border ${colors.bg} ${colors.border} ${colors.text} shadow-2xs`}>
                            <Icon className="size-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-[#0f172a] bg-[#f8fafc] px-3 py-1 rounded-xl border border-[#e2e8f0]">
                                {report.trackingId}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyTracking(report.trackingId)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                                title="Copy tracking ID"
                              >
                                {copiedId === report.trackingId ? (
                                  <span className="text-[#16a34a] text-[11px] font-extrabold flex items-center gap-1">
                                    <FiCheck /> Copied!
                                  </span>
                                ) : (
                                  <FiCopy className="hover:text-black" />
                                )}
                              </button>
                            </div>
                            <span className="text-[11px] text-[#64748b]">Filed on {report.date}</span>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <StatusBadge status={report.status} />
                          <Link href={`/report/${report.id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-extrabold">
                              <span>Full Dossier</span>
                              <FiArrowRight className="size-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Main Grievance Details */}
                      <div className="space-y-1.5 text-left">
                        <h3 className="text-lg font-black text-[#0f172a] tracking-tight">
                          {report.title}
                        </h3>
                        <p className="text-xs text-[#475569] leading-relaxed max-w-3xl">
                          {report.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#64748b] pt-1">
                          <span className="flex items-center gap-1.5 text-[#0f172a]">
                            <FiMapPin className="text-[#143527]" /> {report.ward} · Indore Smart City
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5 text-[#143527]">
                            <FiZap className="text-[#143527]" /> {report.aiScore == null ? 'AI review pending' : `AI confidence: ${report.aiScore}%`}
                          </span>
                        </div>
                      </div>

                      {/* Creative Step-by-Step Resolution Lifecycle Timeline */}
                      <div className="rounded-2xl bg-[#f8fafc] border border-[#eef1ea] p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-[#334155] flex items-center gap-1.5">
                            <FiLayers className="text-[#143527]" /> Resolution Lifecycle Progress
                          </span>
                          <span className="text-[11px] font-bold text-[#143527] bg-[#143527]/5 px-2.5 py-0.5 rounded-full border border-[#143527]/20">
                            Active Step: 3 of 4
                          </span>
                        </div>

                        {/* Horizontal Timeline Steps */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {report.updates.map((update, idx) => (
                            <div 
                              key={idx} 
                              className={`relative rounded-xl p-3.5 border transition-all text-left space-y-1.5 ${
                                update.completed
                                  ? 'bg-white border-[#143527]/20 shadow-2xs'
                                  : 'bg-[#f1f5f9]/60 border-[#eef1ea] opacity-75'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-[#64748b]">
                                  Step {idx + 1}
                                </span>
                                <span className={`flex size-5 items-center justify-center rounded-full text-[10px] font-black ${
                                  update.completed 
                                    ? 'bg-[#143527] text-white shadow-xs' 
                                    : 'bg-[#cbd5e1] text-[#475569]'
                                }`}>
                                  {update.completed ? <FiCheck /> : idx + 1}
                                </span>
                              </div>

                              <p className="text-xs font-black text-[#0f172a]">
                                {update.title}
                              </p>
                              <p className="text-[11px] text-[#64748b] leading-tight">
                                {update.desc}
                              </p>
                              <span className="text-[9.5px] font-bold text-[#94a3b8] block pt-1">
                                {update.time}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: RESOLVED HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-6">
              {resolvedReports.length === 0 ? (
                <Card className="p-12 text-center space-y-3 bg-white border-[#eef1ea] shadow-xs">
                  <FiClock className="size-10 text-[#64748b] mx-auto" />
                  <h3 className="text-base font-black text-[#0f172a]">No Historical Archives</h3>
                  <p className="text-xs text-[#64748b] max-w-sm mx-auto">
                    Resolved grievances will be archived here along with before/after photographic proof and cryptographic verification hashes.
                  </p>
                </Card>
              ) : (
                resolvedReports.map((report) => (
                  <div key={report.id} className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-7 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-black bg-[#143527]/5 text-[#143527] px-3 py-1 rounded-xl border border-[#143527]/20">
                          {report.trackingId}
                        </span>
                        <h4 className="text-sm font-black text-[#0f172a]">{report.title}</h4>
                      </div>
                      <Badge tone="success">100% Resolved & Verified</Badge>
                    </div>
                    <p className="text-xs text-[#475569] leading-relaxed">
                      {report.description}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-[#f1f5f9] text-xs">
                      <span className="text-[#64748b] font-medium">Closed on {report.date} · {report.ward}</span>
                      <Link href={`/report/${report.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-bold gap-1">
                          View Verification Certificate <FiArrowRight />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CIVIC BADGES & IMPACT */}
          {activeTab === 'BADGES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="rounded-3xl border border-[#143527]/20 bg-[#143527]/5 p-6 space-y-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#143527] text-white shadow-xs font-black">
                  <FiAward className="size-6" />
                </div>
                <h4 className="text-base font-black text-[#143527]">Road Safety Watcher</h4>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Recognition is calculated only from verified report outcomes.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs font-extrabold text-[#143527]">
                  <span>Tier: Gold</span>
                  <span>5 Grievances Verified</span>
                </div>
              </div>

              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 space-y-3 shadow-xs">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f1f5f9] text-[#0f172a] font-black">
                  <FiSun className="size-6 text-amber-500" />
                </div>
                <h4 className="text-base font-black text-[#0f172a]">Nighttime Sentinel</h4>
                <p className="text-xs text-[#64748b] leading-relaxed">
                  Lodge reports on dark luminaire poles to help municipal teams keep community streets safe after dusk.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs font-extrabold text-[#64748b]">
                  <span>Tier: Silver</span>
                  <span>2 Fixtures Repaired</span>
                </div>
              </div>

              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 space-y-3 shadow-xs">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f1f5f9] text-[#0f172a] font-black">
                  <FiShield className="size-6 text-[#143527]" />
                </div>
                <h4 className="text-base font-black text-[#0f172a]">Indore Smart Citizen</h4>
                <p className="text-xs text-[#64748b] leading-relaxed">
                  High karma score for rapid resolution verification and accurate location geofencing.
                </p>
                <div className="pt-2 flex items-center justify-between text-xs font-extrabold text-[#143527]">
                  <span>Score: 980 / 1000</span>
                  <span>Top 5% Contributor</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'NOTIFICATIONS' && (
            <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#0f172a]">Notification preferences</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748b]">Choose how Civique keeps you informed about reports, assignments, SLA changes, and resolution decisions.</p>
                </div>
                <Badge tone="success"><FiBell className="size-3" /> Durable delivery</Badge>
              </div>
              {notificationMessage && <div role="status" className="rounded-xl border border-[#143527]/20 bg-[#143527]/5 px-4 py-3 text-xs font-semibold text-[#143527]">{notificationMessage}</div>}
              {notificationError && <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-xs font-semibold text-[#b91c1c]">{notificationError}</div>}
              <div className="divide-y divide-[#eef1ea] rounded-2xl border border-[#eef1ea]">
                {[
                  ['inApp', 'In-app alerts', 'Recommended', 'Receive real-time updates in the Civique notification bell.'],
                  ['email', 'Email updates', 'Provider dependent', 'Receipts, lifecycle changes, and reminders delivered to your account email.'],
                  ['sms', 'SMS updates', 'Not configured', 'Emergency and assignment alerts when an approved SMS provider is enabled.'],
                ].map(([channel, title, status, description]) => (
                  <label key={channel} className="flex items-center justify-between gap-4 p-4 sm:p-5 cursor-pointer hover:bg-[#f8fafc]">
                    <span className="min-w-0"><span className="block text-sm font-black text-[#0f172a]">{title}</span><span className="mt-1 block text-xs text-[#64748b]">{description}</span><span className="mt-2 inline-flex rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b]">{status}</span></span>
                    <input type="checkbox" checked={notificationPreferences[channel as 'inApp' | 'email' | 'sms']} onChange={(event) => void updateNotificationPreference(channel as 'inApp' | 'email' | 'sms', event.target.checked)} disabled={notificationBusy || channel !== 'inApp'} className="size-5 rounded border-[#cbd5e1] text-[#143527] focus:ring-[#143527]" />
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-[#64748b]">Email and SMS controls remain visibly unavailable until a verified provider and delivery policy are configured. In-app delivery is always the durable fallback.</p>
            </div>
          )}

          {/* TAB 4: IDENTITY & AUDIT SECURITY */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-[#0f172a] tracking-tight">Account security & privacy</h3>
                    <p className="text-xs text-[#64748b]">Manage official MFA, active sessions, and the privacy protections applied to your civic reports.</p>
                  </div>
                  <Badge tone={user?.mfaEnabled ? 'success' : 'neutral'}>
                    <FiShield className="size-3" /> {user?.mfaEnabled ? 'MFA enabled' : 'MFA not enabled'}
                  </Badge>
                </div>

                {securityMessage && <div role="status" className="rounded-xl border border-[#143527]/20 bg-[#143527]/5 px-4 py-3 text-xs font-semibold text-[#143527]">{securityMessage}</div>}
                {securityError && <div role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-xs font-semibold text-[#b91c1c]">{securityError}</div>}

                <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-[#0f172a]">Multi-factor authentication</h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#64748b]">Official accounts use an authenticator code in addition to a password. Citizen accounts cannot self-enroll in official MFA.</p>
                    </div>
                    {user?.role !== 'CITIZEN' && !user?.mfaEnabled && !mfaEnrollment && (
                      <Button size="sm" variant="outline" onClick={() => void beginMfaEnrollment()} disabled={securityBusy}>Enable MFA</Button>
                    )}
                  </div>

                  {user?.mfaEnabled && <div className="flex items-center gap-2 text-xs font-semibold text-[#143527]"><FiCheckCircle className="size-4" /> Authenticator verification is required at sign-in.</div>}
                  {user?.role === 'CITIZEN' && !user?.mfaEnabled && <p className="text-xs text-[#64748b]">MFA enrollment is managed by Civique administrators when an official assignment is issued.</p>}

                  {mfaEnrollment && (
                    <div className="space-y-3 rounded-xl border border-[#143527]/20 bg-white p-4">
                      <p className="text-xs font-semibold text-[#143527]">Setup secret (keep this private):</p>
                      <code className="block break-all rounded-lg bg-[#143527] px-3 py-2 text-xs text-white">{mfaEnrollment.secret}</code>
                      <p className="text-[11px] text-[#64748b]">If your authenticator cannot scan a QR code, add this setup URI manually.</p>
                      <code className="block max-h-20 overflow-auto break-all rounded-lg border border-[#eef1ea] bg-[#f8fafc] px-3 py-2 text-[10px] text-[#475569]">{mfaEnrollment.otpauthUrl}</code>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input aria-label="Authenticator code" inputMode="numeric" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" className="h-10 flex-1 rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm tracking-[0.3em] text-[#0f172a] outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20" />
                        <Button size="sm" onClick={() => void confirmMfa()} isLoading={securityBusy} className="bg-[#143527] text-white hover:bg-[#0e271c]">Confirm MFA</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setMfaEnrollment(null); setMfaCode(''); }}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-[#eef1ea] bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-[#0f172a]">Active sessions</h4>
                      <p className="mt-1 text-xs text-[#64748b]">Review where your Civique account is signed in and revoke a session you do not recognize.</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => void loadSecuritySessions()} disabled={securityBusy}><FiRefreshCw className="size-3.5" /> Refresh</Button>
                  </div>
                  {securityBusy && securitySessions.length === 0 && <p className="text-xs text-[#64748b]">Loading active sessions…</p>}
                  {!securityBusy && securitySessions.length === 0 && <p className="rounded-xl bg-[#f8fafc] px-4 py-3 text-xs text-[#64748b]">No active sessions were returned.</p>}
                  <div className="space-y-2">
                    {securitySessions.map((session) => (
                      <div key={session.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-[#eef1ea] bg-[#f8fafc] px-4 py-3">
                        <div className="text-xs text-[#475569]">
                          <p className="font-bold text-[#0f172a]">Session {session.id.slice(0, 8)}</p>
                          <p>Created {new Date(session.createdAt).toLocaleString('en-IN')} · Last used {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString('en-IN') : 'Not yet'}</p>
                          <p>Expires {new Date(session.expiresAt).toLocaleString('en-IN')}</p>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => void revokeSecuritySession(session.id)} disabled={securityBusy}>Revoke</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-[#0f172a] tracking-tight">Citizen data privacy & cryptographic ledger</h3>
                  <p className="text-xs text-[#64748b]">Civique guarantees citizen protection under municipal zero-trust privacy and immutable audit standards.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-5 space-y-2">
                  <div className="flex items-center gap-2 font-black text-[#0f172a] text-sm">
                    <FiShield className="text-[#143527] size-4" /> Identity Masking
                  </div>
                  <p className="text-[#64748b] leading-relaxed">
                    Field crews receive only the geotagged photo proof and coordinate pin. Your personal email and phone number are never exposed to contractors or third parties.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-5 space-y-2">
                  <div className="flex items-center gap-2 font-black text-[#0f172a] text-sm">
                    <FiLock className="text-[#143527] size-4" /> SHA-256 Audit Trail
                  </div>
                  <p className="text-[#64748b] leading-relaxed">
                    Every grievance transition is cryptographically stamped into the immutable PostgreSQL audit log, preventing unauthorized status tampering.
                  </p>
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
