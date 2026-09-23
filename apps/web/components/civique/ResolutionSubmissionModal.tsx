'use client';

import React, { useState, useRef } from 'react';
import { FiX, FiCheckCircle, FiUploadCloud, FiAlertCircle, FiCamera, FiShield } from 'react-icons/fi';
import { apiUpload } from '@/lib/api/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  onSubmitted: () => void;
}

export default function ResolutionSubmissionModal({
  isOpen,
  onClose,
  incidentId,
  onSubmitted,
}: Props) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setError('Please provide photographic proof of the completed resolution.');
      return;
    }
    if (notes.trim().length < 5) {
      setError('Please provide completion notes describing the repair in at least 5 characters.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', photo);
      formData.append('resolvedNotes', notes.trim());
      formData.append('idempotencyKey', crypto.randomUUID());
      formData.append('captureAt', new Date().toISOString());

      await apiUpload(`/incidents/${incidentId}/resolution-submissions`, formData);

      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit resolution proof.');
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
                Submit Resolution Evidence
              </h3>
              <p className="text-xs font-bold text-[#64748b]">
                Document completed field repair for automated verification
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

          {/* Photographic Proof Upload */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Resolution Photo Proof (After Repair)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-[#e2e8f0] bg-slate-900 group">
                <img src={previewUrl} alt="After work proof" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2.5 right-2.5 rounded-xl bg-black/80 hover:bg-black px-3 py-1.5 text-xs font-bold text-white backdrop-blur-xs transition-all cursor-pointer"
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed border-[#cbd5e1] hover:border-[#16a34a] bg-[#f8fafc] hover:bg-white transition-all cursor-pointer p-4 text-center space-y-2"
              >
                <div className="p-2.5 rounded-full bg-white shadow-xs text-[#0f172a]">
                  <FiUploadCloud className="size-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-[#0f172a]">
                    Click to capture or upload after-repair photograph
                  </p>
                  <p className="text-[10px] font-bold text-[#64748b]">
                    JPEG, PNG, or WebP. Automated visual AI will cross-verify with intake image.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Completion Notes */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Field Completion Statement & Work Details
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the completed physical repair, materials used, asphalt compaction, or cleanup performed..."
              className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all resize-none"
            />
          </div>

          {/* Governance Notice */}
          <div className="flex items-center gap-2 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] p-2.5 text-[10px] font-bold text-[#166534]">
            <FiShield className="text-[#16a34a] size-3.5 shrink-0" />
            <span>Submission queues automated AI verification and citizen confirmation.</span>
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
              <span>{submitting ? 'Submitting Evidence...' : 'Submit Resolution Proof'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
