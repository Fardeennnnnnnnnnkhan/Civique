'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiSearch, 
  FiSliders, 
  FiUser, 
  FiMail, 
  FiShield, 
  FiAlertCircle,
  FiAward,
  FiPhone,
  FiMapPin,
  FiUserPlus,
  FiCheckCircle,
  FiClock,
  FiBriefcase,
  FiCopy,
  FiRefreshCw,
  FiLock,
  FiUnlock,
  FiArrowRight,
  FiCheck
} from 'react-icons/fi';
import { apiFetch } from '../../../lib/api/client';
import { Dialog } from '../../../components/ui/dialog';
import UserStatusModal, { TargetPerson } from '@/components/civique/UserStatusModal';

interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  wardOrDept: string;
  activeTickets: number;
  active: boolean;
}

type City = { 
  id: string; 
  name: string; 
  zones: Array<{ 
    id: string; 
    name: string; 
    wards: Array<{ id: string; name: string }> 
  }> 
};

type Department = { 
  id: string; 
  name: string; 
  cityId: string | null 
};

const MANAGEABLE_ROLES = [
  'FIELD_WORKER', 
  'WARD_OFFICER', 
  'DEPARTMENT_HEAD', 
  'ZONAL_OFFICER', 
  'COMMISSIONER', 
  'CITY_ADMIN'
];

