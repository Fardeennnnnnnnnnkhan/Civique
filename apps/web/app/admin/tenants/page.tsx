'use client';

import { useEffect, useState } from 'react';
import { FiGlobe, FiRefreshCw, FiShield } from 'react-icons/fi';
import { apiFetch } from '@/lib/api/client';

export default function TenantControlPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    apiFetch<any>('/tenants')
      .then((result) => {
        setTenants(result.tenants || []);
        if (!selected && result.tenants?.[0]) setSelected(result.tenants[0]);
      })
      .catch((err) => setError(err.message || 'Tenant control plane unavailable.'))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selected) {
      apiFetch<any>(`/tenants/${selected.cityId}/features`)
        .then((result) => setFeatures(result.features || []))
        .catch(() => undefined);
    }
  }, [selected]);

  const toggle = async (feature: any) => {
    await apiFetch(`/tenants/${selected.cityId}/features/${feature.key}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled: !feature.enabled, rolloutPercent: !feature.enabled ? 100 : 0 }),
    });
    setFeatures(
      features.map((item) =>
        item.key === feature.key ? { ...item, enabled: !item.enabled, rolloutPercent: !item.enabled ? 100 : 0 } : item
      )
    );
  };

  return (
    <main className="min-h-full bg-white px-5 py-7 sm:px-8 font-sans text-left">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-[#143527] p-7 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                <FiGlobe /> Multi-city governance
              </span>
              <h1 className="mt-3 text-3xl font-black text-white">City control plane</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 font-medium">
                Provision city tenants, manage isolated feature flags, and keep geography, policies, branding, and residency explicit.
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

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900">Tenants</h2>
              <span className="text-[10px] font-bold text-slate-500">{tenants.length} cities</span>
            </div>
            <div className="mt-4 space-y-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.cityId}
                  onClick={() => setSelected(tenant)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                    selected?.cityId === tenant.cityId
                      ? 'border-[#143527] bg-[#143527]/5'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className="text-sm font-black text-slate-900">{tenant.displayName}</p>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                    /{tenant.slug} · {tenant.dataResidency}
                  </p>
                </button>
              ))}
              {!tenants.length && <p className="p-5 text-xs text-slate-500 text-center">No provisioned tenant settings yet.</p>}
            </div>
          </section>

          <section className="space-y-6">
            {selected ? (
              <>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#143527]">Tenant profile</p>
                      <h2 className="mt-2 text-2xl font-black text-slate-900">{selected.displayName}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {selected.timezone} · {selected.defaultLocale} · residency {selected.dataResidency}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black ${
                        selected.active
                          ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {selected.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                  <div className="flex items-center gap-2">
                    <FiShield className="text-[#143527]" />
                    <h2 className="text-lg font-black text-slate-900">Feature flags</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Flags are city-scoped and evaluated server-side. Cross-city operators remain explicit.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {features.map((feature) => (
                      <button
                        key={feature.key}
                        onClick={() => toggle(feature)}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">{feature.key}</p>
                          <p className="mt-1 text-[10px] text-slate-500">Rollout {feature.rolloutPercent}%</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black transition-colors ${
                            feature.enabled
                              ? 'bg-[#143527] text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {feature.enabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    ))}
                    {!features.length && (
                      <p className="text-xs text-slate-500 col-span-full py-4 text-center">No city feature flags configured.</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-sm font-bold text-slate-500">
                Select a tenant to inspect its controls.
              </div>
            )}
          </section>
        </div>

        <p className="text-center text-[11px] font-semibold text-slate-400">
          Tenant settings are city-scoped. Official cross-city access is restricted to super administrators and every policy activation is versioned.
        </p>
      </div>
    </main>
  );
}
