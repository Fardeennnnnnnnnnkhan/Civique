'use client';

import React, { useState, useEffect } from 'react';
import { 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiShield, 
  FiLock, 
  FiUnlock, 
  FiInfo,
  FiRefreshCw
} from 'react-icons/fi';
import { Dialog } from '../ui/dialog';
import { apiFetch } from '../../lib/api/client';

export interface TargetPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

interface UserStatusModalProps {
  open: boolean;
  onClose: () => void;
  person: TargetPerson | null;
  onSuccess: (updated: { id: string; active: boolean }) => void;
}

const SUSPEND_REASONS = [
  'Administrative leave / Absence',
  'Departmental transfer pending',
  'Security & credential review',
  'Disciplinary / Performance review',
  'Temporary account hold',
];

const REACTIVATE_REASONS = [
  'Returned from approved leave',
  'Security audit cleared',
  'Reinstated to active field roster',
  'Department transfer completed',
  'Routine account reactivation',
];

export default function UserStatusModal({
  open,
  onClose,
  person,
  onSuccess,
}: UserStatusModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSuspending = person ? person.active : true;

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
      setLoading(false);
    }
  }, [open, person]);

  if (!person) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide an audit reason with at least 3 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const targetActive = !person.active;
      const res = await apiFetch<{ user: { id: string; active: boolean } }>(
        `/users/${person.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            active: targetActive,
            reason: reason.trim(),
          }),
        }
      );

      onSuccess(res.user || { id: person.id, active: targetActive });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update account status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reasonList = isSuspending ? SUSPEND_REASONS : REACTIVATE_REASONS;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={isSuspending ? 'Suspend Municipal Account' : 'Reactivate Municipal Account'}
      description={`Manage credential and assignment permissions for ${person.name}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
        {/* User Summary Pill */}
        <div className={`rounded-xl p-3.5 border flex items-center justify-between ${
          isSuspending 
            ? 'bg-rose-50/70 border-rose-200/80 text-rose-950' 
            : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center font-black text-xs ${
              isSuspending ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {isSuspending ? <FiLock className="size-5" /> : <FiUnlock className="size-5" />}
            </div>
            <div>
              <p className="text-xs font-black capitalize tracking-tight">{person.name}</p>
              <p className="text-[11px] font-semibold text-slate-600">{person.email}</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
            person.active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            Currently {person.active ? 'Active' : 'Suspended'}
          </span>
        </div>

        {/* Warning / Notice Banner */}
        <div className={`p-3 rounded-xl border text-xs font-medium space-y-1.5 ${
          isSuspending 
            ? 'bg-amber-50/60 border-amber-200/80 text-amber-900' 
            : 'bg-blue-50/60 border-blue-200/80 text-blue-900'
        }`}>
          <div className="flex items-center gap-2 font-bold">
            {isSuspending ? (
              <FiAlertTriangle className="size-4 text-amber-600 shrink-0" />
            ) : (
              <FiInfo className="size-4 text-blue-600 shrink-0" />
            )}
            <span>{isSuspending ? 'Security & Operational Impact:' : 'Operational Reinstatement:'}</span>
          </div>
          <ul className="list-disc pl-5 text-[11px] space-y-0.5 text-slate-700">
            {isSuspending ? (
              <>
                <li>Revokes all active sessions and refresh tokens immediately.</li>
                <li>Halt new automated and manual incident dispatch assignments.</li>
                <li>Records an immutable audit trail entry with the reason below.</li>
              </>
            ) : (
              <>
                <li>Restores municipal dispatch eligibility and assignment pools.</li>
                <li>Allows official sign-in and mobile field application access.</li>
                <li>Records an immutable security activation log.</li>
              </>
            )}
          </ul>
        </div>

        {/* Quick Reason Suggestions */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
            Quick Preset Reasons
          </label>
          <div className="flex flex-wrap gap-1.5">
            {reasonList.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setReason(preset)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                  reason === preset
                    ? isSuspending
                      ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                      : 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100/80 border-slate-200 text-slate-700 hover:bg-slate-200/70 hover:border-slate-300'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Reason Text Input */}
        <div className="space-y-1">
          <label htmlFor="audit-reason" className="block text-xs font-black text-slate-900">
            Mandatory Audit Log Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="audit-reason"
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isSuspending
                ? 'Specify detailed justification for account suspension...'
                : 'Specify reason for account reactivation...'
            }
            className="w-full px-3.5 py-2.5 text-xs font-medium text-slate-900 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-slate-900 focus:outline-none transition-all resize-none placeholder:text-slate-400"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <FiAlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !reason.trim()}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black text-white shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
              isSuspending
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {loading ? (
              <>
                <FiRefreshCw className="size-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : isSuspending ? (
              <>
                <FiLock className="size-3.5" />
                <span>Confirm Account Suspension</span>
              </>
            ) : (
              <>
                <FiCheckCircle className="size-3.5" />
                <span>Confirm Reactivation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
