'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api/client';
import { FiCheck, FiLock, FiPlus, FiRefreshCw, FiShield, FiX } from 'react-icons/fi';

type Permission = { key: string; description: string; reserved: boolean };
type Role = {
  id: string;
  name: string;
  key: string;
  protected: boolean;
  description?: string | null;
  permissions?: string[];
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        apiFetch<{ roles: Role[] }>('/users/roles'),
        apiFetch<{ permissions: Permission[] }>('/users/permissions/catalog'),
      ]);
      setRoles(r.roles || []);
      setPermissions(p.permissions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load role policy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!/^[a-z][a-z0-9_.-]{2,60}$/.test(key)) {
      setError(
        'Role key must start with a lowercase letter and contain only lowercase letters, numbers, dots, hyphens, or underscores.'
      );
      return;
    }
    if (!selected.length) {
      setError('Select at least one non-reserved permission for this role.');
      return;
    }
    try {
      await apiFetch('/users/roles', {
        method: 'POST',
        body: JSON.stringify({ name, key, description, permissionKeys: selected }),
      });
      setMessage('Role created successfully.');
      setOpen(false);
      setName('');
      setKey('');
      setDescription('');
      setSelected([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create role.');
    }
  }

  return (
    <main className="min-h-full bg-white p-4 text-slate-900 md:p-8 font-sans text-left">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col justify-between gap-5 rounded-[26px] bg-[#143527] p-7 text-white shadow-xl md:flex-row md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              <FiShield /> Access governance
            </span>
            <h1 className="mt-3 text-3xl font-black md:text-4xl text-white">Roles & permissions</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 font-medium">
              Manage protected system roles and create least-privilege municipal access policies.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 hover:bg-white/10 px-4 py-3 text-xs font-black text-white transition-colors cursor-pointer"
            >
              <FiRefreshCw /> Refresh
            </button>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-100 px-4 py-3 text-xs font-black text-[#143527] shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus /> New role
            </button>
          </div>
        </header>

        {error && !open && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-[#143527]/20 bg-[#143527]/5 p-4 text-sm font-bold text-[#143527]">
            {message}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-5">
            <div>
              <h2 className="font-black text-slate-900">Role directory</h2>
              <p className="text-xs text-slate-500 font-medium">
                {roles.length} roles · {roles.filter((r) => r.protected).length} protected templates ·{' '}
                {roles.filter((r) => !r.protected).length} custom roles
              </p>
            </div>
            <span className="rounded-full bg-[#143527]/10 border border-[#143527]/20 px-3 py-1 text-[10px] font-black text-[#143527]">
              Default deny
            </span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-sm font-bold text-slate-500">Loading roles…</div>
            ) : (
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Key</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 font-black text-slate-900">{r.name}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            r.protected
                              ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {r.protected ? 'Protected' : 'Custom'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{r.key}</td>
                      <td className="max-w-sm px-5 py-4 text-xs text-slate-500 font-medium">
                        {r.description || 'Scoped municipal access role.'}
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-[#143527]">
                        {r.protected ? 'System controlled' : 'City managed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="border-b border-slate-100 bg-slate-50/50 p-5">
            <h2 className="font-black text-slate-900">Permission registry</h2>
            <p className="text-xs text-slate-500 font-medium">
              Reserved capabilities cannot be granted to custom roles.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Permission</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Assignment policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {permissions.map((p) => (
                  <tr key={p.key} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-bold text-slate-900">{p.key}</td>
                    <td className="px-5 py-4 text-xs text-slate-600 font-medium">{p.description}</td>
                    <td className="px-5 py-4">
                      {p.reserved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-slate-500">
                          <FiLock /> Reserved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-[#143527]">
                          <FiCheck /> Grantable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={create}
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#143527]">Custom policy</span>
                  <h2 className="mt-1 text-2xl font-black text-slate-900">Create new role</h2>
                  <p className="mt-1 text-xs text-slate-500 font-medium">Choose only the capabilities this team needs.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                  aria-label="Close"
                >
                  <FiX className="size-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Role display name"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20"
                />
                <input
                  required
                  pattern="[a-z][a-z0-9_.-]{2,60}"
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  placeholder="role.key (example: ward.supervisor)"
                  className="w-full rounded-xl border border-slate-200 p-3 font-mono text-sm outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20"
                />
                <p className="-mt-2 text-[11px] text-slate-500 font-medium">
                  Use lowercase letters, numbers, dots, hyphens, or underscores only.
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe operational responsibility"
                  className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:border-[#143527] focus:ring-2 focus:ring-[#143527]/20"
                />

                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-600">Select permissions</p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                    {permissions.map((p) => (
                      <label
                        key={p.key}
                        className={`flex items-center gap-3 p-3 text-xs font-medium cursor-pointer ${
                          p.reserved ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={p.reserved}
                          checked={selected.includes(p.key)}
                          onChange={() =>
                            setSelected((c) => (c.includes(p.key) ? c.filter((x) => x !== p.key) : [...c, p.key]))
                          }
                          className="accent-[#143527]"
                        />
                        <span className="flex-1">
                          <b className="block text-slate-900">{p.key}</b>
                          {p.description}
                        </span>
                        {p.reserved && <FiLock className="text-slate-400" />}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button className="rounded-xl bg-[#143527] hover:bg-[#0e271c] px-5 py-2.5 text-xs font-black text-white transition-colors cursor-pointer shadow-sm">
                    Create role
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
