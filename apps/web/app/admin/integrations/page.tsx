'use client';

import { useEffect, useState } from 'react';
import { FiRefreshCw, FiShield, FiLink } from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';

export default function IntegrationsPage() {
  const [adapters, setAdapters] = useState<any[]>([]);
  const [references, setReferences] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    Promise.all([
      apiFetch<any>('/integrations/adapters'),
      apiFetch<any>('/integrations/references'),
      apiFetch<any>('/integrations/deliveries'),
      apiFetch<any>('/integrations/conflicts'),
    ])
      .then(([a, r, d, c]) => {
        setAdapters(a.adapters || []);
        setReferences(r.references || []);
        setDeliveries(d.deliveries || []);
        setConflicts(c.conflicts || []);
      })
      .catch((err) => setError(err.message || 'Integration control plane unavailable.'))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    load();
  }, []);

  const retry = async (id: string) => {
    await apiFetch(`/integrations/deliveries/${id}/retry`, { method: 'POST' });
    load();
  };

  const resolve = async (id: string) => {
    const resolution = window.prompt('Resolution note');
    if (!resolution) return;
    await apiFetch(`/integrations/conflicts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
    load();
  };

  return (
    <main className="min-h-full bg-white px-5 py-7 sm:px-8 font-sans text-left">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-[#143527] p-7 text-white shadow-xl">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                <FiShield /> Authority adapter control
              </span>
              <h1 className="mt-3 text-3xl font-black text-white">Government integrations</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 font-medium">
                Manage signed, auditable adapters and external references without exposing provider secrets or claiming an official connection.
              </p>
            </div>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 hover:bg-white/10 px-4 py-2 text-xs font-black text-white transition-colors cursor-pointer"
            >
              <FiRefreshCw className={busy ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black text-slate-900">Configured adapters</h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Adapters remain disabled until authority approval and provider credentials are separately configured.
            </p>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
            {adapters.map((adapter) => (
              <article key={adapter.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-slate-900">{adapter.provider}</p>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-800">
                    {adapter.status}
                  </span>
                </div>
                <p className="mt-2 text-xs font-bold text-slate-600">
                  {adapter.channel} · city {adapter.cityId}
                </p>
                <p className="mt-3 text-[10px] text-slate-400 font-medium">
                  Webhook signatures, replay protection, and delivery receipts enabled.
                </p>
              </article>
            ))}
            {!adapters.length && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm font-bold text-slate-500 text-center col-span-full">
                No adapters configured.
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-black text-slate-900">Delivery queue</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Idempotent outbound messages and provider receipts.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {deliveries.slice(0, 8).map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      {delivery.provider} · {delivery.eventType}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">
                      {delivery.status} · attempt {delivery.attempts}
                    </p>
                  </div>
                  {['FAILED', 'RETRYING'].includes(delivery.status) && (
                    <button
                      onClick={() => retry(delivery.id)}
                      className="rounded-lg bg-[#143527] hover:bg-[#0e271c] text-white px-3 py-1.5 text-[10px] font-black transition-colors cursor-pointer"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ))}
              {!deliveries.length && <p className="p-8 text-xs text-slate-500 font-medium">No deliveries recorded.</p>}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-100 p-5">
              <h2 className="text-lg font-black text-slate-900">Open conflicts</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Operator resolution is explicit and audited.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {conflicts.slice(0, 8).map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-black text-slate-900">
                      {conflict.provider} · {conflict.externalId}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500">{conflict.kind}</p>
                  </div>
                  <button
                    onClick={() => resolve(conflict.id)}
                    className="rounded-lg bg-[#143527] hover:bg-[#0e271c] px-3 py-1.5 text-[10px] font-black text-white transition-colors cursor-pointer"
                  >
                    Resolve
                  </button>
                </div>
              ))}
              {!conflicts.length && <p className="p-8 text-xs text-slate-500 font-medium">No open conflicts.</p>}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-black text-slate-900">
              <FiLink className="text-[#143527]" /> External reference directory
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Duplicate-safe mappings between authority IDs and Civique Reports or Incidents.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">External ID</th>
                  <th className="px-5 py-3">Civique target</th>
                  <th className="px-5 py-3">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {references.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-black text-slate-900">{ref.provider}</td>
                    <td className="px-5 py-3 font-mono text-slate-700">{ref.externalId}</td>
                    <td className="px-5 py-3 text-slate-800 font-medium">
                      {ref.incidentId ? `Incident ${ref.incidentId.slice(0, 8)}` : `Report ${ref.reportId?.slice(0, 8)}`}
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(ref.lastSeenAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!references.length && (
              <div className="p-10 text-center text-sm font-bold text-slate-500">
                No external mappings yet.
              </div>
            )}
          </div>
        </section>

        <p className="text-center text-[11px] font-semibold text-slate-400">
          Inbound events are accepted only with a timestamped HMAC signature and a unique event ID. Provider outages never delete official civic records.
        </p>
      </div>
    </main>
  );
}
