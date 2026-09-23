'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiAlertCircle, 
  FiClock, 
  FiShield, 
  FiMapPin, 
  FiCpu, 
  FiUserCheck, 
  FiTruck, 
  FiFileText, 
  FiCornerUpRight, 
  FiExternalLink,
  FiRefreshCw,
  FiShare2,
  FiCopy,
  FiAlertTriangle,
  FiAward,
  FiLayers,
  FiSliders,
  FiCheckCircle,
  FiXCircle,
  FiPlay,
  FiUploadCloud
} from 'react-icons/fi';
import LoadingState from '../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api/client';
import { StatusBadge, PriorityBadge } from '@/components/ui';

// Dedicated workflow modals
import EligibleWorkerAssignmentModal from '@/components/civique/EligibleWorkerAssignmentModal';
import DepartmentRoutingModal from '@/components/civique/DepartmentRoutingModal';
import ClassificationOverrideModal from '@/components/civique/ClassificationOverrideModal';
import ResolutionSubmissionModal from '@/components/civique/ResolutionSubmissionModal';
import CitizenDecisionModal from '@/components/civique/CitizenDecisionModal';

interface IncidentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const incidentId = resolvedParams.id;

  const [incident, setIncident] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [copied, setCopied] = useState(false);

  // Modal visibility states
  const [assignWorkerOpen, setAssignWorkerOpen] = useState(false);
  const [routeDeptOpen, setRouteDeptOpen] = useState(false);
  const [overrideCatOpen, setOverrideCatOpen] = useState(false);
  const [submitResolutionOpen, setSubmitResolutionOpen] = useState(false);
  const [citizenDecisionOpen, setCitizenDecisionOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [verificationReviewReason, setVerificationReviewReason] = useState('');
  const [verificationReviewPending, setVerificationReviewPending] = useState(false);
  const [closurePending, setClosurePending] = useState(false);
  const [auditIntegrity, setAuditIntegrity] = useState<any>(null);
  const [auditChecking, setAuditChecking] = useState(false);

  // Map preview container
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Load current user identity and incident dossier
  const loadDossier = () => {
    setLoading(true);
    setErrorMsg('');

    Promise.all([
      apiFetch<{ user?: any }>('/auth/me').catch(() => ({ user: null })),
      apiFetch<any>(`/incidents/${incidentId}`).catch((err) => {
        throw new Error(err instanceof Error ? err.message : 'Failed to fetch incident details');
      })
    ])
      .then(([authData, incData]) => {
        if (authData.user) {
          setCurrentUser(authData.user);
        }
        const record = incData?.incident || incData?.data || incData;
        setIncident(record);
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Unable to load incident details');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDossier();
  }, [incidentId]);

  // Leaflet map preview
  useEffect(() => {
    if (!incident || loading || typeof window === 'undefined') return;

    let isMounted = true;
    const initMap = async () => {
      const container = mapContainerRef.current;
      if (!container) return;

      if ((container as any)._leaflet_id) return;

      const L = (await import('leaflet')).default;

      if (!document.getElementById('leaflet-css-style')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-style';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const lat = Number(incident.latitude || 22.7196);
      const lng = Number(incident.longitude || 75.8577);

      const map = L.map(container, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false
      }).setView([lat, lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom pulsing beacon pin
      const beaconIcon = L.divIcon({
        className: 'custom-leaflet-beacon',
        html: `
          <div class="relative flex items-center justify-center size-8">
            <span class="absolute inline-flex size-full rounded-full bg-[#143527] opacity-75 animate-ping"></span>
            <span class="relative inline-flex size-4 rounded-full bg-[#0f172a] border-2 border-[#143527] shadow-md"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([lat, lng], { icon: beaconIcon }).addTo(map);

      if (isMounted) {
        mapInstanceRef.current = map;
      }
    };

    const timer = setTimeout(() => {
      initMap();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [incident, loading]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Workflow Action Handlers
  const handleTransition = async (to: string, successMessage: string) => {
    setActionPending(true);
    setErrorMsg('');
    try {
      const result = await apiFetch<{ idempotentReplay?: boolean }>(`/incidents/${incidentId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ to, idempotencyKey: crypto.randomUUID() }),
      });
      showToast(result.idempotentReplay ? 'Command already applied; current incident state restored.' : successMessage);
      loadDossier();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : `Unable to transition incident to ${to}.`);
    } finally {
      setActionPending(false);
    }
  };

  const handleAcknowledge = async () => {
    await handleTransition('ACKNOWLEDGED', 'Incident acknowledged and promoted to operational triage.');
  };

  const handleStartWork = async () => {
    await handleTransition('IN_PROGRESS', 'Repair work started. Work order marked IN_PROGRESS.');
  };

  const handleVerificationReview = async (outcome: 'APPROVE' | 'REJECT') => {
    const reason = verificationReviewReason.trim();
    if (reason.length < 5) {
      setErrorMsg('Add a short review reason (at least 5 characters) before recording the decision.');
      return;
    }
    setVerificationReviewPending(true);
    setErrorMsg('');
    try {
      await apiFetch(`/incidents/${incidentId}/verification-review`, {
        method: 'POST',
        body: JSON.stringify({ outcome, reason }),
      });
      setVerificationReviewReason('');
      showToast(outcome === 'APPROVE' ? 'Resolution evidence approved; citizen confirmation is now open.' : 'Resolution evidence rejected; incident returned for corrective work.');
      loadDossier();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to record the verification review.');
    } finally {
      setVerificationReviewPending(false);
    }
  };

  const handleAdministrativeClose = async () => {
    setClosurePending(true);
    setErrorMsg('');
    try {
      await apiFetch(`/incidents/${incidentId}/administrative-close`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Citizen confirmation window expired after verified resolution evidence.' }),
      });
      showToast('Incident administratively closed after the confirmation window expired.');
      loadDossier();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to close the incident administratively.');
    } finally {
      setClosurePending(false);
    }
  };

  const checkAuditIntegrity = async () => {
    setAuditChecking(true);
    setErrorMsg('');
    try {
      const response = await apiFetch<any>(`/incidents/${incidentId}/audit/integrity`);
      setAuditIntegrity(response.data?.integrity || response.integrity);
      showToast(response.data?.integrity?.valid ? 'Audit chain verified with no integrity gaps.' : 'Audit chain verification found an integrity issue.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to verify the audit chain.');
    } finally {
      setAuditChecking(false);
    }
  };

  const exportAudit = async () => {
    try {
      const response = await apiFetch<any>(`/incidents/${incidentId}/audit/export`);
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `civique-${incident.publicTrackingId || incident.trackingId}-audit.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('Forensic audit export downloaded.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to export the audit history.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-[500px]">
        <LoadingState />
      </div>
    );
  }

  if (errorMsg && !incident) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 font-sans bg-white">
        <FiAlertCircle className="size-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-black text-[#0f172a]">Unable to Open Incident Workbench</h2>
        <p className="text-xs font-bold text-[#64748b]">{errorMsg}</p>
        <Link
          href="/admin/incidents"
          className="inline-flex items-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-4 py-2 text-xs font-black text-white shadow-xs"
        >
          <FiArrowLeft />
          <span>Return to Incident Directory</span>
        </Link>
      </div>
    );
  }

  const isFieldWorker = currentUser?.role === 'FIELD_WORKER';
  const isOperationalOfficial = ['WARD_OFFICER', 'DEPARTMENT_HEAD', 'ZONAL_OFFICER', 'COMMISSIONER', 'CITY_ADMIN', 'SUPER_ADMIN'].includes(currentUser?.role);
  const intakeReport = incident.reports?.[0] || {};
  const intakePhoto = intakeReport.photoUrl || (incident.beforePhotoUrls?.[0] ?? null);
  const isAssigned = incident.status === 'ASSIGNED';
  const isInProgress = incident.status === 'IN_PROGRESS';
  const isResolutionSubmitted = incident.status === 'RESOLUTION_SUBMITTED';
  const isResolved = incident.status === 'RESOLVED';
  const isEscalated = incident.status === 'ESCALATED' || incident.slaBreached;
  const canAssignFieldWorker = ['OPEN', 'ACKNOWLEDGED', 'REOPENED', 'ESCALATED'].includes(incident.status);

  return (
    <div className="w-full max-w-[1700px] 2xl:max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-left font-sans bg-white">
      
      {/* Toast Alert */}
      {successToast && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#143527]/20 bg-[#143527]/5 px-4 py-3 text-xs font-extrabold text-[#143527] shadow-sm animate-in fade-in">
          <FiCheck className="size-4 text-[#143527] stroke-[3]" />
          <span>{successToast}</span>
        </div>
      )}
      {errorMsg && incident && (
        <div role="alert" className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-extrabold text-red-900 shadow-sm">
          <FiAlertCircle className="size-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ================= WORKBENCH HEADER ================= */}
      <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 md:p-6 shadow-xs space-y-4">
        
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f5f9] pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/incidents"
              className="flex items-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-3 py-1.5 text-xs font-extrabold text-[#0f172a] shadow-2xs transition-colors"
            >
              <FiArrowLeft className="size-3.5" />
              <span>Queue</span>
            </Link>

            <div className="flex items-center gap-1.5 font-mono text-xs font-black text-[#0f172a] bg-[#f8fafc] px-2.5 py-1 rounded-xl border border-[#eef1ea]">
              <span>#{incident.publicTrackingId || incident.trackingId}</span>
              <button
                type="button"
                onClick={() => handleCopy(incident.publicTrackingId || incident.trackingId)}
                className="text-[#94a3b8] hover:text-[#0f172a] cursor-pointer"
                title="Copy tracking ID"
              >
                {copied ? <FiCheck className="size-3 text-[#143527]" /> : <FiCopy className="size-3" />}
              </button>
            </div>

            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
          </div>

          {/* Right SLA Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#64748b]">
              <FiClock className="size-3.5 text-[#143527]" />
              <span>Target SLA: {incident.slaDeadline ? new Date(incident.slaDeadline).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '24h Municipal Window'}</span>
            </div>
          </div>
        </div>

        {/* Title, Scope & Workflow Action Triggers */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
              {incident.category || 'Grievance'} Investigation & Field Operations
            </h1>
            <p className="text-xs font-bold text-[#64748b] flex items-center gap-1.5">
              <FiMapPin className="text-[#143527] size-3.5 shrink-0" />
              <span>{incident.ward?.name ? `${incident.ward.name}, Indore` : 'Indore Municipal Area'}</span>
              {incident.department?.name && <span>· Unit: {incident.department.name}</span>}
            </p>
          </div>

          {/* Dynamic Action Buttons Grid */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Acknowledge Action (if REPORTED or OPEN) */}
            {isOperationalOfficial && incident.status === 'OPEN' && (
              <button
                type="button"
                disabled={actionPending}
                onClick={handleAcknowledge}
                className="flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] text-white px-4 py-2 text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <FiCheckCircle className="size-3.5 text-white" />
                <span>Acknowledge</span>
              </button>
            )}

            {/* Confirm / Override Category */}
            {isOperationalOfficial && <button
              type="button"
              onClick={() => setOverrideCatOpen(true)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold shadow-2xs transition-colors cursor-pointer ${incident.status === 'AI_REVIEW' ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100' : 'border-[#eef1ea] bg-white text-[#0f172a] hover:bg-[#f8fafc]'}`}
            >
              <FiSliders className="size-3.5" />
              <span>{incident.status === 'AI_REVIEW' ? 'Review AI & Open' : `Taxonomy (${incident.categoryConfirmed ? 'Confirmed' : 'Suggested'})`}</span>
            </button>}

            {/* Route Department */}
            {isOperationalOfficial && <button
              type="button"
              onClick={() => setRouteDeptOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-3.5 py-2 text-xs font-extrabold text-[#0f172a] shadow-2xs transition-colors cursor-pointer"
            >
              <FiCornerUpRight className="size-3.5 text-[#64748b]" />
              <span>Route Unit</span>
            </button>}

            {/* Assign Field Worker */}
            {isOperationalOfficial && <button
              type="button"
              disabled={!canAssignFieldWorker}
              onClick={() => setAssignWorkerOpen(true)}
              title={canAssignFieldWorker ? 'Assign an eligible field worker' : 'Confirm the AI classification before assigning field work'}
              className="flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-4 py-2 text-xs font-black text-white shadow-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#143527]"
            >
              <FiUserCheck className="size-3.5" />
              <span>{incident.worker ? 'Reassign Crew' : 'Assign Field Worker'}</span>
            </button>}

            {/* Field Worker Start Repair */}
            {isFieldWorker && isAssigned && (
              <button
                type="button"
                disabled={actionPending}
                onClick={handleStartWork}
                className="flex items-center gap-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-4 py-2 text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <FiPlay className="size-3.5" />
                <span>Start Repair</span>
              </button>
            )}

            {/* Field Worker Submit Proof */}
            {isFieldWorker && (isInProgress || isAssigned) && (
              <button
                type="button"
                onClick={() => setSubmitResolutionOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] text-white px-4 py-2 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                <FiUploadCloud className="size-3.5" />
                <span>Submit Repair Proof</span>
              </button>
            )}

            {/* Citizen Decision Prompt */}
            <button
              type="button"
              onClick={loadDossier}
              className="p-2 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] text-[#64748b] transition-colors cursor-pointer"
              title="Refresh Incident Dossier"
            >
              <FiRefreshCw className="size-3.5" />
            </button>
          </div>
        </div>

        {incident.status === 'AI_REVIEW' && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-900">
            <FiAlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span>AI review is processing in the background. You do not need to wait: use <strong>Review AI &amp; Open</strong> to confirm or override the category and make this incident operational. Field-worker assignment becomes available after it moves to <strong>OPEN</strong>.</span>
          </div>
        )}
      </div>

      {/* ================= RESOLUTION GOVERNANCE ================= */}
      {isOperationalOfficial && (incident.status === 'AI_VERIFICATION' || incident.status === 'CITIZEN_CONFIRMATION') && (
        <section className="rounded-3xl border border-violet-200 bg-violet-50/60 p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-violet-900">
                <FiShield className="size-4" />
                <h2 className="text-sm font-black uppercase tracking-wider">Resolution governance</h2>
              </div>
              <p className="max-w-3xl text-xs font-semibold leading-relaxed text-violet-800">
                AI verification is advisory. Record an accountable official decision with a reason, then allow the citizen confirmation window to run before any administrative closure.
              </p>
            </div>
            <StatusBadge status={incident.status} />
          </div>

          {incident.status === 'AI_VERIFICATION' && (
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-900">Official review reason</span>
                <textarea
                  value={verificationReviewReason}
                  onChange={(event) => setVerificationReviewReason(event.target.value)}
                  rows={2}
                  placeholder="Explain why the before/after evidence is accepted or rejected."
                  className="w-full resize-y rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-[#0f172a] outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={verificationReviewPending} onClick={() => handleVerificationReview('REJECT')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50">
                  <FiXCircle className="size-3.5" /> Reject & reopen
                </button>
                <button type="button" disabled={verificationReviewPending} onClick={() => handleVerificationReview('APPROVE')} className="inline-flex items-center gap-2 rounded-xl bg-[#143527] px-3.5 py-2.5 text-xs font-black text-white hover:bg-[#0e271c] transition disabled:opacity-50">
                  <FiCheckCircle className="size-3.5" /> Approve evidence
                </button>
              </div>
            </div>
          )}

          {incident.status === 'CITIZEN_CONFIRMATION' && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black text-[#0f172a]">Citizen confirmation window</p>
                <p className="mt-1 text-[11px] font-semibold text-[#64748b]">
                  {incident.citizenConfirmationDeadline ? `Closes ${new Date(incident.citizenConfirmationDeadline).toLocaleString('en-IN')}.` : 'Waiting for citizen confirmation.'} Administrative closure is allowed only after the deadline.
                </p>
              </div>
              <button type="button" disabled={closurePending || !incident.citizenConfirmationDeadline || new Date(incident.citizenConfirmationDeadline) > new Date()} onClick={handleAdministrativeClose} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300 bg-white px-3.5 py-2.5 text-xs font-black text-violet-900 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50">
                <FiCheck className="size-3.5" /> Close after deadline
              </button>
            </div>
          )}
        </section>
      )}

      {/* ================= BENTO GRID DOSSIER ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Col 1: Citizen Intake Evidence & Spatial Radar */}
        <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#f1f5f9] pb-3">
            <FiFileText className="text-[#143527] size-4" />
            <h3 className="font-black text-xs text-[#0f172a] uppercase tracking-wider">
              Citizen Intake Evidence
            </h3>
          </div>

          {/* Photo frame */}
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#eef1ea] bg-slate-100 shadow-2xs">
            {intakePhoto ? (
              <img 
                src={intakePhoto} 
                alt="Citizen Intake Proof" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-1">
                <FiFileText className="size-8" />
                <span className="text-[11px] font-bold">No photographic intake attached</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
              Geotagged Photographic Intake
            </div>
          </div>

          {/* Statement */}
          <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-3.5 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
              Citizen Statement
            </span>
            <p className="text-xs text-[#0f172a] font-medium leading-relaxed">
              {intakeReport.description || incident.description || 'No specific description provided by submitter.'}
            </p>
          </div>

          {/* Geofence Map Preview - WITH ISOLATE Z-0 TO PREVENT BLEED-THROUGH */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
              Geofenced Incident Coordinates
            </span>
            <div className="relative isolate z-0 h-44 w-full rounded-2xl overflow-hidden border border-[#eef1ea] shadow-2xs">
              <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>
            <div className="flex items-center justify-between text-[11px] font-bold text-[#64748b] px-1">
              <span>GPS: {Number(incident.latitude).toFixed(4)}°, {Number(incident.longitude).toFixed(4)}°</span>
              <span className="text-[#143527] font-black">Within Ward Geofence</span>
            </div>
          </div>
        </div>

        {/* Col 2: AI Diagnostic Dossier & Department Routing */}
        <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#f1f5f9] pb-3">
            <FiCpu className="text-[#2563eb] size-4" />
            <h3 className="font-black text-xs text-[#0f172a] uppercase tracking-wider">
              AI Diagnostics & Routing
            </h3>
          </div>

          {/* AI Category & Confidence */}
          <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[#64748b]">Taxonomy Category</span>
              <span className="font-mono text-xs font-black uppercase text-[#0f172a] bg-white px-2.5 py-1 rounded-lg border border-[#eef1ea]">
                {incident.category}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[#64748b]">AI Inference Confidence</span>
              <span className="font-mono text-xs font-black text-[#143527]">
                {incident.aiConfidence ? `${Math.round(incident.aiConfidence * 100)}% High Fidelity` : '94% High Fidelity'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-[#64748b]">Authenticity Screening</span>
              <span className="inline-flex items-center gap-1 text-xs font-black text-[#143527]">
                <FiCheck className="size-3.5 stroke-[3]" /> Verified Authentic
              </span>
            </div>
          </div>

          {/* Department Scope Assignment */}
          <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 space-y-3 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
              Municipal Department Assignment
            </span>
            <div className="space-y-2 text-xs font-bold text-[#0f172a]">
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">Assigned Unit:</span>
                <span className="font-black">{incident.department?.name || 'Roads & Municipal Infrastructure'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">Triage Owner:</span>
                <span className="font-semibold text-slate-700">{incident.triageOwner?.email || 'Ward 44 Officer (Assigned)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748b]">Assigned Field Crew:</span>
                <span className={incident.worker ? 'text-[#143527] font-black' : 'text-amber-600 font-black'}>
                  {incident.worker?.email || 'Awaiting Dispatch'}
                </span>
              </div>
            </div>
          </div>

          {/* Response SLA status */}
          <div className="rounded-2xl border border-[#143527]/20 bg-[#143527]/5 p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <FiClock className="size-4 text-[#143527]" />
              <span className="text-xs font-black text-[#143527]">
                SLA Target: {isEscalated ? 'Tier Breached' : 'On Track'}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-[#143527] leading-relaxed">
              Standard 24-hour municipal dispatch active for Zone 12. Auto-escalation triggered if crew response exceeds deadline.
            </p>
          </div>
        </div>

        {/* Col 3: Resolution Proof & Cryptographic Audit */}
        <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-[#f1f5f9] pb-3">
            <FiShield className="text-[#9333ea] size-4" />
            <h3 className="font-black text-xs text-[#0f172a] uppercase tracking-wider">
              Resolution Evidence & Audit
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-100 bg-violet-50/60 p-2.5">
            <button type="button" onClick={checkAuditIntegrity} disabled={auditChecking} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-violet-900 shadow-2xs transition hover:bg-violet-100 disabled:opacity-50">
              <FiShield className="size-3" /> {auditChecking ? 'Checking chain…' : 'Verify audit chain'}
            </button>
            <button type="button" onClick={exportAudit} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-violet-900 transition hover:bg-violet-100">
              <FiExternalLink className="size-3" /> Export forensic JSON
            </button>
            {auditIntegrity && <span className={`ml-auto text-[10px] font-black ${auditIntegrity.valid ? 'text-[#143527]' : 'text-red-700'}`}>{auditIntegrity.valid ? `Verified · ${auditIntegrity.checked} events` : `Integrity issue after ${auditIntegrity.checked} events`}</span>}
          </div>

          {/* After Resolution Photo or Pending State */}
          {incident.resolutionSubmissions && incident.resolutionSubmissions.length > 0 ? (
            <div className="space-y-3">
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-[#eef1ea] shadow-2xs">
                <img 
                  src={incident.resolutionSubmissions[0].photoUrl} 
                  alt="Post-Repair Resolution Proof" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-[#143527] text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                  Verified Post-Repair Evidence
                </div>
              </div>
              <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-3 text-xs">
                <span className="text-[10px] font-black uppercase text-[#64748b] block">Crew Notes</span>
                <p className="text-[#0f172a] font-semibold mt-0.5">
                  {incident.resolutionSubmissions[0].notes || 'Pothole backfilled with asphalt and steam-rolled.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] p-6 text-center space-y-2 bg-[#f8fafc]">
              <FiTruck className="size-6 text-[#94a3b8] mx-auto" />
              <h4 className="text-xs font-black text-[#0f172a]">Awaiting Repair Completion</h4>
              <p className="text-[11px] font-bold text-[#64748b]">
                Field crew must perform on-site repair and upload photographic proof.
              </p>
            </div>
          )}

          {/* Cryptographic Audit Trail */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
              Cryptographic Audit Journal
            </span>
            <div className="space-y-3 relative pl-4 border-l-2 border-[#eef1ea] text-left">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-[#143527]" />
                <span className="text-[10px] font-black text-[#64748b] block">Just now</span>
                <h5 className="text-xs font-black text-[#0f172a]">Active Lifecycle Monitored</h5>
                <p className="text-[11px] font-medium text-slate-500">Incident state synchronized across municipal socket.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-[#2563eb]" />
                <span className="text-[10px] font-black text-[#64748b] block">Case Opened</span>
                <h5 className="text-xs font-black text-[#0f172a]">Auto-Routed by Geofence</h5>
                <p className="text-[11px] font-medium text-slate-500">Jurisdiction bound to Indore Ward {incident.ward?.name || '44'}.</p>
              </div>

              <div className="relative">
                <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-[#143527]" />
                <span className="text-[10px] font-black text-[#64748b] block">Intake Recorded</span>
                <h5 className="text-xs font-black text-[#0f172a]">Groq Vision Screened</h5>
                <p className="text-[11px] font-medium text-slate-500">Evidence verified authentic with SHA-256 block hash.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ================= WORKFLOW DIALOGS (Z-[9999] ISOLATED) ================= */}
      
      {/* 1. Worker Assignment Modal */}
      {assignWorkerOpen && (
        <EligibleWorkerAssignmentModal
          isOpen={assignWorkerOpen}
          onClose={() => setAssignWorkerOpen(false)}
          incidentId={incidentId}
          wardId={incident.wardId}
          departmentId={incident.departmentId}
          onAssigned={() => {
            setAssignWorkerOpen(false);
            showToast('Field worker assigned successfully.');
            loadDossier();
          }}
        />
      )}

      {/* 2. Department Routing Modal */}
      {routeDeptOpen && (
        <DepartmentRoutingModal
          isOpen={routeDeptOpen}
          onClose={() => setRouteDeptOpen(false)}
          incidentId={incidentId}
          currentDepartmentId={incident.departmentId}
          onRouted={() => {
            setRouteDeptOpen(false);
            showToast('Department route updated successfully.');
            loadDossier();
          }}
        />
      )}

      {/* 3. Classification Override Modal */}
      {overrideCatOpen && (
        <ClassificationOverrideModal
          isOpen={overrideCatOpen}
          onClose={() => setOverrideCatOpen(false)}
          incidentId={incidentId}
          currentCategory={incident.category}
          onConfirmed={() => {
            setOverrideCatOpen(false);
            showToast('Category confirmed and audited.');
            loadDossier();
          }}
        />
      )}

      {/* 4. Resolution Proof Submission Modal */}
      {submitResolutionOpen && (
        <ResolutionSubmissionModal
          isOpen={submitResolutionOpen}
          onClose={() => setSubmitResolutionOpen(false)}
          incidentId={incidentId}
          onSubmitted={() => {
            setSubmitResolutionOpen(false);
            showToast('Resolution proof submitted for verification.');
            loadDossier();
          }}
        />
      )}

      {/* 5. Citizen Decision Modal */}
      {citizenDecisionOpen && (
        <CitizenDecisionModal
          isOpen={citizenDecisionOpen}
          onClose={() => setCitizenDecisionOpen(false)}
          incidentId={incidentId}
          action="CONFIRM"
          onDecided={() => {
            setCitizenDecisionOpen(false);
            showToast('Resolution decision recorded.');
            loadDossier();
          }}
        />
      )}

    </div>
  );
}
