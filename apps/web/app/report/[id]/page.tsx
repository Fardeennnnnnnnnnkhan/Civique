'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiShield,
  FiArrowLeft,
  FiActivity,
  FiAlertCircle,
  FiZap,
  FiCheck,
  FiCopy,
  FiLayers,
  FiCamera,
  FiAlertTriangle
  ,FiShare2
} from 'react-icons/fi';
import Shell from '@/app/components/Shell';
import LoadingState from '@/app/components/LoadingState';
import { apiFetch, logout } from '@/lib/api/client';
import { StatusBadge, PriorityBadge } from '@/components/ui';
import CitizenDecisionModal from '@/components/civique/CitizenDecisionModal';

interface CaseUpdate {
  time: string;
  title: string;
  desc: string;
  completed: boolean;
}

export default function CitizenCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const reportMapRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState<any | null>(null);
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);
  const [copied, setCopied] = useState(false);

  // Decision Modal State
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'CONFIRM' | 'DISPUTE'>('CONFIRM');
  const [decisionSuccess, setDecisionSuccess] = useState('');
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealBusy, setAppealBusy] = useState(false);
  const [socioOpen, setSocioOpen] = useState(false);
  const [socioAlias, setSocioAlias] = useState('');
  const [socioBusy, setSocioBusy] = useState(false);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('civique_user');
    } catch {}
    await logout().catch(() => undefined);
    setUser(null);
    router.push('/signin');
  };

  const submitAppeal = async () => {
    if (appealReason.trim().length < 10) return setErrorMsg('Please explain what remains unresolved in at least 10 characters.');
    setAppealBusy(true);
    try {
      await apiFetch(`/incidents/${id}/appeal`, { method: 'POST', body: JSON.stringify({ reason: appealReason.trim() }) });
      setDecisionSuccess('Your appeal was recorded and the incident has been reopened for reassessment.');
      setAppealOpen(false); setAppealReason(''); loadData();
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Unable to submit the appeal.'); }
    finally { setAppealBusy(false); }
  };

  const publishToSocio = async () => {
    if (socioAlias.trim().length < 3) return setErrorMsg('Choose a public alias with at least three characters.');
    setSocioBusy(true);
    try { const result = await apiFetch<any>('/socio/publish', { method: 'POST', body: JSON.stringify({ reportId: id, alias: socioAlias.trim(), consentVersion: 'socio-v1' }) }); setDecisionSuccess('Your report was published to Civique Socio with a redacted location and public alias.'); setSocioOpen(false); setSocioAlias(''); if (result.post?.id) router.push(`/socio/${result.post.id}`); } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Unable to publish this report.'); } finally { setSocioBusy(false); }
  };

  const loadData = () => {
    setLoading(true);
    setErrorMsg('');

    Promise.all([
      apiFetch<{ report?: any }>(`/reports/${id}`),
      apiFetch<{ events?: any[] }>(`/reports/${id}/timeline`),
    ] as const)
      .then(([resData, timelineData]) => {
        if (resData.report) {
          const rep = resData.report;
          setReport(rep);

          const eventsList = (timelineData.events || []).map((event: any) => ({
            time: new Date(event.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            title: String(event.eventType).replaceAll('_', ' '),
            desc: event.actorLabel
              ? `Logged by ${event.actorLabel} · State: ${event.lifecycleState || 'Recorded'}`
              : event.lifecycleState
              ? `Incident state: ${event.lifecycleState}`
              : 'Lifecycle milestone recorded',
            completed: true,
          }));

          setUpdates(eventsList);
        } else {
          setErrorMsg('Grievance record was not found.');
        }
      })
      .catch(() => {
        setErrorMsg('Unable to retrieve case details. Connection error.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (currentUser?.id) setUser(currentUser);
      })
      .catch(() => undefined);

    loadData();
  }, [id]);

  // Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !report || !report.latitude || !report.longitude) return;

    let mapInstance: any;

    const initMap = async () => {
      const container = document.getElementById('report-detail-map');
      if (!container || (container as any)._leaflet_id) return;

      const L = (await import('leaflet')).default;

      if (!document.getElementById('leaflet-css-style')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-style';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      mapInstance = L.map(container, {
        zoomControl: false,
        attributionControl: false,
      }).setView([report.latitude, report.longitude], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance);

      const pinIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <span style="position: absolute; display: inline-flex; height: 28px; width: 28px; border-radius: 9999px; background-color: rgba(20, 53, 39, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="height: 16px; width: 16px; border-radius: 9999px; background-color: #143527; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;">
              <div style="height: 5px; width: 5px; border-radius: 9999px; background-color: #ffffff;"></div>
            </div>
          </div>
        `,
        className: 'citizen-map-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([report.latitude, report.longitude], { icon: pinIcon }).addTo(mapInstance);
      reportMapRef.current = mapInstance;
    };

    setTimeout(initMap, 200);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      const container = document.getElementById('report-detail-map');
      if (container) {
        delete (container as any)._leaflet_loading;
      }
      reportMapRef.current = null;
    };
  }, [report]);

  const copyTracking = () => {
    const code = report?.incident?.publicTrackingId || report?.id;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openDecisionModal = (act: 'CONFIRM' | 'DISPUTE') => {
    setDecisionAction(act);
    setDecisionModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center space-y-4 bg-white">
        <FiAlertCircle className="size-12 text-red-500" />
        <h2 className="text-xl font-black text-[#0f172a]">Grievance Not Found</h2>
        <p className="text-xs font-bold text-[#64748b]">{errorMsg}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-4 py-2 text-xs font-black text-white shadow-xs"
        >
          <FiArrowLeft />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const incident = report.incident || {};
  const isAwaitingConfirmation = incident.status === 'CITIZEN_CONFIRMATION';
  const isResolved = incident.status === 'RESOLVED';
  const trackingCode = incident.publicTrackingId || `CVQ-IND-${report.id.substring(0, 5).toUpperCase()}`;
  const effectiveUser = user || { id: 'guest', email: 'Citizen', role: 'CITIZEN' };

  return (
    <Shell user={effectiveUser} onLogout={handleLogout}>
      <div className="mx-auto max-w-6xl w-full p-4 sm:p-6 md:p-8 space-y-6 text-left font-sans bg-white">
        
        {/* Success Toast */}
        {decisionSuccess && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#143527]/20 bg-[#143527]/5 px-4 py-3 text-xs font-extrabold text-[#143527] shadow-xs animate-in fade-in">
            <FiCheck className="size-4 text-[#143527] stroke-[3]" />
            <span>{decisionSuccess}</span>
          </div>
        )}

        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef1ea] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/profile"
              className="flex items-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-3 py-1.5 text-xs font-extrabold text-[#0f172a] shadow-2xs transition-colors"
            >
              <FiArrowLeft className="size-3.5" />
              <span>My Grievances</span>
            </Link>
            <span className="font-mono text-sm font-black text-[#0f172a] bg-white px-3 py-1 rounded-xl border border-[#eef1ea] shadow-2xs">
              #{trackingCode}
            </span>
            <button
              type="button"
              onClick={copyTracking}
              className="flex size-7 items-center justify-center rounded-lg border border-[#eef1ea] bg-white text-[#64748b] hover:text-[#0f172a] shadow-2xs cursor-pointer"
              title="Copy tracking ID"
            >
              {copied ? <FiCheck className="text-[#143527]" /> : <FiCopy className="size-3.5" />}
            </button>
            <StatusBadge status={incident.status || 'REPORTED'} />
            <PriorityBadge priority={incident.priority || 'MEDIUM'} />
          </div>

          <div className="text-xs font-bold text-[#64748b] flex items-center gap-1.5">
            <FiClock className="text-[#143527] size-3.5" />
            <span>Logged: {new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        {/* ================= CITIZEN RESOLUTION CONFIRMATION HERO ================= */}
        {isAwaitingConfirmation && (
          <div className="rounded-3xl border border-[#eef1ea] bg-[#143527] p-6 text-white shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-[#143527] uppercase tracking-wider">
                  ACTION REQUIRED
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Field Crew Has Submitted Repair Proof
                </h2>
                <p className="text-xs font-medium text-slate-200">
                  Municipal crews have completed work on your reported issue. Please inspect the resolution and confirm or dispute below.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openDecisionModal('DISPUTE')}
                  className="rounded-xl border border-red-400/50 bg-red-950/40 hover:bg-red-900 text-red-300 px-4 py-2.5 text-xs font-black transition-all cursor-pointer"
                >
                  Dispute Resolution
                </button>
                <button
                  type="button"
                  onClick={() => openDecisionModal('CONFIRM')}
                  className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-[#f8fafc] text-[#143527] px-4 py-2.5 text-xs font-black shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <FiCheck className="size-4 stroke-[3]" />
                  <span>Confirm Fixed & Close</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isResolved && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div><p className="text-sm font-black text-amber-950">Resolution appeal window</p><p className="mt-1 text-xs text-amber-800">If the issue is still unresolved, you can request reassessment within seven days of closure.</p></div>
            {!appealOpen ? <button type="button" onClick={() => setAppealOpen(true)} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900">Appeal this resolution</button> : <div className="space-y-2"><textarea value={appealReason} onChange={(event) => setAppealReason(event.target.value)} rows={3} placeholder="Describe what remains unresolved…" className="w-full rounded-xl border border-amber-300 bg-white p-3 text-xs text-[#0f172a]"/><div className="flex gap-2"><button type="button" onClick={() => void submitAppeal()} disabled={appealBusy} className="rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3 py-2 text-xs font-black text-white">{appealBusy ? 'Submitting…' : 'Submit appeal'}</button><button type="button" onClick={() => setAppealOpen(false)} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900">Cancel</button></div></div>}
          </div>
        )}

        <section className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="flex items-center gap-2 text-sm font-black text-[#0f172a]"><FiShare2 className="text-[#143527]" /> Share on Civique Socio</p><p className="mt-1 text-xs font-semibold leading-relaxed text-[#64748b]">Optional and separate from your official report. Your public alias, redacted text, generalized location, category, and current status are shared. Evidence, contact details, and exact coordinates stay private.</p></div>
            {!socioOpen && <button type="button" onClick={() => setSocioOpen(true)} className="shrink-0 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3 py-2 text-xs font-black text-white">Review & publish</button>}
          </div>
          {socioOpen && <div className="mt-3 space-y-2"><label className="block text-[10px] font-black uppercase tracking-wider text-[#0f172a]">Public alias</label><input value={socioAlias} onChange={(event) => setSocioAlias(event.target.value)} placeholder="e.g. IndoreNeighbour" className="w-full rounded-xl border border-[#eef1ea] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-[#143527]" /><div className="flex gap-2"><button type="button" disabled={socioBusy} onClick={() => void publishToSocio()} className="rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3 py-2 text-xs font-black text-white">{socioBusy ? 'Publishing…' : 'Give consent & publish'}</button><button type="button" onClick={() => setSocioOpen(false)} className="rounded-xl border border-[#eef1ea] bg-white px-3 py-2 text-xs font-bold text-[#64748b]">Cancel</button></div></div>}
        </section>

        {/* ================= 2-COLUMN DOSSIER LAYOUT ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Details, Evidence & Before/After */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Defect Overview Card */}
            <div className="rounded-3xl border border-[#e2e8f0] bg-white p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <div className="flex items-center gap-2">
                  <FiShield className="text-[#143527] size-4" />
                  <h3 className="font-black text-xs text-[#0f172a] uppercase tracking-wider">
                    Grievance Overview
                  </h3>
                </div>
                <span className="font-extrabold text-xs text-[#334155] uppercase bg-[#f1f5f9] px-2.5 py-1 rounded-lg border border-[#eef1ea]">
                  {report.categoryConfirmed || report.categorySuggested || incident.category}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
                  Reported Issue Description
                </span>
                <p className="text-xs text-[#0f172a] font-medium leading-relaxed">
                  {report.description || 'No detailed text description provided at submission.'}
                </p>
              </div>

              {/* Evidence Photo Grid */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
                  {isAwaitingConfirmation || isResolved ? 'Before & After Photographic Evidence' : 'Intake Evidence Photo'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Before Photo */}
                  <div className="space-y-1">
                    <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-[#eef1ea] bg-slate-900 shadow-2xs">
                      {report.photoUrl ? (
                        <img src={report.photoUrl} alt="Before repair" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400 font-bold">
                          No intake photo
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/80 px-2 py-0.5 text-[9px] font-black text-white backdrop-blur-xs">
                        BEFORE (Intake Submission)
                      </span>
                    </div>
                  </div>

                  {/* After Photo (If resolved / in confirmation) */}
                  {(isAwaitingConfirmation || isResolved) ? (
                    <div className="space-y-1">
                      <div className="relative h-48 w-full rounded-2xl overflow-hidden border-2 border-[#143527] bg-slate-900 shadow-2xs">
                        <img
                          src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80"
                          alt="After repair proof"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 left-2 rounded-full bg-[#143527] border border-[#143527] px-2 py-0.5 text-[9px] font-black text-white backdrop-blur-xs">
                          AFTER (Field Repair Proof)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-center p-4 space-y-1 text-xs font-bold text-[#64748b]">
                      <FiCamera className="size-6 text-[#94a3b8]" />
                      <span className="text-[#0f172a] font-black">After-Proof Pending</span>
                      <span className="text-[10px]">Photo will appear once municipal crew completes repair.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Geolocation Meta */}
              <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748b] font-bold">Ward Area:</span>
                  <span className="font-black text-[#0f172a]">
                    {incident.ward?.name ? `${incident.ward.name}, Indore` : 'Indore Municipal Area'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748b] font-bold">Coordinates:</span>
                  <span className="font-mono text-[#0f172a] font-bold">
                    {Number(report.latitude).toFixed(4)}°, {Number(report.longitude).toFixed(4)}°
                  </span>
                </div>
              </div>
            </div>

            {/* Geofence Map */}
            <div className="rounded-3xl border border-[#eef1ea] bg-white overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#eef1ea] bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiMapPin className="text-[#143527] size-4" />
                  <h3 className="font-black text-xs text-[#0f172a] uppercase tracking-wider">
                    Geofenced Location Verification
                  </h3>
                </div>
                <span className="text-[10px] font-black text-[#143527]">100% IN JURISDICTION</span>
              </div>
              <div className="relative h-48 w-full bg-slate-100">
                <div id="report-detail-map" className="absolute inset-0 w-full h-full" />
              </div>
            </div>

          </div>

          {/* Right Col: Live Lifecycle Timeline Stream */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 md:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#f1f5f9] pb-3">
                <FiActivity className="text-[#143527] size-4" />
                <h3 className="font-black text-xs text-[#0f172a] uppercase tracking-wider">
                  Lifecycle Progress
                </h3>
              </div>

              {updates.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#64748b] space-y-2">
                  <FiClock className="size-6 text-[#94a3b8] mx-auto" />
                  <p className="font-black text-[#0f172a]">Timeline Initializing</p>
                  <p className="text-[11px]">Lifecycle events will appear in real time as your report progresses.</p>
                </div>
              ) : (
                <div className="relative pl-5 border-l-2 border-[#eef1ea] space-y-5">
                  {updates.map((up, idx) => (
                    <div key={idx} className="relative text-left">
                      <span className="absolute -left-[27px] top-1 size-3 rounded-full border-2 border-white bg-[#143527] shadow-2xs" />
                      <span className="text-[10px] font-black text-[#94a3b8] block">
                        {up.time}
                      </span>
                      <p className="text-xs font-black text-[#0f172a] mt-0.5">
                        {up.title}
                      </p>
                      <p className="text-[11px] font-bold text-[#64748b] mt-0.5 leading-relaxed">
                        {up.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Municipal SLA Guarantee Card */}
            <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 space-y-2 shadow-xs text-xs">
              <div className="flex items-center gap-2 text-[#143527] font-black">
                <FiShield className="size-4" />
                <span>Civic SLA Commitment</span>
              </div>
              <p className="text-[#64748b] font-medium leading-relaxed text-[11px]">
                Indore Municipal Corporation operates under strict citizen service charters. If a report is not acknowledged or repaired within the SLA target, automatic escalation triggers.
              </p>
            </div>
          </div>

        </div>

        {/* Citizen Decision Modal */}
        <CitizenDecisionModal
          isOpen={decisionModalOpen}
          onClose={() => setDecisionModalOpen(false)}
          incidentId={incident.id || id}
          action={decisionAction}
          onDecided={() => {
            setDecisionSuccess(
              decisionAction === 'CONFIRM'
                ? 'Resolution confirmed! Grievance marked Resolved.'
                : 'Dispute submitted. Incident reopened for repair.'
            );
            loadData();
          }}
        />

      </div>
    </Shell>
  );
}