export default function PeopleDirectoryPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Status Modal
  const [statusModalPerson, setStatusModalPerson] = useState<TargetPerson | null>(null);

  // Invite Modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invite, setInvite] = useState({ 
    email: '', 
    role: 'FIELD_WORKER', 
    cityId: '', 
    zoneId: '', 
    wardId: '', 
    departmentId: '' 
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const loadData = () => {
    setLoading(true);
    setError('');
    apiFetch<{ 
      users?: Array<{ 
        id: string; 
        email: string | null; 
        phoneNumber: string | null; 
        role: string; 
        active: boolean; 
        wardId: string | null; 
        zoneId: string | null; 
        departmentId: string | null; 
        activeIncidentCount: number 
      }> 
    }>('/users/directory')
      .then((payload) => {
        setPeople(
          (payload.users || []).map((person) => ({
            id: person.id,
            name: person.email?.split('@')[0] || 'Civique User',
            email: person.email || 'No email registered',
            phone: person.phoneNumber || 'No phone registered',
            role: person.role,
            wardOrDept: person.wardId 
              ? `Ward ${person.wardId}` 
              : person.zoneId 
              ? `Zone ${person.zoneId}` 
              : person.departmentId 
              ? `Dept ${person.departmentId}` 
              : 'Municipal Jurisdiction',
            activeTickets: person.activeIncidentCount,
            active: person.active,
          }))
        );
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));

    Promise.all([
      apiFetch<{ cities: City[] }>('/geography/cities'),
      apiFetch<{ departments: Department[] }>('/geography/departments'),
    ])
      .then(([cityData, departmentData]) => {
        setCities(cityData.cities || []);
        setDepartments(departmentData.departments || []);
        const cityId = cityData.cities?.[0]?.id || '';
        setInvite((current) => ({ ...current, cityId }));
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    loadData();
  }, []);

  async function submitInvitation(event: React.FormEvent) {
    event.preventDefault();
    setInvitePending(true);
    setInviteResult('');
    setInviteError('');
    try {
      const payload = Object.fromEntries(
        Object.entries(invite).filter(([, value]) => value)
      );
      const result = await apiFetch<{ 
        invitation: { developmentToken?: string; deliveryStatus: string } 
      }>('/users/invitations', { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      });
      
      if (result.invitation.developmentToken) {
        setInviteResult(
          `${window.location.origin}/accept-invitation?token=${encodeURIComponent(result.invitation.developmentToken)}`
        );
      } else {
        setInviteResult('Invitation dispatch queued successfully.');
      }
      loadData();
    } catch (requestError) {
      setInviteError(requestError instanceof Error ? requestError.message : 'Unable to create official invitation.');
    } finally {
      setInvitePending(false);
    }
  }

  const selectedCity = cities.find((city) => city.id === invite.cityId);
  const availableWards = selectedCity?.zones.flatMap((zone) => zone.wards) || [];

  const filteredPeople = useMemo(() => {
    return people.filter(person => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        person.name.toLowerCase().includes(q) || 
        person.email.toLowerCase().includes(q) ||
        person.phone.toLowerCase().includes(q) ||
        person.wardOrDept.toLowerCase().includes(q);
      
      const matchesRole = roleFilter === 'ALL' || person.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && person.active) || 
        (statusFilter === 'SUSPENDED' && !person.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [people, searchTerm, roleFilter, statusFilter]);

  // Metrics for top status summary
  const metrics = useMemo(() => {
    const total = people.length;
    const activeWorkers = people.filter(p => p.role === 'FIELD_WORKER' && p.active).length;
    const wardOfficers = people.filter(p => p.role === 'WARD_OFFICER' && p.active).length;
    const totalTickets = people.reduce((sum, p) => sum + (p.activeTickets || 0), 0);
    const suspended = people.filter(p => !p.active).length;
    return { total, activeWorkers, wardOfficers, totalTickets, suspended };
  }, [people]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CITY_ADMIN':
      case 'COMMISSIONER':
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border border-rose-200 bg-rose-50 text-rose-800">
            <FiShield className="size-3 text-rose-600" /> ADMIN
          </span>
        );
      case 'WARD_OFFICER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border border-blue-200 bg-blue-50 text-blue-800">
            <FiAward className="size-3 text-blue-600" /> WARD OFFICER
          </span>
        );
      case 'FIELD_WORKER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border border-[#143527]/20 bg-[#143527]/5 text-[#143527]">
            <FiBriefcase className="size-3 text-[#143527]" /> FIELD CREW
          </span>
        );
      case 'DEPARTMENT_HEAD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide border border-purple-200 bg-purple-50 text-purple-800">
            <FiShield className="size-3 text-purple-600" /> DEPT HEAD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border border-slate-200 bg-slate-100 text-slate-700">
            <FiUser className="size-3 text-slate-500" /> {role.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6 space-y-6 text-left font-sans bg-white">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#143527] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-white/20 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <FiCheck className="size-4 text-white" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-3xl border border-[#eef1ea] bg-white p-5 md:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
              Municipal Personnel Directory
            </h1>
            <span className="rounded-full bg-[#143527]/10 border border-[#143527]/20 px-2.5 py-0.5 text-[10px] font-black text-[#143527]">
              RBAC DIRECTORY
            </span>
          </div>
          <p className="text-xs font-bold text-[#64748b]">
            Manage ward officers, department specialists, certified field technicians, and civic supervisors across all wards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-3.5 py-2 text-xs font-extrabold text-[#0f172a] shadow-2xs transition-colors cursor-pointer"
          >
            <FiRefreshCw className="size-3.5 text-[#64748b]" />
            <span>Refresh</span>
          </button>
          <button 
            type="button" 
            onClick={() => {
              setInviteOpen(true);
              setInviteError('');
              setInviteResult('');
            }} 
            className="flex items-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] text-white px-4 py-2 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
          >
            <FiUserPlus className="size-3.5 text-white" /> 
            <span>Invite Official</span>
          </button>
        </div>
      </div>

      {/* ================= METRIC SUMMARY BENTO ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Total Personnel</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f172a]">{metrics.total}</span>
            <span className="text-[10px] font-bold text-slate-400">accounts</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            {metrics.suspended > 0 ? `${metrics.suspended} currently suspended` : 'All accounts active'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Active Field Technicians</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f172a]">{metrics.activeWorkers}</span>
            <span className="text-[10px] font-bold text-[#143527]">operational</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Field-dispatch eligible</p>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Ward Triage Officers</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f172a]">{metrics.wardOfficers}</span>
            <span className="text-[10px] font-bold text-blue-600">assigned</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Ward-level supervisors</p>
        </div>

        <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Active Incident Workload</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f172a]">{metrics.totalTickets}</span>
            <span className="text-[10px] font-bold text-amber-600">in-progress</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Assigned grievances</p>
        </div>
      </div>

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] size-4" />
          <input
            type="text"
            placeholder="Filter personnel by name, email, phone, ward, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold text-[#0f172a] placeholder:text-[#94a3b8] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white focus:border-[#0f172a] focus:outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <FiSliders className="text-[#64748b] size-3.5" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter personnel by role"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="FIELD_WORKER">Field Crews</option>
              <option value="WARD_OFFICER">Ward Officers</option>
              <option value="DEPARTMENT_HEAD">Department Heads</option>
              <option value="CITY_ADMIN">City Admins</option>
              <option value="ZONAL_OFFICER">Zonal Officers</option>
              <option value="CITIZEN">Citizens</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter personnel by status"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2">
          <FiAlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-[#e2e8f0] bg-white p-16 text-center text-xs font-extrabold text-[#64748b] space-y-2">
          <FiRefreshCw className="size-6 text-[#94a3b8] animate-spin mx-auto" />
          <p>Loading authorized municipal directory…</p>
        </div>
      )}

      {/* ================= PERSONNEL GRID ================= */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
          {filteredPeople.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-[#cbd5e1] bg-white p-16 text-center space-y-3">
              <FiAlertCircle className="size-8 text-[#94a3b8] mx-auto" />
              <h3 className="text-sm font-black text-[#0f172a]">No personnel matching filters</h3>
              <p className="text-xs text-[#64748b]">Try adjusting your search keywords or clear the active role filter.</p>
            </div>
          ) : (
            filteredPeople.map((person) => (
              <div 
                key={person.id}
                className="group relative rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-2xs hover:shadow-lg hover:border-slate-400/80 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between space-y-4 text-left cursor-pointer overflow-hidden"
                onClick={() => router.push(`/admin/people/${person.id}`)}
              >
                {/* Top subtle hover accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-all ${
                  person.active ? 'bg-slate-200 group-hover:bg-[#143527]' : 'bg-rose-400 group-hover:bg-rose-600'
                }`} />

                <div>
                  {/* Top card bar: Role + Status */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="size-11 rounded-xl bg-[#143527] text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {person.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${
                          person.active ? 'bg-[#143527]' : 'bg-rose-500'
                        }`} />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-[#0f172a] group-hover:text-black transition-colors capitalize">
                          {person.name}
                        </h2>
                        <span className="text-[10px] font-bold text-[#64748b]">
                          {person.active ? 'Active on Roster' : 'Suspended Account'}
                        </span>
                      </div>
                    </div>
                    {getRoleBadge(person.role)}
                  </div>

                  {/* Contact & Jurisdiction Details */}
                  <div className="mt-3.5 space-y-2 text-xs font-semibold text-[#334155]">
                    <div className="flex items-center gap-2 text-[#64748b] group-hover:text-[#0f172a] transition-colors">
                      <FiMail className="size-3.5 shrink-0 text-[#94a3b8]" />
                      <span className="truncate font-mono text-[11px]">{person.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#64748b]">
                      <FiPhone className="size-3.5 shrink-0 text-[#94a3b8]" />
                      <span>{person.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#0f172a] font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <FiMapPin className="size-3.5 shrink-0 text-[#143527]" />
                      <span className="truncate">{person.wardOrDept}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom workload & Action footer */}
                <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                    <span>Workload:</span>
                    {person.active ? (
                      <span className={`px-2 py-0.5 rounded-full font-black ${
                        person.activeTickets > 3 
                          ? 'bg-amber-100 text-amber-800' 
                          : person.activeTickets > 0 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {person.activeTickets} {person.activeTickets === 1 ? 'Task' : 'Tasks'}
                      </span>
                    ) : (
                      <span className="text-rose-600 font-black">Suspended</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {/* Suspend / Reactivate Quick Trigger */}
                    <button
                      type="button"
                      title={person.active ? 'Suspend Account' : 'Reactivate Account'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusModalPerson(person);
                      }}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        person.active
                          ? 'border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                          : 'border-[#143527]/20 text-[#143527] bg-[#143527]/5 hover:bg-[#143527]/10'
                      }`}
                    >
                      {person.active ? <FiLock className="size-3.5" /> : <FiUnlock className="size-3.5" />}
                    </button>

                    {/* View Dossier Button */}
                    <Link
                      href={`/admin/people/${person.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#143527] text-white hover:bg-[#0e271c] text-[11px] font-black shadow-2xs transition-all"
                    >
                      <span>Dossier</span>
                      <FiArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= DEDICATED USER STATUS MODAL (SUSPEND / REACTIVATE) ================= */}
      <UserStatusModal
        open={Boolean(statusModalPerson)}
        onClose={() => setStatusModalPerson(null)}
        person={statusModalPerson}
        onSuccess={(updated) => {
          setPeople((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, active: updated.active } : p))
          );
          showToast(`Account successfully ${updated.active ? 'reactivated' : 'suspended'}.`);
        }}
      />

      {/* ================= INVITATION MODAL ================= */}
      <Dialog 
        open={inviteOpen} 
        onClose={() => setInviteOpen(false)} 
        title="Invite Municipal Personnel" 
        description="Configure municipal boundary scoping and credentials. Civique verifies role hierarchy and zone/ward jurisdiction on the backend."
      >
        {inviteError && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-xs font-bold text-rose-800"
          >
            <FiAlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
            <span>{inviteError}</span>
          </div>
        )}
        <form className="space-y-4 text-left" onSubmit={submitInvitation}>
          <div>
            <label className="block text-xs font-extrabold text-[#0f172a] mb-1" htmlFor="invite-email">
              Official Email Address
            </label>
            <input 
              id="invite-email" 
              type="email" 
              required 
              placeholder="officer.name@indore.gov.in"
              value={invite.email} 
              onChange={(event) => setInvite({ ...invite, email: event.target.value })} 
              className="w-full px-3 py-2 text-xs font-bold text-[#0f172a] rounded-xl border border-[#e2e8f0] bg-white focus:border-[#0f172a] focus:outline-none" 
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#0f172a] mb-1" htmlFor="invite-role">
              Designated Role
            </label>
            <select 
              id="invite-role" 
              value={invite.role} 
              onChange={(event) => setInvite({ ...invite, role: event.target.value })} 
              className="w-full px-3 py-2 text-xs font-bold text-[#0f172a] rounded-xl border border-[#e2e8f0] bg-white focus:border-[#0f172a] focus:outline-none cursor-pointer"
            >
              {MANAGEABLE_ROLES.map((role) => (
                <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-[#0f172a] mb-1" htmlFor="invite-city">
              Municipal City
            </label>
            <select 
              id="invite-city" 
              required 
              value={invite.cityId} 
              onChange={(event) => setInvite({ ...invite, cityId: event.target.value, zoneId: '', wardId: '', departmentId: '' })} 
              className="w-full px-3 py-2 text-xs font-bold text-[#0f172a] rounded-xl border border-[#e2e8f0] bg-white focus:border-[#0f172a] focus:outline-none cursor-pointer"
            >
              <option value="">Select city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>

          {invite.role === 'ZONAL_OFFICER' && (
            <div>
              <label className="block text-xs font-extrabold text-[#0f172a] mb-1" htmlFor="invite-zone">
                Assigned Zone
              </label>
              <select 
                id="invite-zone" 
                required 
                value={invite.zoneId} 
                onChange={(event) => setInvite({ ...invite, zoneId: event.target.value })} 
                className="w-full px-3 py-2 text-xs font-bold text-[#0f172a] rounded-xl border border-[#e2e8f0] bg-white focus:border-[#0f172a] focus:outline-none cursor-pointer"
              >
                <option value="">Select zone</option>
                {selectedCity?.zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
          )}

          {['FIELD_WORKER', 'WARD_OFFICER'].includes(invite.role) && (
            <div>
              <label className="block text-xs font-extrabold text-[#0f172a] mb-1" htmlFor="invite-ward">
                Assigned Municipal Ward
              </label>
              <select 
                id="invite-ward" 
                required 
                value={invite.wardId} 
                onChange={(event) => setInvite({ ...invite, wardId: event.target.value })} 
                className="w-full px-3 py-2 text-xs font-bold text-[#0f172a] rounded-xl border border-[#e2e8f0] bg-white focus:border-[#0f172a] focus:outline-none cursor-pointer"
              >
                <option value="">Select ward</option>
                {availableWards.map((ward) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
            </div>
          )}

          {['FIELD_WORKER', 'DEPARTMENT_HEAD'].includes(invite.role) && (
            <div>
              <label className="block text-xs font-extrabold text-[#0f172a] mb-1" htmlFor="invite-department">
                Assigned Department
              </label>
              <select 
                id="invite-department" 
                required 
                value={invite.departmentId} 
                onChange={(event) => setInvite({ ...invite, departmentId: event.target.value })} 
                className="w-full px-3 py-2 text-xs font-bold text-[#0f172a] rounded-xl border border-[#e2e8f0] bg-white focus:border-[#0f172a] focus:outline-none cursor-pointer"
              >
                <option value="">Select department</option>
                {departments
                  .filter((department) => department.cityId === invite.cityId)
                  .map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                  ))}
              </select>
            </div>
          )}

          {inviteResult && (
            <div className="rounded-xl bg-[#143527]/5 border border-[#143527]/20 p-3 text-xs text-[#143527] space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5">
                  <FiCheckCircle className="text-[#143527] size-3.5" /> Invitation Active
                </span>
                {inviteResult.startsWith('http') && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteResult);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[10px] font-black uppercase text-[#143527] hover:text-[#0e271c] cursor-pointer"
                  >
                    <FiCopy className="size-3" /> {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                )}
              </div>
              <p className="break-all font-mono text-[11px] text-slate-700 bg-white/70 p-2 rounded border border-[#143527]/20">
                {inviteResult}
              </p>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={invitePending} 
              className="w-full rounded-xl bg-[#143527] hover:bg-[#0e271c] text-white font-extrabold text-xs py-2.5 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
            >
              {invitePending ? 'Dispatching Invitation…' : 'Generate Official Invitation'}
            </button>
          </div>
        </form>
      </Dialog>

    </div>
  );
}
