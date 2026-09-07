'use client';

import React from 'react';
import { FiX, FiUsers, FiBriefcase, FiCheck } from 'react-icons/fi';

type Option = { id: string; label: string; meta?: string };

export default function OperationsModal({ open, department, worker, departments, workers, onDepartment, onWorker, onClose, onSave, saving }: {
  open: boolean; department: string; worker: string; departments: Option[]; workers: Option[];
  onDepartment: (value: string) => void; onWorker: (value: string) => void; onClose: () => void; onSave: () => void; saving: boolean;
}) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="operations-modal-title">
    <button aria-label="Close assignment dialog" onClick={onClose} className="absolute inset-0 bg-[#351008]/45 backdrop-blur-[2px]" />
    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#E9E1D8] bg-[#FFFCF8] shadow-2xl">
      <div className="flex items-start justify-between border-b border-[#E9E1D8] bg-[#F7F4EE] px-6 py-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9B9088]">Operations control</p><h2 id="operations-modal-title" className="mt-1 text-xl font-semibold text-[#351008]">Assign ownership</h2><p className="mt-1 text-xs text-[#6F625C]">Choose the department and field worker responsible for this incident.</p></div>
        <button onClick={onClose} className="rounded-xl p-2 text-[#6F625C] hover:bg-white hover:text-[#5E1801]" aria-label="Close"><FiX /></button>
      </div>
      <div className="space-y-5 p-6">
        <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6F625C]"><FiBriefcase className="text-[#5E1801]" /> Department</span><select value={department} onChange={e => onDepartment(e.target.value)} className="premium-input w-full px-3 py-3 text-sm"><option value="">Select department</option>{departments.map(o => <option key={o.id} value={o.id}>{o.label}{o.meta ? ` · ${o.meta}` : ''}</option>)}</select></label>
        <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6F625C]"><FiUsers className="text-[#5E1801]" /> Field worker</span><select value={worker} onChange={e => onWorker(e.target.value)} className="premium-input w-full px-3 py-3 text-sm"><option value="">Select field worker</option>{workers.map(o => <option key={o.id} value={o.id}>{o.label}{o.meta ? ` · ${o.meta}` : ''}</option>)}</select></label>
        <div className="rounded-2xl border border-[#E9E1D8] bg-white p-4 text-xs text-[#6F625C]"><p className="font-semibold text-[#351008]">Assignment guardrails</p><p className="mt-1">Civique verifies city, ward, department, active status, and worker ownership before saving.</p></div>
      </div>
      <div className="flex justify-end gap-3 border-t border-[#E9E1D8] bg-white px-6 py-4"><button onClick={onClose} className="rounded-xl border border-[#D8CCC0] px-4 py-2.5 text-xs font-semibold text-[#6F625C] hover:bg-[#F7F4EE]">Cancel</button><button onClick={onSave} disabled={saving} className="premium-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider disabled:opacity-60">{saving ? 'Saving…' : <><FiCheck /> Save assignment</>}</button></div>
    </div>
  </div>;
}
