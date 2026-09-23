'use client';

import { useEffect, useState } from 'react';
import { FiActivity, FiInfo, FiRefreshCw, FiShield } from 'react-icons/fi';
import LoadingState from '../components/LoadingState';
import { apiFetch } from '@/lib/api/client';

type Ward = {
  id: string;
  name: string;
  health: {
    score: number | null;
    confidence: number;
    completeness: number;
    suppressed: boolean;
    components: Record<string, number>;
    explanation: string[];
    eligible: number;
  };
};

type HealthData = {
  metricVersion: string;
  generatedAt: string;
  policyId: string;
  wards: Ward[];
};

export default function CivicHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [methodology, setMethodology] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch<HealthData>('/civic-health/wards'),
      apiFetch<any>('/civic-health/methodology'),
    ])
      .then(([scores, method]) => {
        setData(scores);
        setMethodology(method);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Civic health is temporarily unavailable.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-white p-6 font-sans">
        <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-900">
          {error || 'No civic health data is available.'}
          <button className="ml-3 underline hover:text-rose-700 cursor-pointer" onClick={load}>
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-8 font-sans text-left">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-[#143527] p-6 text-white shadow-xl sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                <FiShield /> Civic health index
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-5xl text-white">Ward health, explained</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-300">
                A transparent 30-day signal built from unresolved burden, severity, SLA performance, recurrence, resolution quality, and citizen confirmation.
              </p>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-white/20 hover:bg-white/10 px-4 py-2.5 text-xs font-black text-white transition-colors sm:self-auto cursor-pointer"
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.wards.map((ward) => (
            <article key={ward.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-slate-900">{ward.name}</h2>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                    {ward.health.eligible} eligible incidents · {Math.round(ward.health.confidence * 100)}% confidence
                  </p>
                </div>
                <div
                  className={`rounded-xl px-3 py-2 text-lg font-black ${
                    ward.health.suppressed
                      ? 'bg-slate-100 text-slate-500'
                      : ward.health.score! >= 70
                      ? 'bg-[#143527]/10 text-[#143527]'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {ward.health.suppressed ? '—' : ward.health.score}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {Object.entries(ward.health.components).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500">
                      <span>{key.replaceAll(/([A-Z])/g, ' $1')}</span>
                      <span>{Math.round(value)}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-1.5 rounded-full bg-[#143527]" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {ward.health.suppressed && (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[10px] font-semibold text-slate-600">
                  This score is withheld because the ward has fewer than five eligible incidents.
                </p>
              )}
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <FiInfo className="text-[#143527]" /> Methodology and uncertainty
          </h2>
          <div className="mt-3 grid gap-4 text-xs font-semibold text-slate-600 sm:grid-cols-2">
            <p>
              Policy version <strong className="text-slate-900">{data.metricVersion}</strong>. Minimum cohort:{' '}
              <strong className="text-slate-900">{methodology?.minimumCohort ?? 5}</strong>.
            </p>
            <p>
              Every score traces to policy {data.policyId} and a 30-day authoritative Incident window. Scores are not rankings of individual employees.
            </p>
          </div>
        </section>

        <footer className="flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
          <FiActivity /> Generated {new Date(data.generatedAt).toLocaleString('en-IN')}
        </footer>
      </div>
    </main>
  );
}
