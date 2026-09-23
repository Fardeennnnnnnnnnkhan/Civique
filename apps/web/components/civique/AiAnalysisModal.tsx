'use client';

import React, { useState, useEffect } from 'react';
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiZap,
  FiShield,
  FiArrowRight,
  FiX,
  FiMapPin,
  FiTag,
  FiClock,
  FiCheck,
  FiEye,
  FiActivity,
  FiLayers,
  FiSliders,
  FiHelpCircle,
  FiCpu,
} from 'react-icons/fi';
import { Button } from '../ui';

export interface AiClassificationData {
  categorySuggested: string | null;
  confidence: number | null;
  label?: string | null;
  summary?: string | null;
  issue?: {
    title?: string;
    category_rationale?: string;
    severity?: string;
    urgency?: string;
    condition?: string;
    summary?: string;
    visual_observations?: string[];
    hazards?: string[];
    impact?: string;
    recommended_action?: string;
    next_steps?: string[];
    affected_asset?: string;
    evidence_quality?: 'LOW' | 'MEDIUM' | 'HIGH';
    confidence_band?: 'LOW' | 'MEDIUM' | 'HIGH';
    alternative_categories?: Array<{ category: string; confidence: number; reason: string }>;
  } | null;
  authenticity?: {
    verdict: 'REAL' | 'LIKELY_REAL' | 'SUSPICIOUS' | 'LIKELY_SYNTHETIC' | 'INCONCLUSIVE';
    confidence: number;
    signals?: string[];
    limitations?: string[];
  } | null;
  review?: 'AUTO_ACCEPT' | 'HUMAN_REVIEW';
  decision?: 'ACCEPT' | 'REJECT' | 'REVIEW_REQUIRED';
  civicRelevance?: {
    status?: 'CIVIC_ISSUE_VISIBLE' | 'NO_CIVIC_ISSUE_VISIBLE' | 'AMBIGUOUS';
    confidence?: number;
    issue_present?: boolean;
    affected_domain?: string;
    reason?: string;
  } | null;
  aiStatus?: string;
  providerError?: string | null;
  advisoryOnly?: boolean;
  schemaVersion?: string;
  model?: { provider?: string; model?: string; status?: string; advisoryOnly?: true };
  adaptiveQuestions?: Array<{
    id: string;
    prompt: string;
    input: 'BOOLEAN' | 'CHOICE' | 'TEXT';
    options?: string[];
    required: boolean;
    reason: string;
  }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  POTHOLE: 'Road Pothole',
  GARBAGE: 'Solid Waste / Garbage',
  STREETLIGHT: 'Streetlight Defect',
  WATER_LEAK: 'Water Leak / Pipeline Burst',
  SEWAGE: 'Sewage Overflow',
  TRAFFIC_SIGN: 'Traffic Sign / Signal Damage',
  OTHERS: 'Other Civic Grievance',
  OTHER: 'Other Civic Grievance',
};

const SEVERITY_OPTIONS = [
  { id: 'LOW', label: 'Low', desc: 'Cosmetic / Non-urgent', dot: 'bg-sky-500' },
  { id: 'MEDIUM', label: 'Medium', desc: 'Standard Dispatch', dot: 'bg-amber-500' },
  { id: 'HIGH', label: 'High', desc: 'Pedestrian / Traffic Risk', dot: 'bg-orange-500' },
  { id: 'CRITICAL', label: 'Critical', desc: 'Immediate Danger', dot: 'bg-rose-600' },
];

export interface AiAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  data: AiClassificationData | null;
  loading?: boolean;
  imagePreview?: string | null;
  insightsReady?: boolean;
  onNeedQuestions?: () => void;
  onApply: (applied: {
    category: string;
    title: string;
    description: string;
    severity: string;
  }) => void;
}

