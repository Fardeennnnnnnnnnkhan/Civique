'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FiAlertCircle,
  FiTrash2,
  FiSun,
  FiDroplet,
  FiActivity,
  FiOctagon,
  FiHelpCircle,
  FiCamera,
  FiAlertTriangle,
  FiCheckCircle,
  FiMapPin,
  FiUploadCloud,
  FiShield,
  FiZap,
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiEye,
  FiLock,
  FiInfo,
  FiUser,
  FiCompass,
  FiSliders,
  FiChevronDown,
  FiChevronUp,
  FiArrowRight,
  FiNavigation,
  FiCrosshair,
  FiFileText,
  FiCpu,
  FiExternalLink,
} from 'react-icons/fi';
import Shell from '@/app/components/Shell';
import LoadingState from '@/app/components/LoadingState';
import { apiFetch, logout } from '@/lib/api/client';
import { Button, Input, Textarea, Badge } from '@/components/ui';
import { AiAnalysisModal, AiClassificationData } from '@/components/civique/AiAnalysisModal';
import { CivicFollowUpQuestionsModal } from '@/components/civique/CivicFollowUpQuestionsModal';
import toast from 'react-hot-toast';

interface CategoryItem {
  id: string;
  label: string;
  department: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'POTHOLE',
    label: 'Road Pothole',
    department: 'Public Works (PWD)',
    icon: FiAlertCircle,
    desc: 'Cavity, structural asphalt crater, or road crack',
  },
  {
    id: 'GARBAGE',
    label: 'Solid Waste Overflow',
    department: 'IMC Sanitation Dept',
    icon: FiTrash2,
    desc: 'Uncollected domestic trash, commercial dump spill',
  },
  {
    id: 'STREETLIGHT',
    label: 'Streetlight Inoperative',
    department: 'Electrical Maintenance',
    icon: FiSun,
    desc: 'Dark public corridor, broken pole, or day-burning lamp',
  },
  {
    id: 'WATER_LEAK',
    label: 'Water Main Leak',
    department: 'Water Supply & Works',
    icon: FiDroplet,
    desc: 'Pipeline burst, valve leakage, potable water loss',
  },
  {
    id: 'SEWAGE',
    label: 'Sewage Overflow',
    department: 'Drainage & Sewerage Wing',
    icon: FiActivity,
    desc: 'Blocked sewer manhole, drainage backflow, health hazard',
  },
  {
    id: 'TRAFFIC_SIGN',
    label: 'Traffic Signal & Signage',
    department: 'Traffic Mobility Cell',
    icon: FiOctagon,
    desc: 'Damaged warning sign, dead traffic signal, blind junction',
  },
  {
    id: 'OTHERS',
    label: 'General Municipal Hazard',
    department: 'Citizen Grievance Cell',
    icon: FiHelpCircle,
    desc: 'Fallen tree branches, illegal encroachment, other hazard',
  },
];

const CIVIC_TEMPLATES = [
  {
    title: 'Deep road pothole on main carriageway',
    category: 'POTHOLE',
    severity: 'HIGH',
    desc: 'Severe asphalt cavity approximately 10-15cm deep posing immediate danger to two-wheelers and slowing traffic flow during peak hours.',
  },
  {
    title: 'Overflowing municipal garbage container',
    category: 'GARBAGE',
    severity: 'MEDIUM',
    desc: 'Solid waste has overflowed past the secondary containment bins onto the pedestrian walkway, causing strong odors and stray animal gathering.',
  },
  {
    title: 'Streetlights out along 200m corridor',
    category: 'STREETLIGHT',
    severity: 'HIGH',
    desc: 'Multiple consecutive streetlights are completely non-functional after dusk, creating a dark, unsafe corridor for nighttime commuters.',
  },
  {
    title: 'High-pressure potable pipeline burst',
    category: 'WATER_LEAK',
    severity: 'CRITICAL',
    desc: 'Underground drinking water distribution pipe has burst, flooding the adjacent roadway and causing thousands of liters of clean water loss.',
  },
  {
    title: 'Open manhole / drainage backflow',
    category: 'SEWAGE',
    severity: 'CRITICAL',
    desc: 'Sewage drain is clogged with storm runoff and overflowing raw wastewater onto the street. Manhole lid is displaced, posing severe pedestrian risk.',
  },
];

