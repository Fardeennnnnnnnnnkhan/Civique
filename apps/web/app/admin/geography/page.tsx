'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiCompass, FiDatabase, FiUploadCloud } from 'react-icons/fi';
import { apiFetch } from '../../../lib/api/client';
import { Button, Card, Input } from '../../../components/ui';

type Dataset = { id: string; source: string; version: string; checksum: string; status: string; importedAt: string | null; _count?: { wards: number } };

export default function GeographyAdministrationPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [source, setSource] = useState('IMC');
  const [version, setVersion] = useState('');
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [cityResponse, datasetResponse] = await Promise.all([
        apiFetch<{ cities: Array<{ id: string; name: string }> }>('/geography/cities'),
        apiFetch<{ datasets: Dataset[] }>(`/geography/datasets${cityId ? `?cityId=${encodeURIComponent(cityId)}` : ''}`),
      ]);
      setCities(cityResponse.cities || []);
      setDatasets(datasetResponse.datasets || []);
      if (!cityId && cityResponse.cities?.[0]) setCityId(cityResponse.cities[0].id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load geography datasets.');
    }
  };

  useEffect(() => { void load(); }, []);

  const importDataset = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const parsed = JSON.parse(payload) as { effectiveDate?: string; wards?: unknown[]; checksum?: string };
      if (!cityId || !version || !Array.isArray(parsed.wards)) throw new Error('Choose a city, enter a version, and provide a JSON object with a wards array.');
      const response = await apiFetch<{ dataset: Dataset; idempotent: boolean }>('/geography/import', { method: 'POST', body: JSON.stringify({ cityId, source, version, effectiveDate: parsed.effectiveDate, checksum: parsed.checksum, wards: parsed.wards }) });
      setMessage(response.idempotent ? 'This dataset was already imported; no duplicate boundaries were created.' : `Imported ${response.dataset._count?.wards || 0} ward boundaries successfully.`);
      setPayload('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The geography import failed validation.');
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 font-sans text-left bg-white min-h-screen">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#143527]">M3 · Jurisdiction control</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Geography & boundaries</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage versioned Indore-ready ward datasets. Imports are checksum-verified, idempotent, and scoped to the administrator’s city.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#143527]/20 bg-[#143527]/5 px-3 py-2 text-xs font-bold text-[#143527]">
          <FiCompass /> Boundary resolution active
        </div>
      </div>
      {message && <div role="status" className="rounded-xl border border-[#143527]/20 bg-[#143527]/5 px-4 py-3 text-sm font-bold text-[#143527]"><FiCheckCircle className="mr-2 inline" />{message}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="space-y-4 border-slate-200 bg-white p-6 shadow-xs">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><FiUploadCloud className="text-[#143527]" /> Import boundary dataset</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Use the approved GeoJSON-derived contract. Each ward needs sourceCode, name, zoneName, and Polygon/MultiPolygon boundary.</p>
          </div>
          <label className="block text-xs font-bold text-slate-600">City
            <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium">
              <option value="">Select city</option>
              {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </label>
          <Input label="Source" value={source} onChange={(e) => setSource(e.target.value)} />
          <Input label="Dataset version" placeholder="2026-09-20" value={version} onChange={(e) => setVersion(e.target.value)} />
          <label className="block text-xs font-bold text-slate-600">Dataset JSON
            <textarea aria-label="Geography dataset JSON" value={payload} onChange={(e) => setPayload(e.target.value)} rows={9} placeholder={'{"effectiveDate":"2026-09-20","wards":[...]}' } className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-900 outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20" />
          </label>
          <Button onClick={() => void importDataset()} isLoading={busy} className="w-full bg-[#143527] hover:bg-[#0e271c] text-white font-black">Validate & import dataset</Button>
        </Card>
        <Card className="space-y-4 border-slate-200 bg-white p-6 shadow-xs">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><FiDatabase className="text-[#143527]" /> Dataset history</h2>
            <p className="mt-1 text-xs text-slate-500">Checksums and import counts provide an audit trail for every boundary version.</p>
          </div>
          {datasets.length === 0 ? <div className="rounded-xl bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">No versioned datasets are available for this scope.</div> : <div className="space-y-3">{datasets.map((dataset) => <div key={dataset.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-slate-900">{dataset.source} · {dataset.version}</p><p className="text-xs text-slate-500">{dataset._count?.wards || 0} wards · {dataset.importedAt ? new Date(dataset.importedAt).toLocaleString('en-IN') : 'Not imported'}</p></div><span className="rounded-full bg-[#143527]/10 px-2.5 py-1 text-[11px] font-bold text-[#143527]">{dataset.status}</span></div><code className="mt-3 block break-all text-[10px] text-slate-400">SHA-256 {dataset.checksum}</code></div>)}</div>}
        </Card>
      </div>
    </div>
  );
}
