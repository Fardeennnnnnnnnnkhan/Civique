'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiLayers, FiAlertCircle, FiCheck, FiShield } from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';

interface Department {
  id: string;
  name: string;
  code?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  currentDepartmentId?: string | null;
  onRouted: () => void;
}

export default function DepartmentRoutingModal({
  isOpen,
  onClose,
  incidentId,
  currentDepartmentId,
  onRouted,
}: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');

    apiFetch<{ departments?: Department[] }>('/geography/departments')
      .then((resData) => {
        const list = resData.departments || [];
        setDepartments(list);
        if (currentDepartmentId && list.some((d) => d.id === currentDepartmentId)) {
          setSelectedDepartmentId(currentDepartmentId);
        } else if (list.length > 0) {
          setSelectedDepartmentId(list[0].id);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch departments');
      })
      .finally(() => setLoading(false));
  }, [isOpen, currentDepartmentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartmentId) {
      setError('Please select a target municipal department.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a justification for this routing decision.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiFetch(`/incidents/${incidentId}/route`, {
        method: 'POST',
        body: JSON.stringify({
          departmentId: selectedDepartmentId,
          reason: reason.trim(),
        }),
      });

      onRouted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to route department.');
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
              <FiLayers className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                Route Municipal Department
              </h3>
              <p className="text-xs font-bold text-[#64748b]">
                Direct grievance to responsible municipal engineering unit
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

          {/* Department Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Target Municipal Department (Pre-Selected &amp; Editable)
            </label>
            {loading ? (
              <div className="h-10 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] animate-pulse" />
            ) : (
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full rounded-2xl border border-[#e2e8f0] bg-white p-3 text-xs font-bold text-[#0f172a] focus:border-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all cursor-pointer shadow-2xs"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Department Routing Reason
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Road defect requires asphalt compaction and heavy machinery from Roads & Bridges..."
              className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all resize-none"
            />
          </div>

          {/* Governance Notice */}
          <div className="flex items-center gap-2 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] p-2.5 text-[10px] font-bold text-[#166534]">
            <FiShield className="text-[#16a34a] size-3.5 shrink-0" />
            <span>Audited routing decision will update SLA dispatch expectations.</span>
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
              disabled={submitting || departments.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>{submitting ? 'Routing...' : 'Confirm Routing'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
