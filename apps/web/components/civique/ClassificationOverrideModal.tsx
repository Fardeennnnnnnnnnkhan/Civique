'use client';

import React, { useState } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiCheck, FiShield } from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  currentCategory: string;
  onConfirmed: () => void;
}

const TAXONOMY_OPTIONS = [
  { key: 'POTHOLE', label: 'Road Potholes & Structural Cavities' },
  { key: 'GARBAGE', label: 'Solid Waste & Illegal Dumping' },
  { key: 'STREETLIGHT', label: 'Streetlight Luminaire Inoperative' },
  { key: 'WATER_LEAK', label: 'Pressurized Municipal Water Main Leak' },
  { key: 'SEWAGE', label: 'Sewage Chamber & Drainage Overflow' },
  { key: 'TRAFFIC_SIGN', label: 'Damaged or Missing Traffic Signage' },
  { key: 'OTHERS', label: 'Other Hazardous Municipal Defect' },
];

export default function ClassificationOverrideModal({
  isOpen,
  onClose,
  incidentId,
  currentCategory,
  onConfirmed,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || 'POTHOLE');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide an audit reason for confirming or overriding the category.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiFetch(`/incidents/${incidentId}/confirm-classification`, {
        method: 'POST',
        body: JSON.stringify({
          category: selectedCategory,
          reason: reason.trim(),
        }),
      });

      onConfirmed();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update classification.');
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
            <div className="p-2 rounded-xl bg-[#16a34a] text-white">
              <FiCheckCircle className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                Review Classification
              </h3>
              <p className="text-xs font-bold text-[#64748b]">
                Confirm or override AI classification with audit trail
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

          {/* Category Radio Grid */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Official Confirmed Category
            </label>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {TAXONOMY_OPTIONS.map((opt) => {
                const isSelected = selectedCategory === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => setSelectedCategory(opt.key)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#16a34a] bg-[#f0fdf4] text-[#166534] shadow-xs'
                        : 'border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:border-[#94a3b8]'
                    }`}
                  >
                    <span className="text-xs font-black">{opt.label}</span>
                    {isSelected && (
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#16a34a] text-white">
                        <FiCheck className="size-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Reason */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Official Review Rationale
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Verified photographic evidence visually confirms asphalt defect matches pothole criteria..."
              className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all resize-none"
            />
          </div>

          {/* Notice */}
          <div className="flex items-center gap-2 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] p-2.5 text-[10px] font-bold text-[#166534]">
            <FiShield className="text-[#16a34a] size-3.5 shrink-0" />
            <span>Classification update will advance incident from AI Review to Open status.</span>
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
              className="flex items-center gap-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>{submitting ? 'Confirming...' : 'Confirm Category'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