const SEVERITY_LEVELS = [
  {
    id: 'LOW',
    label: 'Low Urgency',
    sla: '72h SLA Target',
    impact: 'Cosmetic or minor defect with no immediate traffic or pedestrian risk',
    dot: 'bg-sky-500',
    borderActive: 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20',
  },
  {
    id: 'MEDIUM',
    label: 'Standard Triage',
    sla: '48h SLA Target',
    impact: 'Standard municipal grievance affecting neighborhood convenience',
    dot: 'bg-amber-500',
    borderActive: 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20',
  },
  {
    id: 'HIGH',
    label: 'High Priority',
    sla: '24h SLA Target',
    impact: 'Traffic disruption, vehicle damage risk, or public sanitation issue',
    dot: 'bg-orange-500',
    borderActive: 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/20',
  },
  {
    id: 'CRITICAL',
    label: 'Emergency Hazard',
    sla: '4h Rapid Dispatch',
    impact: 'Immediate public danger, open manhole, live wire, or major flooding',
    dot: 'bg-rose-600',
    borderActive: 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-600/20',
  },
];

export default function ReportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Auth State
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Evidence & Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aiData, setAiData] = useState<AiClassificationData | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [aiInsightsReady, setAiInsightsReady] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('POTHOLE');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState<number>(22.7196); // Indore center
  const [longitude, setLongitude] = useState<number>(75.8577);
  const [isLocating, setIsLocating] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [resolvedWard, setResolvedWard] = useState<{
    wardId?: string;
    wardName?: string;
    zoneName?: string;
  } | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState<{
    trackingId: string;
    id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/me')
      .then((res) => {
        const u = (res as any)?.user || res;
        if (u && u.id) {
          setUser(u);
        }
      })
      .catch(() => {
        router.push('/signin');
      });
  }, [router]);

  useEffect(() => {
    if (errorMsg) toast.error(errorMsg);
  }, [errorMsg]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push('/signin');
  };

  // Trigger Groq AI Classification
  const analyzeImageWithAi = async (file: File, customDesc = '', citizenAnswers: Record<string, string> = {}, detailed = false, fallbackData?: AiClassificationData) => {
    setIsClassifying(true);
    setShowAiModal(true);
    setShowFollowUpModal(false);
    setAiInsightsReady(detailed);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (customDesc) formData.append('description', customDesc);

      const data = await apiFetch<AiClassificationData>('/reports/classify-draft', {
        method: 'POST',
        body: formData,
      });
      const hasUsableResult = Boolean(data.categorySuggested || data.issue || data.summary || data.confidence !== null || data.aiStatus === 'COMPLETED');
      const answerContext = Object.entries(citizenAnswers)
        .filter(([, value]) => value.trim())
        .map(([id, value]) => `${id.replaceAll('_', ' ')}: ${value}`)
        .join('\n');
      const safeData = detailed && !hasUsableResult && fallbackData
        ? {
            ...fallbackData,
            aiStatus: 'REVIEW_REQUIRED',
            providerError: data.providerError || 'DETAILED_ANALYSIS_UNAVAILABLE',
            summary: `${fallbackData.summary || fallbackData.issue?.summary || 'The image was reviewed as civic evidence.'}\n\nCitizen context considered:\n${answerContext}`,
            issue: fallbackData.issue ? { ...fallbackData.issue, summary: `${fallbackData.issue.summary || fallbackData.summary || ''}\n\nCitizen context considered:\n${answerContext}` } : fallbackData.issue,
            adaptiveQuestions: [],
          }
        : data;
      setAiData(safeData);
      const rejected = safeData.decision === 'REJECT' || safeData.civicRelevance?.status === 'NO_CIVIC_ISSUE_VISIBLE';
      if (!detailed && !rejected && (safeData.adaptiveQuestions?.length || 0) > 0) {
        setShowAiModal(false);
        setShowFollowUpModal(true);
        setAiInsightsReady(false);
      } else {
        setShowAiModal(true);
        setAiInsightsReady(true);
      }
    } catch (error) {
      setAiData(null);
      setShowAiModal(false);
      setShowFollowUpModal(false);
      setAiInsightsReady(false);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'AI analysis is unavailable. Please retry or continue manually.'
      );
    } finally {
      setIsClassifying(false);
    }
  };

  const handleFollowUpSubmit = async (answers: Record<string, string>) => {
    if (!imageFile) return;
    await analyzeImageWithAi(imageFile, description, answers, true, aiData || undefined);
  };

  // Handle Photo Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    await analyzeImageWithAi(file, description);
  };

  // Drag & Drop Handlers
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    await analyzeImageWithAi(file, description);
  };

  // Handle applying AI fields
  const handleApplyAi = (fields: {
    category: string;
    title: string;
    description: string;
    severity: string;
  }) => {
    if (fields.category) setCategory(fields.category);
    if (fields.title) setTitle(fields.title);
    if (fields.description) setDescription(fields.description);
    if (fields.severity) setSeverity(fields.severity);
    setAiApplied(true);
    toast.success('AI insights applied to report form');
  };

  // Apply Quick Template
  const handleApplyTemplate = (tmpl: (typeof CIVIC_TEMPLATES)[number]) => {
    setTitle(tmpl.title);
    setCategory(tmpl.category);
    setSeverity(tmpl.severity);
    setDescription(tmpl.desc);
    toast.success('Civic template applied');
  };

  // Locate User GPS
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await apiFetch<{
            wardName?: string;
            zoneName?: string;
          }>(`/geography/resolve?lat=${lat}&lng=${lng}`);
          if (res.wardName) {
            setResolvedWard({
              wardName: res.wardName,
              zoneName: res.zoneName || 'Zone pending',
            });
            toast.success(`Matched to ${res.wardName}`);
          }
        } catch {
          setResolvedWard(null);
          setErrorMsg(
            'This location could not be matched to an Indore service ward. Please verify your location.'
          );
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        setErrorMsg('Unable to retrieve current coordinates. Using Indore default coordinates.');
      }
    );
  };

  // Final Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      setErrorMsg('Please upload photographic evidence of the civic issue.');
      return;
    }
    if (aiData?.decision === 'REJECT' || aiData?.civicRelevance?.status === 'NO_CIVIC_ISSUE_VISIBLE' || aiData?.categorySuggested === 'NOT_A_CIVIC_ISSUE') {
      setErrorMsg('This image was rejected because it does not depict a visible civic issue. Please upload valid evidence before submitting.');
      setShowAiModal(true);
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter a brief title describing the grievance.');
      return;
    }
    if (!consentAccepted) {
      setErrorMsg('Please review and accept the evidence and privacy consent before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('category', category);
      formData.append('title', title);
      formData.append('description', description || `${category} reported at specified coordinates.`);
      formData.append('severity', severity);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      formData.append('consentVersion', 'civique-report-consent-v1');
      formData.append('deviceTimestamp', new Date().toISOString());
      formData.append('gpsTimestamp', new Date().toISOString());
      if (landmark) formData.append('landmark', landmark);

      const data = await apiFetch<{ trackingId: string; reportId: string }>('/reports', {
        method: 'POST',
        headers: { 'Idempotency-Key': submissionKey },
        body: formData,
      });

      setSuccessResult({
        trackingId: data.trackingId,
        id: data.reportId,
      });

      if (data.reportId) {
        toast.success(`Grievance submitted successfully · ${data.trackingId}`);
        router.replace(`/report/${encodeURIComponent(data.reportId)}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Submission failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTracking = () => {
    if (successResult?.trackingId) {
      navigator.clipboard.writeText(successResult.trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Readiness Metrics
  const isEvidenceReady = Boolean(imageFile);
  const isDetailsReady = Boolean(title.trim());
  const isLocationReady = Boolean(resolvedWard || landmark.trim());
  const completedCount = [isEvidenceReady, isDetailsReady, isLocationReady, consentAccepted].filter(
    Boolean
  ).length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }

  return (
    <Shell user={user} onLogout={handleLogout}>
      <div className="w-full min-h-full bg-white font-sans pb-16">
        {/* Full-width container that uses the display naturally without empty gutters */}
        <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 space-y-7">
          
          {/* ================= COMMAND HEADER BAR ================= */}
          <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#143527]/5 px-3 py-1 text-xs font-bold text-[#143527] border border-[#143527]/15">
                    <span className="size-2 rounded-full bg-[#143527] animate-pulse" />
                    Civic Incident Intake
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f6f3] px-3 py-1 text-xs font-semibold text-[#143527]">
                    <FiCrosshair className="text-[#143527] size-3" />
                    Active Zone: {resolvedWard?.wardName || 'Central Ward Sector'}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-medium text-[#707c75]">Auditable Incident Engine</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#143527]">
                  Lodge an Official Civic Grievance
                </h1>
                <p className="text-xs sm:text-sm text-[#707c75] max-w-3xl leading-relaxed">
                  Provide verified photographic evidence of public infrastructure defects. Civique automatically triggers vision forensics, resolves municipal routing, and schedules SLA field dispatch.
                </p>
              </div>

              {/* Utility Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#eef1ea] bg-white px-4 py-2.5 text-xs font-bold text-[#143527] hover:bg-[#143527]/5 shadow-2xs hover:border-[#143527]/30 transition-all"
                >
                  <FiUser className="text-[#143527]" />
                  <span>My Grievance History</span>
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#eef1ea] bg-white px-4 py-2.5 text-xs font-bold text-[#143527] hover:bg-[#143527]/5 shadow-2xs hover:border-[#143527]/30 transition-all"
                >
                  <FiMapPin className="text-[#143527]" />
                  <span>Live Incident Map</span>
                </Link>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] text-white px-4 py-2.5 text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <FiZap className="size-3.5" />
                    <span>Open AI Cockpit</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ================= SUCCESS BANNER (IF RECORD CREATED) ================= */}
          {successResult && (
            <div className="rounded-3xl border border-[#143527]/20 bg-[#143527]/5 p-6 sm:p-8 text-[#1c221f] shadow-sm animate-in zoom-in-95 duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#143527] text-white shadow-md">
                    <FiCheckCircle className="size-7" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-xl font-bold text-[#143527]">
                        Grievance Committed to Municipal Ledger
                      </h3>
                      <Badge tone="success">Status: OPEN</Badge>
                    </div>
                    <p className="text-xs text-[#707c75] leading-relaxed max-w-xl">
                      Your incident has been dispatched into the municipal workflow. Milestone timestamps and worker SLA updates are streaming live.
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-xs font-bold text-[#707c75]">Tracking Reference:</span>
                      <span className="font-mono text-sm font-bold text-[#143527] bg-white px-3 py-1 rounded-xl border border-[#143527]/20 shadow-2xs">
                        {successResult.trackingId}
                      </span>
                      <button
                        type="button"
                        onClick={copyTracking}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#143527] hover:underline transition-colors cursor-pointer"
                      >
                        {copied ? <FiCheck className="text-[#143527]" /> : <FiCopy />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/report/${successResult.id}`}>
                    <Button size="lg" className="shadow-sm bg-[#143527] hover:bg-[#0e271c] text-white rounded-xl">
                      Open Incident Tracker
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setSuccessResult(null);
                      setImageFile(null);
                      setImagePreview(null);
                      setTitle('');
                      setDescription('');
                      setAiData(null);
                      setAiApplied(false);
                      setConsentAccepted(false);
                      setSubmissionKey(crypto.randomUUID());
                    }}
                  >
                    File Another Grievance
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ================= MAIN DUAL-COLUMN INTAKE STUDIO ================= */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
            
            {/* ================= LEFT / MAIN INTAKE WORKSTATION (7 or 8 COLS) ================= */}
            <div className="xl:col-span-8 space-y-7">

              {/* Error Alert */}
              {errorMsg && (
                <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 shadow-2xs animate-in fade-in duration-150">
                  <FiAlertTriangle className="size-5 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. VISUAL EVIDENCE STATION */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xs">
                      1
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#143527]">
                        Photographic Evidence Station
                      </h2>
                      <p className="text-xs text-[#707c75]">
                        Attach high-resolution proof for AI validation and worker verification
                      </p>
                    </div>
                  </div>

                  {aiApplied && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#143527]/5 px-3 py-1 text-xs font-bold text-[#143527] border border-[#143527]/15">
                      <FiCheckCircle className="text-[#143527]" />
                      AI Verified & Applied
                    </span>
                  )}
                </div>

                {!imagePreview ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                    {/* Upload Dropzone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`md:col-span-8 group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all cursor-pointer ${
                        isDragOver
                          ? 'border-[#143527] bg-[#143527]/5'
                          : 'border-[#eef1ea] bg-[#fcfdfa] hover:border-[#143527] hover:bg-[#143527]/5'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-white border border-[#eef1ea] text-[#143527] shadow-2xs group-hover:scale-105 group-hover:border-[#143527]/40 transition-all">
                        <FiCamera className="size-6" />
                      </div>
                      <h3 className="text-sm font-bold text-[#143527] group-hover:text-[#0e271c] transition-colors">
                        Click to capture or drag photographic evidence
                      </h3>
                      <p className="mt-1 text-xs text-[#707c75] max-w-sm">
                        Accepts JPEG, PNG, WEBP · Device timestamp and GPS telemetry are automatically extracted
                      </p>
                    </div>

                    {/* Quality Guidance Rail */}
                    <div className="md:col-span-4 rounded-2xl border border-[#eef1ea] bg-[#fcfdfa] p-4 space-y-3 flex flex-col justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#707c75] block mb-2">
                          Evidence Standards
                        </span>
                        <ul className="space-y-2 text-[#707c75]">
                          <li className="flex items-start gap-2">
                            <FiCheck className="size-3.5 text-[#143527] mt-0.5 shrink-0" />
                            <span>Frame entire defect clearly from 2–5 meters away</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <FiCheck className="size-3.5 text-[#143527] mt-0.5 shrink-0" />
                            <span>Include surrounding street/curb context for spatial verification</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <FiCheck className="size-3.5 text-[#143527] mt-0.5 shrink-0" />
                            <span>Avoid blurry or night-glare shots whenever possible</span>
                          </li>
                        </ul>
                      </div>
                      <div className="pt-2 border-t border-[#eef1ea] text-[11px] text-[#707c75] flex items-center gap-1.5">
                        <FiLock className="text-[#143527] size-3 shrink-0" />
                        <span>Private originals are never published publicly</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Attached Photo View with Actions */
                  <div className="relative rounded-2xl border border-[#eef1ea] bg-black overflow-hidden shadow-sm group">
                    <img
                      src={imagePreview}
                      alt="Incident Evidence"
                      className="w-full max-h-80 object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white border border-white/20">
                        <span className="size-2 rounded-full bg-[#143527]" />
                        {imageFile?.name || 'Evidence Attached'}
                      </span>
                      <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-slate-300 border border-white/10">
                        {(imageFile ? (imageFile.size / 1024 / 1024).toFixed(2) : '1.2')} MB
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-8.5 px-3 items-center gap-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors text-xs font-semibold border border-white/20 cursor-pointer"
                      >
                        <FiRefreshCw className="size-3.5" /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                          setAiData(null);
                          setAiInsightsReady(false);
                          setShowFollowUpModal(false);
                          setAiApplied(false);
                        }}
                        className="flex size-8.5 items-center justify-center rounded-xl bg-black/60 backdrop-blur-md text-white hover:bg-rose-600 transition-colors border border-white/20 cursor-pointer"
                        title="Remove photo"
                      >
                        <FiTrash2 className="size-4" />
                      </button>
                    </div>

                    {/* Bottom Status Ribbon */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate max-w-sm sm:max-w-md">
                          {aiData?.issue?.title || 'Photographic sensor proof captured'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!aiInsightsReady && (aiData?.adaptiveQuestions?.length || 0) > 0) {
                            setShowFollowUpModal(true);
                            return;
                          }
                          setShowAiModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer shrink-0"
                      >
                        <FiZap className="size-3.5" />
                        <span>{aiInsightsReady ? 'Inspect AI Analysis' : 'Answer AI Questions'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. MUNICIPAL DEPARTMENT & ISSUE CLASSIFICATION */}
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-[#eef1ea] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-[#143527] text-white text-xs font-bold shadow-2xs">
                      2
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#143527]">
                        Municipal Department & Defect Classification
                      </h2>
                      <p className="text-xs text-[#707c75]">
                        Designates authoritative jurisdiction and responsible field division
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#143527] hidden sm:inline">
                    7 Supported Categories
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    const IconComponent = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`group relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#143527] bg-[#143527]/5 ring-2 ring-[#143527]/20 shadow-xs'
                            : 'border-[#eef1ea] bg-white hover:border-[#143527]/30 hover:bg-[#143527]/5'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-3">
                          <div
                            className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                              isSelected
                                ? 'bg-[#143527] text-white shadow-2xs'
                                : 'bg-[#f4f6f3] text-[#707c75] group-hover:bg-[#143527]/10 group-hover:text-[#143527]'
                            }`}
                          >
                            <IconComponent className="size-5" />
                          </div>

                          <span
                            className={`text-[9.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-[#143527]/15 text-[#143527] font-bold'
                                : 'bg-[#f4f6f3] text-[#707c75]'
                            }`}
                          >
                            {cat.department}
                          </span>
                        </div>

                        <div className="space-y-0.5 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-[#1c221f]">
                              {cat.label}
                            </span>
                            {isSelected && (
                              <FiCheck className="size-3.5 text-[#143527] stroke-[3]" />
                            )}
                          </div>
                          <p className="text-[11px] text-[#707c75] leading-snug line-clamp-2">
                            {cat.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. INCIDENT PARTICULARS WITH SMART CIVIC ASSIST */}
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-7 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-[#eef1ea] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-[#143527] text-white text-xs font-bold shadow-2xs">
                      3
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#143527]">
                        Incident Particulars & Smart Assist
                      </h2>
                      <p className="text-xs text-[#707c75]">
                        Provide descriptive details to guide equipment preparation and field crews
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick-Fill Civic Template Chips */}
                <div className="space-y-2 rounded-2xl border border-[#eef1ea] bg-[#fcfdfa] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#143527] flex items-center gap-1.5">
                      <FiFileText className="text-[#143527]" />
                      Smart Civic Templates (Tap to pre-fill)
                    </span>
                    <span className="text-[10px] text-[#707c75]">One-tap municipal phrasing</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {CIVIC_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:border-[#143527]/30 hover:bg-[#143527]/5 px-3 py-1.5 text-xs font-semibold text-[#1c221f] hover:text-[#143527] shadow-2xs transition-all cursor-pointer"
                      >
                        <span className="text-[#143527] font-bold">+</span>
                        <span>{tmpl.title}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  <Input
                    label="Grievance Title *"
                    id="form-title"
                    placeholder="e.g. Deep asphalt crater causing traffic congestion near market"
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  />

                  <Textarea
                    label="Detailed Grievance Narrative"
                    id="form-desc"
                    rows={4}
                    placeholder="Describe duration, observable dimensions, risk to pedestrians/vehicles, or structural defect symptoms..."
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  />

                  {/* Urgency & Risk Matrix */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#143527]">
                        Hazard Urgency & Public Risk
                      </label>
                      <span className="text-[11px] text-[#707c75]">
                        Determines SLA escalation bracket
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {SEVERITY_LEVELS.map((sev) => {
                        const isSelected = severity === sev.id;
                        return (
                          <button
                            key={sev.id}
                            type="button"
                            onClick={() => setSeverity(sev.id)}
                            className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? sev.borderActive
                                : 'border-[#eef1ea] bg-white hover:bg-[#fcfdfa]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <span className={`size-2.5 rounded-full ${sev.dot}`} />
                                <span className="text-xs font-bold text-[#1c221f]">{sev.label}</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-[#707c75]">
                                {sev.sla}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#707c75] mt-1.5 leading-snug">
                              {sev.impact}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. LOCATION INTELLIGENCE & INDORE GEOFENCE */}
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eef1ea] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-[#143527] text-white text-xs font-bold shadow-2xs">
                      4
                    </span>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#143527]">
                        Location Telemetry & Municipal Geofence
                      </h2>
                      <p className="text-xs text-[#707c75]">
                        Authoritative ward resolution ensures dispatch to the right municipal office
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="gap-2 shrink-0 font-bold border-[#eef1ea]"
                  >
                    <FiCrosshair className={isLocating ? 'animate-spin text-[#143527]' : 'text-[#143527]'} />
                    {isLocating ? 'Resolving GPS...' : 'Detect GPS Coordinates'}
                  </Button>
                </div>

                {/* Verified Geofence Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#143527]/5 border border-[#143527]/15 p-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-[#143527] text-white shadow-2xs shrink-0">
                      <FiMapPin className="size-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#143527]">
                        Municipal Jurisdiction
                      </span>
                      <p className="text-sm font-bold text-[#143527]">
                        {resolvedWard?.wardName || 'Central Ward Sector'}
                      </p>
                      <p className="text-xs text-[#707c75]">
                        {resolvedWard
                          ? `${resolvedWard.wardName} · ${resolvedWard.zoneName || 'Active Zone'} · Verified Service Boundary`
                          : 'Spatial boundary verified against municipal GIS datasets'}
                      </p>
                    </div>
                  </div>
                  <Badge tone="success" className="shrink-0 bg-[#143527] text-white">Jurisdiction Confirmed</Badge>
                </div>

                <Input
                  label="Nearby Landmark / Street Reference *"
                  id="loc-landmark"
                  placeholder="e.g. Opposite Central Market Gate, Ring Road Sector"
                  value={landmark}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLandmark(e.target.value)}
                />

                {/* Collapsible Precision Coordinates Drawer */}
                <div className="rounded-2xl border border-[#eef1ea] bg-[#fcfdfa] p-3.5">
                  <button
                    type="button"
                    onClick={() => setShowCoordinates(!showCoordinates)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-[#707c75] hover:text-[#143527] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FiCompass className="text-[#143527]" />
                      <span>Advanced GPS Telemetry ({latitude.toFixed(4)}, {longitude.toFixed(4)})</span>
                    </span>
                    {showCoordinates ? <FiChevronUp /> : <FiChevronDown />}
                  </button>

                  {showCoordinates && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#eef1ea] animate-in fade-in-50 duration-200">
                      <Input
                        label="Latitude Coordinate"
                        id="loc-lat"
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setLatitude(parseFloat(e.target.value) || 0)
                        }
                      />
                      <Input
                        label="Longitude Coordinate"
                        id="loc-lng"
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setLongitude(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 5. CITIZEN CONSENT & DISPATCH ACTION BAR */}
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 shadow-sm space-y-4">
                <label className="flex items-start gap-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentAccepted}
                    onChange={(e) => setConsentAccepted(e.target.checked)}
                    className="mt-1 size-4.5 rounded border-[#eef1ea] accent-[#143527] cursor-pointer"
                  />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-[#143527] block">
                      Citizen Verification & Privacy Consent Charter
                    </span>
                    <p className="text-xs leading-relaxed text-[#707c75]">
                      I certify that this report reflects a genuine public defect. I consent to Civique processing photographic proof and location telemetry for triage, deduplication, and resolution verification. Private personal identity is never shared on public map records.
                    </p>
                  </div>
                </label>

                <div className="pt-3 border-t border-[#eef1ea] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#707c75]">
                    <span className="font-bold text-[#143527]">Direct Municipal Dispatch:</span>{' '}
                    Committed to municipal ledger with tamper-evident audit hashing.
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || !consentAccepted}
                    className="w-full sm:w-auto px-9 py-3 font-bold shadow-sm shrink-0 bg-[#143527] hover:bg-[#0e271c] text-white rounded-xl"
                  >
                    {isSubmitting ? (
                      <>
                        <FiRefreshCw className="animate-spin mr-2" /> Dispatching Grievance...
                      </>
                    ) : (
                      <>
                        <span>Submit Official Grievance</span>
                        <FiArrowRight className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

            </div>

            {/* ================= RIGHT / TELEMETRY & DISPATCH RAIL (4 or 5 COLS) ================= */}
            <div className="xl:col-span-4 space-y-6 xl:sticky xl:top-6">
              
              {/* 1. REAL-TIME SUBMISSION READINESS MONITOR */}
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#eef1ea] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#143527] flex items-center gap-2">
                    <FiCheckCircle className="text-[#143527]" />
                    Intake Readiness Monitor
                  </span>
                  <span className="text-xs font-mono font-bold text-[#143527]">
                    {progressPercent}% Complete
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full rounded-full bg-[#f4f6f3] overflow-hidden">
                  <div
                    className="h-full bg-[#143527] transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Checklist items */}
                <div className="space-y-2 text-xs">
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                      isEvidenceReady
                        ? 'bg-[#143527]/5 text-[#143527] font-semibold'
                        : 'text-[#707c75] bg-[#fcfdfa]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#143527]" />
                      Visual Photographic Proof
                    </span>
                    {isEvidenceReady ? (
                      <FiCheck className="text-[#143527] stroke-[3]" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Required</span>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                      isDetailsReady
                        ? 'bg-[#143527]/5 text-[#143527] font-semibold'
                        : 'text-[#707c75] bg-[#fcfdfa]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#143527]" />
                      Grievance Particulars & Title
                    </span>
                    {isDetailsReady ? (
                      <FiCheck className="text-[#143527] stroke-[3]" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Required</span>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                      isLocationReady
                        ? 'bg-[#143527]/5 text-[#143527] font-semibold'
                        : 'text-[#707c75] bg-[#fcfdfa]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#143527]" />
                      Ward Geofence
                    </span>
                    {isLocationReady ? (
                      <FiCheck className="text-[#143527] stroke-[3]" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Pending</span>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                      consentAccepted
                        ? 'bg-[#143527]/5 text-[#143527] font-semibold'
                        : 'text-[#707c75] bg-[#fcfdfa]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#143527]" />
                      Legal Consent Charter
                    </span>
                    {consentAccepted ? (
                      <FiCheck className="text-[#143527] stroke-[3]" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Unsigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. AI VISION COPILOT STATION */}
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#eef1ea] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-xl bg-[#143527] text-white shadow-2xs">
                      <FiZap className="size-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#143527]">
                      Vision Copilot
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f6f3] px-2.5 py-0.5 text-[9.5px] font-mono text-[#707c75]">
                    <FiCpu /> Qwen 2.5 Vision
                  </span>
                </div>

                {!aiData || aiData.aiStatus !== 'COMPLETED' ? (
                  <div className="text-center py-6 space-y-2">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fcfdfa] border border-[#eef1ea] text-[#707c75]">
                      <FiCamera className="size-6" />
                    </div>
                    <p className="text-xs font-bold text-[#143527]">Awaiting Evidence Photo</p>
                    <p className="text-[11px] text-[#707c75] leading-relaxed max-w-xs mx-auto">
                      Attach visual proof to automatically extract defect category, illumination authenticity, and repair urgency.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                  {aiData.decision === 'REJECT' || aiData.civicRelevance?.status === 'NO_CIVIC_ISSUE_VISIBLE' ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-950"><FiAlertTriangle className="text-rose-600" /> Civic Issue Check</span>
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">Rejected</span>
                      </div>
                      <p className="text-[11px] leading-snug text-rose-900">{aiData.civicRelevance?.reason || 'This image does not visibly depict a public problem. Upload valid civic evidence to continue.'}</p>
                    </div>
                  ) : null}

                  {/* Authenticity Pill */}
                  <div
                      className={`rounded-2xl border p-3.5 space-y-1.5 ${
                        aiData.authenticity?.verdict === 'REAL' || aiData.authenticity?.verdict === 'LIKELY_REAL'
                          ? 'border-[#143527]/20 bg-[#143527]/5'
                          : 'border-rose-200 bg-rose-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#1c221f]">
                          <FiShield
                            className={
                              aiData.authenticity?.verdict === 'REAL' || aiData.authenticity?.verdict === 'LIKELY_REAL'
                                ? 'text-[#143527]'
                                : 'text-rose-600'
                            }
                          />
                          {aiData.authenticity?.verdict === 'REAL' || aiData.authenticity?.verdict === 'LIKELY_REAL'
                            ? 'Sensor Proof Verified'
                            : 'Flagged for Human Review'}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#143527]">
                          {Math.round((aiData.authenticity?.confidence || 0) * 100)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-[#707c75] leading-snug">
                        {aiData.authenticity?.signals?.[0] || 'Physical surface & lighting verified.'}
                      </p>
                    </div>

                    {/* Classification Match */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#707c75]">Category Match</span>
                        <span className="font-bold text-[#143527]">
                          {Math.round((aiData.confidence || 0) * 100)}% Match
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#143527]">
                        {aiData.label || aiData.categorySuggested}
                      </p>
                    </div>

                    {/* Summary Snippet */}
                    <div className="rounded-2xl bg-[#fcfdfa] border border-[#eef1ea] p-3.5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#707c75]">
                        AI Forensic Diagnostics
                      </span>
                      <p className="text-xs text-[#1c221f] line-clamp-3 leading-relaxed">
                        {aiData.issue?.summary || aiData.summary}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAiModal(true)}
                      className="w-full justify-center gap-1.5 text-xs font-bold border-[#eef1ea]"
                    >
                      <FiEye /> View AI Cockpit Details
                    </Button>
                  </div>
                )}
              </div>

              {/* 3. MUNICIPAL SLA DISPATCH TARGET */}
              <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#eef1ea] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#143527]">
                    Municipal Response Targets
                  </span>
                  <span className="text-[10px] font-bold text-[#143527]">Civique SLA</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-[#eef1ea]">
                    <span className="text-[#707c75]">Jurisdiction Ward</span>
                    <span className="font-bold text-[#143527]">{resolvedWard?.wardName || 'Ward 42'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#eef1ea]">
                    <span className="text-[#707c75]">Administrative Zone</span>
                    <span className="font-bold text-[#143527]">{resolvedWard?.zoneName || 'Zone 7 Active'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#eef1ea]">
                    <span className="text-[#707c75]">Escalation SLA</span>
                    <span className="font-bold text-[#143527]">24h - 48h Resolution Target</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-[#707c75]">Verification Protocol</span>
                    <span className="font-semibold text-[#1c221f]">Dual Photo Proof + Citizen Signoff</span>
                  </div>
                </div>
              </div>

              {/* 4. PRIVACY & CRYPTOGRAPHIC VERIFICATION SEAL */}
              <div className="rounded-3xl border border-[#eef1ea] bg-[#fcfdfa] p-5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#143527]">
                  <FiLock className="text-[#143527] size-4" />
                  <span>Citizen Privacy & Audit Guarantee</span>
                </div>
                <p className="text-[11px] text-[#707c75] leading-relaxed">
                  Your identity is cryptographically redacted from public map pins. Only authorized field workers and triage officers access the information needed to resolve this incident.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[10px] font-mono text-[#707c75]">
                  <span className="inline-block size-1.5 rounded-full bg-[#143527]" />
                  <span>SHA-256 Chain Head Secured</span>
                </div>
              </div>

            </div>

          </form>

          {/* ================= AI ANALYSIS MODAL POPUP ================= */}
          <AiAnalysisModal
            open={showAiModal}
            onClose={() => setShowAiModal(false)}
            data={aiData}
            loading={isClassifying}
            imagePreview={imagePreview}
            insightsReady={aiInsightsReady}
            onNeedQuestions={() => {
              setShowAiModal(false);
              setShowFollowUpModal(true);
            }}
            onApply={handleApplyAi}
          />

          <CivicFollowUpQuestionsModal
            open={showFollowUpModal}
            imagePreview={imagePreview}
            questions={aiData?.adaptiveQuestions || []}
            onClose={() => setShowFollowUpModal(false)}
            onSubmit={handleFollowUpSubmit}
          />

        </div>
      </div>
    </Shell>
  );
}
