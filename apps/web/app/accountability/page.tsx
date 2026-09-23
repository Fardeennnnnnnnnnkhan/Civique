'use client';

import { useEffect, useState } from 'react';
import { FiBarChart2, FiDownload, FiRefreshCw, FiShield } from 'react-icons/fi';
import LoadingState from '../components/LoadingState';
import { apiFetch, API_BASE } from '@/lib/api/client';

type Metric = { value: number | null; suppressed: boolean; reason?: string };
type Scorecard = { metricVersion: string; generatedAt: string; window: { days: number }; methodology: { minimumPublicCohort: number }; summary: { reportVolume: Metric; resolutionRate: Metric; slaCompliance: Metric; medianResolutionHours: Metric }; categories: Array<{ category: string; cohort: number; resolutionRate: Metric }>; wards: Array<{ name: string; cohort: number; resolutionRate: Metric }>; departments: Array<{ name: string; cohort: number; resolutionRate: Metric }> };

function MetricCard({ label, metric, suffix = '' }: { label: string; metric: Metric; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-[#eef1ea] bg-white p-5 shadow-xs">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">{label}</p>
      <p className="mt-2 text-2xl sm:text-3xl font-black text-[#143527]">
        {metric.suppressed ? '—' : `${metric.value ?? 0}${suffix}`}
      </p>
      <p className="mt-1 text-[10px] font-semibold text-[#64748b]">
        {metric.suppressed ? 'Suppressed to protect small cohorts' : 'Versioned public aggregate'}
      </p>
    </div>
  );
}

export default function AccountabilityPage() {
  const [data, setData] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    apiFetch<Scorecard>('/incidents/accountability?days=30')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Accountability metrics are unavailable.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <LoadingState />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-white p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-900">
          {error || 'No public accountability data is available.'}
          <button onClick={load} className="ml-3 underline font-black">Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-[#0f172a] sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-[#143527] p-6 text-white shadow-xl sm:p-10 border border-[#eef1ea]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                <FiShield /> Public Accountability
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                How Civique is performing
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-200">
                Transparent municipal outcomes for the last {data.window.days} days. Metrics are reproducible, versioned, and privacy-protected.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-black text-white hover:bg-white/20 transition-all"
              >
                <FiRefreshCw /> Refresh
              </button>
              <a
                href={`${API_BASE}/incidents/accountability?days=${data.window.days}&format=csv`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-black text-[#143527] hover:bg-slate-100 transition-all shadow-xs"
              >
                <FiDownload /> CSV
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Public reports" metric={data.summary.reportVolume} />
          <MetricCard label="Resolution rate" metric={data.summary.resolutionRate} suffix="%" />
          <MetricCard label="SLA compliance" metric={data.summary.slaCompliance} suffix="%" />
          <MetricCard label="Median resolution" metric={data.summary.medianResolutionHours} suffix=" h" />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#eef1ea] bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-black text-[#0f172a]">
              <FiBarChart2 className="text-[#143527]" /> Service Categories
            </h2>
            <div className="mt-4 space-y-3">
              {data.categories.map((item) => (
                <div key={item.category} className="flex items-center justify-between border-b border-[#f1f5f9] pb-2 text-xs">
                  <span className="font-black text-[#0f172a]">{item.category.replaceAll('_', ' ')}</span>
                  <span className="font-bold text-[#143527]">
                    {item.resolutionRate.suppressed ? 'Protected' : `${item.resolutionRate.value}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#eef1ea] bg-white p-5 shadow-xs">
            <h2 className="text-sm font-black text-[#0f172a]">Ward Comparison</h2>
            <div className="mt-4 space-y-3">
              {data.wards.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b border-[#f1f5f9] pb-2 text-xs">
                  <span className="font-black text-[#0f172a]">{item.name}</span>
                  <span className="font-bold text-[#143527]">{item.resolutionRate.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#eef1ea] bg-white p-5 shadow-xs">
            <h2 className="text-sm font-black text-[#0f172a]">Responsible Departments</h2>
            <div className="mt-4 space-y-3">
              {data.departments.map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b border-[#f1f5f9] pb-2 text-xs">
                  <span className="max-w-[65%] truncate font-black text-[#0f172a]">{item.name}</span>
                  <span className="font-bold text-[#143527]">{item.resolutionRate.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="text-center text-[11px] font-semibold text-[#64748b]">
          Metric policy {data.metricVersion} · Minimum public cohort {data.methodology.minimumPublicCohort} · Generated {new Date(data.generatedAt).toLocaleString('en-IN')}
        </footer>
      </div>
    </main>
  );
}
