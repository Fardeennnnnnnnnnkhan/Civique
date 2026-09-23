'use client';

import { useState } from 'react';
import { FiGitMerge, FiSearch, FiShield, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { apiFetch } from '../../../lib/api/client';
import { Button, Card } from '../../../components/ui';

type Candidate = {
  incidentId: string;
  trackingId: string;
  category: string;
  status: string;
  distanceMeters: number;
  score: number;
  band: string;
  signals: Array<{ key: string; explanation: string; value: number }>;
};

export default function DuplicateReviewPage() {
  const [reportId, setReportId] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const search = async () => {
    if (!reportId.trim()) return setError('Enter a report ID to review.');
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await apiFetch<{ candidates?: Candidate[] }>(
        `/reports/duplicate-candidates/${reportId.trim()}`
      );
      setCandidates(response.candidates || []);
      if (!response.candidates?.length) {
        setMessage('No candidate incidents met the review threshold.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load duplicate candidates.');
    } finally {
      setLoading(false);
    }
  };

  const decide = async (candidateId: string, decision: 'LINK' | 'NOT_DUPLICATE') => {
    const reason = window.prompt(
      decision === 'LINK'
        ? 'Explain why this Report supports the existing Incident:'
        : 'Explain why this is not a duplicate:'
    );
    if (!reason?.trim()) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/reports/duplicate-candidates/${candidateId}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      });
      setCandidates((current) => current.filter((candidate) => candidate.incidentId !== candidateId));
      setMessage(
        decision === 'LINK'
          ? 'Report linked to the existing Incident and preserved in its history.'
          : 'Candidate marked as not a duplicate.'
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record duplicate decision.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-10 space-y-6 font-sans text-left">
      <section className="rounded-3xl bg-[#143527] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <FiGitMerge /> Duplicate intelligence
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Review corroborating reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 font-medium">
              Compare explainable spatial, category, and time signals before linking a Report to an existing municipal Incident.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <FiShield /> Backend-scoped review
          </div>
        </div>
      </section>

      <Card className="p-5 sm:p-6 border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={reportId}
            onChange={(event) => setReportId(event.target.value)}
            placeholder="Paste report UUID"
            className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20 text-slate-900"
          />
          <Button
            onClick={() => void search()}
            isLoading={loading}
            className="bg-[#143527] hover:bg-[#0e271c] text-white font-black cursor-pointer"
          >
            <FiSearch /> Find candidates
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500 font-medium">
          Only authorized municipal operators can retrieve candidates. Citizens and out-of-scope incidents are denied by the API.
        </p>
      </Card>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="rounded-xl border border-[#143527]/20 bg-[#143527]/5 px-4 py-3 text-sm font-semibold text-[#143527]">
          {message}
        </div>
      )}

      <section className="space-y-3">
        {candidates.map((candidate) => (
          <Card key={candidate.incidentId} className="p-5 border-slate-200 bg-white shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-slate-900">{candidate.trackingId}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                      candidate.band === 'LINK'
                        ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {candidate.band} · {Math.round(candidate.score * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  {candidate.category} · {candidate.status} · {candidate.distanceMeters}m away
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.signals.map((signal) => (
                    <span
                      key={signal.key}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
                    >
                      {signal.key}: {signal.explanation}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => void decide(candidate.incidentId, 'LINK')}
                  disabled={loading}
                  className="bg-[#143527] hover:bg-[#0e271c] text-white font-black cursor-pointer"
                >
                  <FiCheckCircle /> Link
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void decide(candidate.incidentId, 'NOT_DUPLICATE')}
                  disabled={loading}
                  className="cursor-pointer"
                >
                  <FiXCircle /> Not duplicate
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </main>
  );
}