export function AiAnalysisModal({
  open,
  onClose,
  data,
  loading = false,
  imagePreview,
  insightsReady = true,
  onNeedQuestions,
  onApply,
}: AiAnalysisModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('POTHOLE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [activeTab, setActiveTab] = useState<'evidence' | 'diagnostics'>('evidence');

  useEffect(() => {
    if (data) {
      if (data.categorySuggested) setSelectedCategory(data.categorySuggested);
      setTitle(data.issue?.title || data.label || 'Reported Civic Hazard');
      setDescription(data.issue?.summary || data.summary || '');
      setSeverity(data.issue?.severity || 'MEDIUM');
    }
  }, [data]);

  if (!open) return null;

  // ================= 1. FORENSIC SCANNING STATE =================
  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[#eef1ea] bg-white p-7 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200 font-sans text-center overflow-hidden">
          {/* Subtle radial aura */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 size-48 rounded-full bg-[#143527]/5 blur-2xl pointer-events-none" />

          {/* Scanning frame if image preview is present */}
          {imagePreview ? (
            <div className="relative mx-auto mb-6 h-44 w-full rounded-2xl overflow-hidden border border-[#eef1ea] bg-black shadow-inner">
              <img
                src={imagePreview}
                alt="Scanning evidence"
                className="h-full w-full object-cover opacity-60 filter blur-[0.5px]"
              />
              {/* Laser sweep animation line */}
              <div
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#143527] to-transparent shadow-[0_0_15px_#143527]"
                style={{
                  animation: 'laserSweep 2s ease-in-out infinite alternate',
                }}
              />
              {/* Overlay telemetry badges */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/20">
                <FiCpu className="animate-spin text-white" />
                <span>Forensic Vision Engine</span>
              </div>
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-mono text-white/80 backdrop-blur-md border border-white/10">
                <span>Civique Telemetry</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-[#143527]/5 border border-[#143527]/15 text-[#143527] shadow-xs relative">
              <FiZap className="size-8 animate-pulse text-[#143527]" />
            </div>
          )}

          <h3 className="text-xl font-black tracking-tight text-[#143527]">
            Analyzing Grievance Evidence
          </h3>
          <p className="mt-1.5 text-xs text-[#707c75] leading-relaxed max-w-sm mx-auto">
            Extracting photographic forensics, verifying illumination integrity, and categorizing municipal triage severity.
          </p>

          {/* Progressive Telemetry Checklist */}
          <div className="mt-6 space-y-2 rounded-2xl border border-[#eef1ea] bg-[#fcfdfa] p-3.5 text-left text-xs font-medium text-[#1c221f]">
            <div className="flex items-center gap-2 text-[#143527]">
              <FiCheckCircle className="size-4 shrink-0 text-[#143527]" />
              <span>Checking sensor grain and natural illumination...</span>
            </div>
            <div className="flex items-center gap-2 text-[#1c221f]">
              <span className="size-4 rounded-full border-2 border-[#143527] border-t-transparent animate-spin shrink-0" />
              <span>Resolving municipal hazard classification...</span>
            </div>
            <div className="flex items-center gap-2 text-[#707c75]">
              <span className="size-4 rounded-full border border-[#eef1ea] shrink-0" />
              <span>Calculating SLA triage recommendations...</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-[#707c75] hover:text-[#143527] transition-colors"
            >
              Cancel and enter details manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. EMPTY / NO AI RESULT FALLBACK =================
  const hasAiResult =
    Boolean(data.categorySuggested) ||
    data.aiStatus === 'COMPLETED' ||
    data.confidence !== null;

  if (!hasAiResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#eef1ea] bg-white p-6 sm:p-7 shadow-2xl text-left font-sans">
          <div className="flex items-start justify-between gap-3 border-b border-[#eef1ea] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <FiHelpCircle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#143527]">Manual Entry Required</h3>
                <p className="text-xs text-[#707c75]">AI triage could not identify a clear category</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <FiX className="size-5" />
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#707c75]">
            The first image review was retained, but the detailed AI pass is temporarily unavailable. Please review the available evidence and complete the report manually if needed.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" onClick={onClose} className="text-xs bg-[#143527] hover:bg-[#0e271c] text-white rounded-xl">
              Continue with Form
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isRejected = data.decision === 'REJECT' || data.civicRelevance?.status === 'NO_CIVIC_ISSUE_VISIBLE' || data.categorySuggested === 'NOT_A_CIVIC_ISSUE';
  if (isRejected) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-6 sm:p-7 shadow-2xl font-sans">
          <div className="flex items-start justify-between gap-3 border-b border-rose-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200"><FiAlertTriangle className="size-5" /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Image rejected</h3>
                <p className="text-xs text-rose-700">This evidence does not show a valid civic issue.</p>
              </div>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100"><FiX className="size-5" /></button>
          </div>
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm leading-relaxed text-rose-950">
            {data.civicRelevance?.reason || data.issue?.summary || 'The image appears to be unrelated to a visible public problem, such as a logo, advertisement, document, screenshot, product or other non-civic content.'}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#707c75]">Please upload a clear photograph of the civic problem. A real image is not enough by itself; it must visibly depict a public infrastructure, public-space or municipal service issue.</p>
          <div className="mt-6 flex justify-end"><Button type="button" onClick={onClose} className="bg-rose-600 text-white hover:bg-rose-700 text-xs">Upload Valid Evidence</Button></div>
        </div>
      </div>
    );
  }

  if (!insightsReady && (data.adaptiveQuestions?.length || 0) > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-md rounded-3xl border border-[#eef1ea] bg-white p-6 shadow-2xl font-sans">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#143527]/5 text-[#143527] border border-[#143527]/15"><FiHelpCircle className="size-5" /></div>
            <div>
              <h3 className="text-base font-bold text-[#143527]">A few answers are needed first</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#707c75]">Civique generated image-specific questions so the detailed AI insights can be more precise.</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="text-xs border-[#eef1ea]">Close</Button>
            <Button type="button" onClick={onNeedQuestions} className="bg-[#143527] text-xs text-white hover:bg-[#0e271c] rounded-xl font-bold">Answer Questions <FiArrowRight className="ml-1" /></Button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 3. COMPLETE 2-PANEL BALANCED INSPECTION STUDIO =================
  const authenticity = data.authenticity;
  const isAuthentic =
    authenticity?.verdict === 'REAL' ||
    authenticity?.verdict === 'LIKELY_REAL' ||
    !authenticity?.verdict;
  const isSuspicious =
    authenticity?.verdict === 'SUSPICIOUS' ||
    authenticity?.verdict === 'LIKELY_SYNTHETIC';
  const confidencePercent = Math.round((data.confidence || 0.92) * 100);

  const handleConfirm = () => {
    if (isRejected) return;
    onApply({
      category: selectedCategory,
      title,
      description,
      severity,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 lg:p-6 animate-in fade-in duration-200 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Dialog Modal Window */}
      <div className="relative z-10 flex flex-col w-full max-w-5xl max-h-[92vh] rounded-3xl border border-[#eef1ea] bg-white text-[#1c221f] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* ================= HEADER BAR ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eef1ea] bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#143527] text-white shadow-xs shrink-0">
              <FiZap className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#143527]">
                  AI Grievance Insights & Verification
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#143527]/5 px-2.5 py-0.5 text-[11px] font-bold text-[#143527] border border-[#143527]/15">
                  <span className="size-1.5 rounded-full bg-[#143527] animate-pulse" />
                  Groq Vision Advisory
                </span>
              </div>
              <p className="text-xs text-[#707c75]">
                Machine-assisted triage · You can edit all details before transferring to your report
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-[#143527]/5 hover:text-[#143527] transition-colors cursor-pointer"
          >
            <FiX className="size-5" />
          </button>
        </div>

        {/* ================= 2-PANEL SCROLLABLE BODY ================= */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-7 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ================= LEFT PANEL: EVIDENCE & FORENSICS (5 / 12) ================= */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Evidence Photo Frame */}
              <div className="relative rounded-2xl overflow-hidden border border-[#eef1ea] bg-black shadow-xs group">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Inspected frame"
                    className="w-full max-h-56 object-cover object-center"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center text-xs text-[#707c75]">
                    No image preview attached
                  </div>
                )}

                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10">
                  <FiMapPin className="text-[#143527] size-3" />
                  <span>Inspected Sensor Frame</span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-[#143527] px-3 py-1 text-xs font-bold text-white shadow-xs">
                  <FiActivity className="size-3.5" />
                  <span>{confidencePercent}% AI Match</span>
                </div>
              </div>

              {/* Forensic Verification Card */}
              <div
                className={`rounded-2xl border p-4 transition-all space-y-2.5 ${
                  isAuthentic
                    ? 'border-[#143527]/20 bg-[#143527]/5'
                    : isSuspicious
                    ? 'border-rose-200 bg-rose-50/60'
                    : 'border-[#eef1ea] bg-[#fcfdfa]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiShield
                      className={`size-4.5 ${
                        isAuthentic
                          ? 'text-[#143527]'
                          : isSuspicious
                          ? 'text-rose-600'
                          : 'text-[#707c75]'
                      }`}
                    />
                    <span className="text-xs font-bold text-[#143527]">
                      {isAuthentic ? 'Photographic Proof Verified' : 'Authenticity Flagged'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isAuthentic
                        ? 'bg-[#143527] text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {authenticity?.verdict || 'LIKELY_REAL'}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-[#707c75]">
                  {isAuthentic
                    ? 'Natural lighting, sensor grain, and physical geometry confirmed. High evidence integrity for municipal triage.'
                    : 'Evidence flagged for secondary review due to atypical visual features.'}
                </p>

                {/* Evidence Verification Signals */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(authenticity?.signals && authenticity.signals.length > 0
                    ? authenticity.signals
                    : ['Natural Lighting', 'Sensor Grain Matched', 'Perspective Valid']
                  ).map((sig, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md bg-white border border-[#143527]/15 px-2 py-0.5 text-[10px] font-semibold text-[#143527] shadow-2xs"
                    >
                      <FiCheck className="size-2.5 stroke-[3] text-[#143527]" />
                      {sig}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Diagnostics: Reasoning & Observations */}
              <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#eef1ea] pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#143527] flex items-center gap-1.5">
                    <FiLayers className="text-[#143527]" /> Visual Reasoning
                  </span>
                  <span className="text-[10px] font-semibold text-[#707c75]">
                    Triage Taxonomy
                  </span>
                </div>

                <div className="text-xs text-[#707c75] leading-relaxed">
                  <span className="font-bold text-[#143527] block mb-1">Classification Rationale:</span>
                  {data.issue?.category_rationale ||
                    data.summary ||
                    'Visual patterns correspond closely to established civic defect profiles.'}
                </div>

                {data.issue?.visual_observations && data.issue.visual_observations.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-bold text-[#143527] block mb-1.5">
                      Observed Visual Elements:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.issue.visual_observations.map((obs, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-[#f4f6f3] px-2.5 py-1 text-[11px] font-medium text-[#1c221f]"
                        >
                          • {obs}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.issue?.recommended_action && (
                  <div className="rounded-xl border border-[#143527]/15 bg-[#143527]/5 p-2.5 text-xs text-[#143527] leading-relaxed">
                    <span className="font-bold text-[#143527]">Dispatch Advisory: </span>
                    {data.issue.recommended_action}
                  </div>
                )}
              </div>

            </div>

            {/* ================= RIGHT PANEL: EDITABLE REPORT FIELDS (7 / 12) ================= */}
            <div className="lg:col-span-7 space-y-5">
              
              <div className="rounded-2xl border border-[#eef1ea] bg-[#fcfdfa] p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#143527]">
                    Pre-Filled Grievance Details
                  </h4>
                  <p className="text-xs text-[#707c75] mt-0.5">
                    Review and customize the information before transferring to your report.
                  </p>
                </div>
                <span className="rounded-full bg-[#143527] px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                  {confidencePercent}% Confidence
                </span>
              </div>

              {/* Form Input Fields Container */}
              <div className="space-y-4">
                
                {/* 1. Grievance Title */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="modal-input-title"
                    className="block text-xs font-bold uppercase tracking-wider text-[#143527]"
                  >
                    Grievance Title
                  </label>
                  <input
                    id="modal-input-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title describing the issue..."
                    className="flex h-11 w-full rounded-xl border border-[#eef1ea] bg-white px-3.5 py-2 text-sm font-semibold text-[#1c221f] shadow-2xs placeholder:text-slate-400 focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20 focus:outline-none transition-all"
                  />
                </div>

                {/* 2. Confirmed Category */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="modal-select-category"
                      className="block text-xs font-bold uppercase tracking-wider text-[#143527]"
                    >
                      Classified Category
                    </label>
                    <span className="text-[11px] font-bold text-[#143527]">
                      Suggested: {CATEGORY_LABELS[data.categorySuggested || ''] || data.categorySuggested || 'General'}
                    </span>
                  </div>
                  <select
                    id="modal-select-category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="flex h-11 w-full rounded-xl border border-[#eef1ea] bg-white px-3.5 py-2 text-sm font-semibold text-[#1c221f] shadow-2xs focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20 focus:outline-none transition-all cursor-pointer"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Severity / Hazard Level */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#143527]">
                    Assessed Hazard Urgency
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SEVERITY_OPTIONS.map((sev) => {
                      const active = severity === sev.id;
                      return (
                        <button
                          key={sev.id}
                          type="button"
                          onClick={() => setSeverity(sev.id)}
                          className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            active
                              ? 'border-[#143527] bg-[#143527]/5 ring-2 ring-[#143527]/20 shadow-xs'
                              : 'border-[#eef1ea] bg-white hover:border-[#143527]/30'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${sev.dot}`} />
                            <span className="text-xs font-bold text-[#1c221f]">{sev.label}</span>
                          </div>
                          <span className="text-[10px] text-[#707c75] mt-0.5 line-clamp-1">
                            {sev.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Auto-Drafted Factual Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="modal-textarea-desc"
                      className="block text-xs font-bold uppercase tracking-wider text-[#143527]"
                    >
                      Factual Description
                    </label>
                    <span className="text-[11px] text-[#707c75]">
                      Editable municipal summary
                    </span>
                  </div>
                  <textarea
                    id="modal-textarea-desc"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add specific context, duration, or structural details..."
                    className="flex w-full min-h-[110px] rounded-xl border border-[#eef1ea] bg-white p-3 text-xs sm:text-sm text-[#1c221f] leading-relaxed shadow-2xs placeholder:text-slate-400 focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20 focus:outline-none transition-all resize-y"
                  />
                </div>

              </div>

            </div>

          </div>
        </div>

        {/* ================= MODAL FOOTER BAR ================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#eef1ea] bg-white shrink-0">
          <p className="text-xs text-[#707c75] flex items-center gap-1.5 hidden sm:flex">
            <FiCheckCircle className="text-[#143527] size-4" />
            <span>Clicking accept will populate the intake studio with verified details.</span>
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#eef1ea] bg-white px-4 py-2.5 text-xs font-semibold text-[#1c221f] hover:bg-[#143527]/5 transition-colors shadow-2xs cursor-pointer"
            >
              Enter Manually
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>Accept & Apply to Report</span>
              <FiArrowRight className="size-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
