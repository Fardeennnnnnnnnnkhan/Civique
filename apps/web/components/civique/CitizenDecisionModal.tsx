'use client';

import React, { useState } from 'react';
import { FiX, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiShield } from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  action: 'CONFIRM' | 'DISPUTE';
  onDecided: () => void;
}

export default function CitizenDecisionModal({
  isOpen,
  onClose,
  incidentId,
  action,
  onDecided,
}: Props) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isDispute = action === 'DISPUTE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDispute && notes.trim().length < 5) {
      setError('Please provide feedback explaining why the resolution is insufficient (at least 5 characters).');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiFetch(`/incidents/${incidentId}/confirm-resolution`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          notes: notes.trim(),
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      onDecided();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit your confirmation decision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div className="relative w-full max-w-lg rounded-3xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-[#e2e8f0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDispute ? 'bg-red-100 text-red-600' : 'bg-[#16a34a] text-white'}`}>
              {isDispute ? <FiAlertTriangle className="size-5" /> : <FiCheckCircle className="size-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                {isDispute ? 'Dispute Municipal Resolution' : 'Confirm Resolution & Close Grievance'}
              </h3>
              <p className="text-xs font-bold text-[#64748b]">
                {isDispute
                  ? 'Reopen the incident for corrective repair'
                  : 'Verify that the civic hazard has been satisfactorily resolved'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] cursor-pointer"
          >
            <FiX className="size-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <FiAlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isDispute ? (
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
                Dispute Reason & Observed Deficiency
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Please describe why the issue is not fixed (e.g. debris remains on sidewalk, pothole not fully filled...)"
                className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-red-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 transition-all resize-none"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-1 text-xs text-emerald-900">
                <p className="font-black text-sm text-emerald-950">
                  Ready to confirm resolution?
                </p>
                <p className="font-medium text-emerald-800 leading-relaxed">
                  By confirming, you acknowledge that municipal crews have satisfactorily repaired the reported civic hazard. This grievance will be marked permanently Resolved.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
                  Optional Citizen Feedback / Appreciation
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional comments on crew speed or quality..."
                  className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] p-2.5 text-[10px] font-bold text-[#166534]">
            <FiShield className="text-[#16a34a] size-3.5 shrink-0" />
            <span>Citizen decisions are cryptographically logged in the municipal audit journal.</span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f1f5f9]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] px-4 py-2 text-xs font-extrabold text-[#475569] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer ${
                isDispute
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#16a34a] hover:bg-[#15803d] text-white'
              }`}
            >
              <span>
                {submitting
                  ? 'Processing...'
                  : isDispute
                  ? 'Submit Dispute & Reopen'
                  : 'Confirm & Close Case'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
