'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FiX, 
  FiUserCheck, 
  FiShield, 
  FiAlertCircle, 
  FiCheck, 
  FiLayers, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiSearch,
  FiChevronDown,
  FiRefreshCw
} from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';

interface EligibleWorker {
  id: string;
  email: string;
  phoneNumber?: string | null;
  role: string;
  wardId?: string | null;
  ward?: { id: string; name: string } | null;
  departmentId?: string | null;
}

interface Ward {
  id: string;
  name: string;
  code?: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  wardId?: string | null;
  departmentId?: string | null;
  onAssigned: () => void;
}

export default function EligibleWorkerAssignmentModal({
  isOpen,
  onClose,
  incidentId,
  wardId: initialWardId,
  departmentId: initialDepartmentId,
  onAssigned,
}: Props) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<string>(initialWardId || 'ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDepartmentId || 'ALL');

  const [workers, setWorkers] = useState<EligibleWorker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [searchWorker, setSearchWorker] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [reason, setReason] = useState('Assigned for on-site inspection, triage, and municipal resolution within SLA window.');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Fetch Wards & Departments once
  useEffect(() => {
    if (!isOpen) return;

    // Reset initial selections
    setSelectedWardId(initialWardId || 'ALL');
    setSelectedDeptId(initialDepartmentId || 'ALL');

    Promise.all([
      apiFetch<{ wards?: Ward[] }>('/geography/wards').catch(() => ({ wards: [] })),
      apiFetch<{ departments?: Department[] }>('/geography/departments').catch(() => ({ departments: [] })),
    ]).then(([wardsRes, deptsRes]) => {
      if (wardsRes.wards) setWards(wardsRes.wards);
      if (deptsRes.departments) setDepartments(deptsRes.departments);
    });
  }, [isOpen, initialWardId, initialDepartmentId]);

  // 2. Fetch Workers whenever Ward or Department selection changes
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError('');

    const query = new URLSearchParams();
    if (selectedWardId && selectedWardId !== 'ALL') query.set('wardId', selectedWardId);
    if (selectedDeptId && selectedDeptId !== 'ALL') query.set('departmentId', selectedDeptId);

    apiFetch<{ workers?: EligibleWorker[] }>(`/users/workers?${query.toString()}`)
      .then((resData) => {
        const list = resData.workers || [];
        setWorkers(list);

        // Pre-select the best matching worker if available
        if (list.length > 0) {
          // If current selectedWorkerId is still in the new list, keep it; otherwise pick first
          if (!list.some(w => w.id === selectedWorkerId)) {
            setSelectedWorkerId(list[0].id);
          }
        } else {
          // If 0 workers found in this specific ward/dept filter, fallback to all workers
          apiFetch<{ workers?: EligibleWorker[] }>('/users/workers')
            .then((allRes) => {
              const allList = allRes.workers || [];
              setWorkers(allList);
              if (allList.length > 0 && !allList.some(w => w.id === selectedWorkerId)) {
                setSelectedWorkerId(allList[0].id);
              }
            })
            .catch(() => undefined);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to fetch field workers');
      })
      .finally(() => setLoading(false));
  }, [isOpen, selectedWardId, selectedDeptId]);

  // Filter workers by search query
  const filteredWorkers = useMemo(() => {
    if (!searchWorker.trim()) return workers;
    const q = searchWorker.toLowerCase().trim();
    return workers.filter(w => 
      w.email.toLowerCase().includes(q) || 
      (w.phoneNumber && w.phoneNumber.includes(q)) ||
      (w.ward?.name && w.ward.name.toLowerCase().includes(q))
    );
  }, [workers, searchWorker]);

  const selectedWorker = useMemo(() => {
    return workers.find(w => w.id === selectedWorkerId) || null;
  }, [workers, selectedWorkerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerId) {
      setError('Please select an eligible field worker to dispatch.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide an operational rationale for this assignment.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await apiFetch(`/incidents/${incidentId}/assign-worker`, {
        method: 'POST',
        body: JSON.stringify({
          workerId: selectedWorkerId,
          wardId: selectedWardId !== 'ALL' ? selectedWardId : undefined,
          departmentId: selectedDeptId !== 'ALL' ? selectedDeptId : undefined,
          reason: reason.trim(),
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign field worker.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans">
      <div className="relative w-full max-w-xl rounded-3xl border border-[#e2e8f0] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#e2e8f0] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#16a34a] text-white shadow-xs">
              <FiUserCheck className="size-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                Assign & Dispatch Field Worker
              </h3>
              <p className="text-xs font-bold text-[#64748b]">
                Deploy municipal repair crew for on-site verification & resolution
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

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-left">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <FiAlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ================= EDITABLE JURISDICTION SELECTORS ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc]">
            {/* 1. Ward Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] flex items-center gap-1">
                <FiMapPin className="text-[#16a34a] size-3.5" />
                <span>Municipal Ward (Editable)</span>
              </label>
              <select
                value={selectedWardId}
                onChange={(e) => setSelectedWardId(e.target.value)}
                className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-bold text-[#0f172a] focus:border-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all cursor-pointer"
              >
                <option value="ALL">All Wards (City-Wide Pool)</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.code ? `(${w.code})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-bold text-[#64748b]">
                Defaults to incident location, change to cross-assign.
              </p>
            </div>

            {/* 2. Department Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] flex items-center gap-1">
                <FiLayers className="text-[#16a34a] size-3.5" />
                <span>Target Department (Editable)</span>
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-bold text-[#0f172a] focus:border-[#16a34a] focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] font-bold text-[#64748b]">
                Filters available crew by department specialty.
              </p>
            </div>
          </div>

          {/* ================= EDITABLE FIELD WORKER DROPDOWN ================= */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
                Field Crew Member (Pre-Selected &amp; Editable)
              </label>
              <span className="text-[10px] font-black text-[#16a34a]">
                {filteredWorkers.length} Available Crew
              </span>
            </div>

            {loading ? (
              <div className="h-12 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] animate-pulse flex items-center px-4">
                <span className="text-xs font-bold text-[#94a3b8]">Querying active field personnel...</span>
              </div>
            ) : workers.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 font-bold space-y-1">
                <p>No field workers found matching this specific filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWardId('ALL');
                    setSelectedDeptId('ALL');
                  }}
                  className="text-xs font-black text-[#0f172a] underline cursor-pointer hover:text-black"
                >
                  Expand search to All Wards &amp; Departments
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Main Dropdown Button / Selector Bar */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#e2e8f0] bg-white hover:border-[#16a34a] text-left transition-all cursor-pointer shadow-2xs"
                >
                  {selectedWorker ? (
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] text-[#16a34a] flex items-center justify-center font-black text-sm shrink-0">
                        {selectedWorker.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-[#0f172a] truncate">
                            {selectedWorker.email.split('@')[0]}
                          </span>
                          <span className="text-[10px] font-bold bg-[#f0fdf4] text-[#16a34a] border border-[#dcfce7] px-2 py-0.5 rounded-md">
                            Selected
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#64748b] block truncate">
                          {selectedWorker.email} {selectedWorker.phoneNumber ? `· ${selectedWorker.phoneNumber}` : ''}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#94a3b8]">Click to select a field worker...</span>
                  )}
                  <div className="flex items-center gap-1.5 text-[#64748b] shrink-0 ml-2">
                    <span className="text-[11px] font-black">Change</span>
                    <FiChevronDown className={`size-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded Dropdown Menu with Search */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-[#e2e8f0] bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Live Search Bar */}
                    <div className="p-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-2.5 size-3.5 text-[#94a3b8]" />
                        <input
                          type="text"
                          value={searchWorker}
                          onChange={(e) => setSearchWorker(e.target.value)}
                          placeholder="Search crew by name, email, or phone..."
                          className="w-full rounded-xl border border-[#e2e8f0] bg-white pl-9 pr-3 py-1.5 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Scrollable Workers List */}
                    <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                      {filteredWorkers.length === 0 ? (
                        <div className="p-4 text-center text-xs font-bold text-[#64748b]">
                          No personnel match &quot;{searchWorker}&quot;
                        </div>
                      ) : (
                        filteredWorkers.map((w, idx) => {
                          const isSelected = selectedWorkerId === w.id;
                          return (
                            <div
                              key={w.id}
                              onClick={() => {
                                setSelectedWorkerId(w.id);
                                setIsDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#f0fdf4] border border-[#dcfce7] text-[#166534]'
                                  : 'hover:bg-[#f8fafc] text-[#0f172a]'
                              }`}
                            >
                              <div className="space-y-0.5 min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black truncate">
                                    {w.email.split('@')[0]}
                                  </span>
                                  {idx === 0 && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#16a34a]">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[11px] font-medium block truncate ${isSelected ? 'text-[#15803d]' : 'text-[#64748b]'}`}>
                                  {w.email} {w.phoneNumber ? `· ${w.phoneNumber}` : ''}
                                </span>
                                {w.ward?.name && (
                                  <span className="text-[10px] font-bold block text-[#16a34a]">
                                    Ward: {w.ward.name}
                                  </span>
                                )}
                              </div>

                              {isSelected && (
                                <div className="flex size-5 items-center justify-center rounded-full bg-[#16a34a] text-white shrink-0">
                                  <FiCheck className="size-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ================= REASON & JUSTIFICATION ================= */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Operational Assignment Rationale
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide an operational rationale for this assignment..."
              className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#16a34a]/20 transition-all resize-none"
            />
          </div>

          {/* Governance Notice */}
          <div className="flex items-center gap-2 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] p-3 text-[11px] font-bold text-[#166534]">
            <FiShield className="text-[#16a34a] size-4 shrink-0" />
            <span>
              Dispatch immediately notifies the field worker via mobile push and issues an active repair work order.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#f1f5f9]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] px-4 py-2.5 text-xs font-extrabold text-[#475569] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedWorkerId}
              className="flex items-center gap-2 rounded-xl bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              {submitting && <FiRefreshCw className="size-3.5 animate-spin" />}
              <span>{submitting ? 'Dispatching Crew...' : 'Confirm & Dispatch Crew'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
