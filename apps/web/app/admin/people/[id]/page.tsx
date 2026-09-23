'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiArrowLeft, 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiShield, 
  FiAward, 
  FiBriefcase, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiAlertTriangle, 
  FiClock, 
  FiRefreshCw, 
  FiLock, 
  FiUnlock, 
  FiCopy, 
  FiExternalLink, 
  FiActivity, 
  FiLayers, 
  FiCheckSquare, 
  FiCalendar, 
  FiTrendingUp, 
  FiSliders,
  FiFileText,
  FiCheck
} from 'react-icons/fi';
import LoadingState from '../../../components/LoadingState';
import { apiFetch } from '../../../../lib/api/client';
import { StatusBadge, PriorityBadge } from '@/components/ui';
import UserStatusModal, { TargetPerson } from '@/components/civique/UserStatusModal';

interface WorkerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkerDetailPage({ params }: WorkerDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const userId = resolvedParams.id;

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'incidents' | 'workOrders' | 'resolutions' | 'audit'>('overview');
  
  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [copiedText, setCopiedText] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const loadData = () => {
    setLoading(true);
    setError('');
    apiFetch<{ employee: any }>(`/users/${userId}`)
      .then((res) => {
        setEmployee(res.employee);
      })
      .catch((err: any) => {
        setError(err?.message || 'Unable to load municipal worker dossier.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[70vh] flex flex-col items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="w-full px-4 sm:px-6 md:px-8 py-8 text-left font-sans bg-white space-y-6">
        <Link
          href="/admin/people"
          className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-slate-900 transition-colors"
        >
          <FiArrowLeft className="size-4" />
          <span>Back to Personnel Directory</span>
        </Link>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center max-w-2xl mx-auto space-y-3">
          <FiAlertCircle className="size-10 text-rose-600 mx-auto" />
          <h2 className="text-base font-black text-rose-900">Personnel Dossier Unavailable</h2>
          <p className="text-xs font-medium text-rose-700">{error || 'Worker record could not be found within your administrative jurisdiction.'}</p>
          <div className="pt-2">
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-all cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  const workerName = employee.email ? employee.email.split('@')[0] : 'Municipal Official';
  const roleName = employee.role?.replace(/_/g, ' ') || 'MUNICIPAL WORKER';
  const totalWorkOrders = employee.workOrderCount || 0;
  const completedWorkOrders = employee.completedWorkOrderCount || 0;
  const completionPercent = totalWorkOrders > 0 ? Math.round((completedWorkOrders / totalWorkOrders) * 100) : 0;
  const complianceRate = employee.performance?.slaComplianceRate ?? 100;

  const targetPerson: TargetPerson = {
    id: employee.id,
    name: workerName,
    email: employee.email || 'No email registered',
    role: employee.role,
    active: employee.active,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'CITY_ADMIN':
      case 'COMMISSIONER':
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black tracking-wide border border-rose-200 bg-rose-50 text-rose-800 shadow-2xs">
            <FiShield className="size-3.5 text-rose-600" /> ADMIN
          </span>
        );
      case 'WARD_OFFICER':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black tracking-wide border border-blue-200 bg-blue-50 text-blue-800 shadow-2xs">
            <FiAward className="size-3.5 text-blue-600" /> WARD OFFICER
          </span>
        );
      case 'FIELD_WORKER':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black tracking-wide border border-[#143527]/20 bg-[#143527]/5 text-[#143527] shadow-2xs">
            <FiBriefcase className="size-3.5 text-[#143527]" /> FIELD TECHNICIAN
          </span>
        );
      case 'DEPARTMENT_HEAD':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black tracking-wide border border-purple-200 bg-purple-50 text-purple-800 shadow-2xs">
            <FiShield className="size-3.5 text-purple-600" /> DEPT HEAD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold tracking-wide border border-slate-200 bg-slate-100 text-slate-700 shadow-2xs">
            <FiUser className="size-3.5 text-slate-500" /> {role.replace(/_/g, ' ')}
          </span>
        );
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6 space-y-6 font-sans text-left bg-white">
      
      {/* Toast notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#143527] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-[#143527] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <FiCheck className="size-4 text-emerald-300" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* ================= TOP BREADCRUMB & ACTION BAR ================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <Link
          href="/admin/people"
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-extrabold text-slate-700 transition-all shadow-2xs cursor-pointer"
        >
          <FiArrowLeft className="size-3.5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Personnel Directory</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <FiRefreshCw className="size-3.5 text-slate-500" />
            <span>Refresh Dossier</span>
          </button>
          
          <button
            type="button"
            onClick={() => copyToClipboard(window.location.href, 'Dossier Link')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <FiCopy className="size-3.5 text-slate-500" />
            <span>{copiedText === 'Dossier Link' ? 'Copied!' : 'Share Dossier'}</span>
          </button>

          {/* Suspend / Reactivate Primary Action */}
          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer ${
              employee.active
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-[#143527] hover:bg-[#0e271c] text-white border border-[#143527]'
            }`}
          >
            {employee.active ? (
              <>
                <FiLock className="size-3.5 text-rose-600" />
                <span>Suspend Official</span>
              </>
            ) : (
              <>
                <FiUnlock className="size-3.5 text-white" />
                <span>Reactivate Official</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= HERO HEADER CARD ================= */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className={`absolute -right-20 -top-20 size-80 rounded-full blur-3xl opacity-15 pointer-events-none ${
          employee.active ? 'bg-[#143527]' : 'bg-rose-500'
        }`} />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Avatar + Main Identity Info */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="relative">
              <div className="size-16 sm:size-20 rounded-2xl bg-[#143527] text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-md border-2 border-[#143527]">
                {workerName.substring(0, 2).toUpperCase()}
              </div>
              <span className={`absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-white flex items-center justify-center ${
                employee.active ? 'bg-[#143527]' : 'bg-rose-500'
              }`}>
                <span className={`size-2 rounded-full bg-white ${employee.active ? 'animate-pulse' : ''}`} />
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 capitalize tracking-tight">
                  {workerName}
                </h1>
                {getRoleBadge(employee.role)}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  employee.active 
                    ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {employee.active ? 'Active Duty' : 'Account Suspended'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <FiMail className="size-3.5 text-slate-400" />
                  <span className="font-mono">{employee.email || 'No email registered'}</span>
                  <button 
                    type="button" 
                    onClick={() => copyToClipboard(employee.email || '', 'Email')} 
                    className="text-slate-400 hover:text-slate-900 cursor-pointer"
                  >
                    <FiCopy className="size-3" />
                  </button>
                </span>

                {employee.phoneNumber && (
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <FiPhone className="size-3.5 text-slate-400" />
                    <span>{employee.phoneNumber}</span>
                  </span>
                )}

                <span className="flex items-center gap-1.5 text-[#143527] font-bold bg-[#143527]/5 px-2 py-0.5 rounded-lg border border-[#143527]/20">
                  <FiMapPin className="size-3.5 text-[#143527]" />
                  <span>
                    {employee.ward?.name ? `Ward ${employee.ward.name}` : employee.zone?.name ? `Zone ${employee.zone.name}` : employee.city?.name || 'Jurisdiction Wide'}
                  </span>
                </span>

                {employee.department?.name && (
                  <span className="flex items-center gap-1.5 text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200/60">
                    <FiBriefcase className="size-3.5 text-purple-600" />
                    <span>{employee.department.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Badges on Right */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center min-w-[110px] flex-1 sm:flex-initial">
              <span className="block text-[10px] font-black uppercase text-slate-400">Account Age</span>
              <span className="text-xs font-black text-slate-900">
                {new Date(employee.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center min-w-[110px] flex-1 sm:flex-initial">
              <span className="block text-[10px] font-black uppercase text-slate-400">Security MFA</span>
              <span className={`text-xs font-black ${employee.mfaEnabled ? 'text-[#143527]' : 'text-amber-700'}`}>
                {employee.mfaEnabled ? 'Enrolled' : 'Standard PIN'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-center min-w-[110px] flex-1 sm:flex-initial">
              <span className="block text-[10px] font-black uppercase text-slate-400">Active Sessions</span>
              <span className="text-xs font-black text-slate-900">{employee.sessionCount ?? 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= BENTO METRICS GRID ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Metric 1: Active Workload */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Incident Load</span>
            <span className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FiClock className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{employee.activeIncidentCount ?? 0}</span>
            <span className="text-xs font-bold text-amber-600">in-progress</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Assigned field grievances</p>
        </div>

        {/* Metric 2: Completed Work Orders */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Lifetime Work Orders</span>
            <span className="size-8 rounded-xl bg-[#143527]/10 text-[#143527] flex items-center justify-center">
              <FiCheckSquare className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{completedWorkOrders}</span>
            <span className="text-xs font-bold text-slate-400">/ {totalWorkOrders} orders</span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#143527] h-full rounded-full transition-all duration-500" 
              style={{ width: `${completionPercent}%` }} 
            />
          </div>
        </div>

        {/* Metric 3: SLA Compliance Rate */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">SLA Compliance</span>
            <span className="size-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiTrendingUp className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{complianceRate}%</span>
            <span className={`text-xs font-bold ${complianceRate >= 90 ? 'text-[#143527]' : 'text-amber-600'}`}>
              on-time
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">
            {employee.performance?.slaBreachedCount ?? 0} total breached SLA incidents
          </p>
        </div>

        {/* Metric 4: Resolution Submissions */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Verified Proofs</span>
            <span className="size-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FiCheckCircle className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">
              {(employee.resolutionSubmissions || []).length}
            </span>
            <span className="text-xs font-bold text-purple-600">submissions</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">AI & Citizen verified resolutions</p>
        </div>
      </div>

      {/* ================= NAVIGATION TABS ================= */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 overflow-x-auto pb-px">
        {[
          { key: 'overview', label: 'Overview & Profile', count: null },
          { key: 'incidents', label: 'Assigned Incidents', count: (employee.assignedIncidents || []).length },
          { key: 'workOrders', label: 'Work Orders', count: (employee.workOrders || []).length },
          { key: 'resolutions', label: 'Field Evidence Submissions', count: (employee.resolutionSubmissions || []).length },
          { key: 'audit', label: 'Security & Audit Logs', count: (employee.recentSecurityEvents || []).length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-black border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#143527] text-[#143527]'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === tab.key ? 'bg-[#143527] text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================= TAB CONTENT ================= */}

      {/* 1. OVERVIEW & PROFILE TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Detailed Personal & Scope Dossier */}
          <div className="lg:col-span-2 space-y-6">
            {/* Jurisdiction & Role Assignment */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FiMapPin className="size-4 text-[#143527]" />
                  <h3 className="text-sm font-black text-slate-900">Municipal Scope & Jurisdiction</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">RBAC Verified</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Municipal City</span>
                  <p className="mt-1 text-xs font-black text-slate-900">{employee.city?.name || 'All Cities / System Admin'}</p>
                  <p className="text-[10px] font-medium text-slate-500">ID: {employee.cityId || 'Global'}</p>
                </div>

                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Zone</span>
                  <p className="mt-1 text-xs font-black text-slate-900">{employee.zone?.name || 'City-Wide Jurisdiction'}</p>
                  <p className="text-[10px] font-medium text-slate-500">ID: {employee.zoneId || 'Unrestricted'}</p>
                </div>

                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Assigned Ward</span>
                  <p className="mt-1 text-xs font-black text-slate-900">{employee.ward?.name ? `Ward ${employee.ward.name}` : 'Multi-Ward Assigned'}</p>
                  <p className="text-[10px] font-medium text-slate-500">ID: {employee.wardId || 'None'}</p>
                </div>

                <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Department</span>
                  <p className="mt-1 text-xs font-black text-slate-900">{employee.department?.name || 'General Municipal Service'}</p>
                  <p className="text-[10px] font-medium text-slate-500">ID: {employee.departmentId || 'Unscoped'}</p>
                </div>
              </div>
            </div>

            {/* Department SLA & Categories Profile */}
            {employee.department && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FiBriefcase className="size-4 text-purple-600" />
                    <h3 className="text-sm font-black text-slate-900">Department SLA & Routing Standards</h3>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {employee.department.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Standard Resolution SLA</span>
                    <p className="mt-1 text-base font-black text-slate-900">{employee.department.defaultSlaHours} Hours</p>
                    <p className="text-[10px] font-medium text-slate-500">Target turnaround per ticket</p>
                  </div>

                  <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">SLA Warning Window</span>
                    <p className="mt-1 text-base font-black text-slate-900">{employee.department.warningThresholdHours} Hours</p>
                    <p className="text-[10px] font-medium text-slate-500">Automated supervisor escalation</p>
                  </div>
                </div>

                {employee.department.handledCategories?.length > 0 && (
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Handled Issue Categories</span>
                    <div className="flex flex-wrap gap-1.5">
                      {employee.department.handledCategories.map((cat: string) => (
                        <span key={cat} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 3: Contact & Security Info */}
          <div className="space-y-6">
            {/* Contact Details Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                <FiUser className="size-4 text-slate-600" />
                <span>Contact & Communication</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400">Email Address</span>
                  <div className="mt-0.5 flex items-center justify-between text-slate-800 font-medium">
                    <span className="truncate">{employee.email || 'None registered'}</span>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(employee.email || '', 'Email')}
                      className="text-slate-400 hover:text-slate-900 cursor-pointer ml-2"
                    >
                      <FiCopy className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400">Phone Number</span>
                  <p className="mt-0.5 text-slate-800 font-medium">{employee.phoneNumber || 'Not provided'}</p>
                </div>

                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400">Notification Channels</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      employee.notificationInApp ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20' : 'bg-slate-100 text-slate-400'
                    }`}>
                      In-App: {employee.notificationInApp ? 'ON' : 'OFF'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      employee.notificationEmail ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20' : 'bg-slate-100 text-slate-400'
                    }`}>
                      Email: {employee.notificationEmail ? 'ON' : 'OFF'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      employee.notificationSms ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20' : 'bg-slate-100 text-slate-400'
                    }`}>
                      SMS: {employee.notificationSms ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Status Box */}
            <div className={`rounded-2xl border p-5 space-y-3 ${
              employee.active ? 'bg-[#143527]/5 border-[#143527]/20' : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  {employee.active ? <FiCheckCircle className="text-[#143527]" /> : <FiAlertTriangle className="text-rose-600" />}
                  <span>Account State</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  employee.active ? 'bg-[#143527]/20 text-[#143527]' : 'bg-rose-200 text-rose-900'
                }`}>
                  {employee.active ? 'ACTIVE' : 'SUSPENDED'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {employee.active 
                  ? 'This account is eligible to receive automated incident routing, field work orders, and triage tasks.'
                  : 'Account is currently suspended. Worker cannot sign in or receive new ticket assignments.'}
              </p>
              <button
                type="button"
                onClick={() => setStatusModalOpen(true)}
                className={`w-full py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  employee.active 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                    : 'bg-[#143527] hover:bg-[#0e271c] text-white'
                }`}
              >
                {employee.active ? 'Suspend Account' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ASSIGNED INCIDENTS TAB */}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Assigned Civic Grievances ({employee.assignedIncidents?.length ?? 0})
            </h3>
            <span className="text-xs text-slate-500 font-semibold">Ordered by active urgency</span>
          </div>

          {(!employee.assignedIncidents || employee.assignedIncidents.length === 0) ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-2">
              <FiCheckCircle className="size-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-black text-slate-900">No Incidents Assigned</h4>
              <p className="text-xs text-slate-500 font-medium">This technician currently has no open or past assigned grievances.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employee.assignedIncidents.map((inc: any) => {
                const isResolved = inc.status === 'RESOLVED';
                return (
                  <div
                    key={inc.id}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Top status bar */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <span className="text-xs font-mono font-black text-slate-900">
                          #{inc.publicTrackingId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={inc.priority} />
                          <StatusBadge status={inc.status} />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="mt-3 space-y-1.5 text-left">
                        <h4 className="text-xs font-black text-slate-900 group-hover:text-black">
                          {inc.reports?.[0]?.title || inc.category.replace(/_/g, ' ')}
                        </h4>
                        {inc.reports?.[0]?.landmark && (
                          <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <FiMapPin className="size-3 text-[#143527] shrink-0" />
                            <span className="truncate">{inc.reports[0].landmark}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-bold">
                        {new Date(inc.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                      <Link
                        href={`/admin/incidents/${inc.id}`}
                        className="inline-flex items-center gap-1 text-xs font-black text-slate-900 hover:text-[#143527]"
                      >
                        <span>Open Incident</span>
                        <FiExternalLink className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. WORK ORDERS TAB */}
      {activeTab === 'workOrders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Field Work Orders ({employee.workOrders?.length ?? 0})
            </h3>
            <span className="text-xs text-slate-500 font-semibold">Chronological operational tasks</span>
          </div>

          {(!employee.workOrders || employee.workOrders.length === 0) ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-2">
              <FiCheckSquare className="size-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-black text-slate-900">No Work Orders Dispatched</h4>
              <p className="text-xs text-slate-500 font-medium">No formal work order dispatches have been registered for this account.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                      <th className="py-3 px-4">Order ID / Incident</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Assigned At</th>
                      <th className="py-3 px-4">Started At</th>
                      <th className="py-3 px-4">Completed At</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {employee.workOrders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-slate-900">#{order.incident?.publicTrackingId || order.id.substring(0, 8)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{order.incident?.category?.replace(/_/g, ' ') || 'Civic Order'}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(order.assignedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {order.startedAt ? new Date(order.startedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {order.completedAt ? new Date(order.completedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            order.status === 'COMPLETED' ? 'bg-[#143527]/10 text-[#143527]' :
                            order.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/admin/incidents/${order.incidentId}`}
                            className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-[#143527]"
                          >
                            <span>View</span>
                            <FiExternalLink className="size-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. FIELD RESOLUTION EVIDENCE TAB */}
      {activeTab === 'resolutions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Resolution Proofs & AI Verifications ({employee.resolutionSubmissions?.length ?? 0})
            </h3>
            <span className="text-xs text-slate-500 font-semibold">Ground-truth evidence uploads</span>
          </div>

          {(!employee.resolutionSubmissions || employee.resolutionSubmissions.length === 0) ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-2">
              <FiCheckCircle className="size-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-black text-slate-900">No Resolution Proofs Recorded</h4>
              <p className="text-xs text-slate-500 font-medium">Technician has not submitted resolution evidence yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employee.resolutionSubmissions.map((sub: any) => (
                <div key={sub.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs space-y-3 p-4">
                  {sub.evidencePath ? (
                    <div className="relative h-44 w-full rounded-xl bg-slate-900 overflow-hidden">
                      <img 
                        src={sub.evidencePath} 
                        alt="Resolution evidence" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/70 text-white backdrop-blur-xs">
                        {sub.verificationStatus}
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 w-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                      No Photo Recorded
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-slate-900">
                        #{sub.incident?.publicTrackingId || 'INCIDENT'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(sub.submittedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 line-clamp-2">
                      {sub.notes || 'Resolution proof submitted without additional notes.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">
                      AI Verified: {sub.verifiedAt ? 'YES' : 'PENDING'}
                    </span>
                    <Link
                      href={`/admin/incidents/${sub.incidentId}`}
                      className="text-xs font-black text-slate-900 hover:text-[#143527] inline-flex items-center gap-1"
                    >
                      <span>Incident Details</span>
                      <FiExternalLink className="size-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. SECURITY & AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Security Events */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <FiShield className="size-4 text-slate-700" />
              <span>Authentication & Security Events</span>
            </h3>

            {(!employee.recentSecurityEvents || employee.recentSecurityEvents.length === 0) ? (
              <p className="text-xs text-slate-500 py-4">No recent security events logged for this account.</p>
            ) : (
              <div className="space-y-2">
                {employee.recentSecurityEvents.map((evt: any) => (
                  <div key={evt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className={`size-2 rounded-full ${evt.success ? 'bg-[#143527]' : 'bg-rose-500'}`} />
                      <span className="font-bold text-slate-900">{evt.type?.replace(/_/g, ' ')}</span>
                      {evt.ipAddress && (
                        <span className="font-mono text-[10px] text-slate-500">({evt.ipAddress})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        evt.success ? 'bg-[#143527]/10 text-[#143527]' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {evt.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        {new Date(evt.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment History */}
          {employee.assignmentHistory?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                <FiActivity className="size-4 text-slate-700" />
                <span>Assignment & Transfer Audit Log</span>
              </h3>

              <div className="space-y-2">
                {employee.assignmentHistory.map((ah: any) => (
                  <div key={ah.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{ah.action}</span>
                        {ah.incident?.publicTrackingId && (
                          <span className="font-mono text-[11px] text-slate-600 font-bold">#{ah.incident.publicTrackingId}</span>
                        )}
                      </div>
                      {ah.reason && (
                        <p className="text-[11px] text-slate-500 font-medium">Reason: {ah.reason}</p>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 shrink-0">
                      {new Date(ah.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= SUSPEND / REACTIVATE MODAL ================= */}
      <UserStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        person={targetPerson}
        onSuccess={(updated) => {
          setEmployee((current: any) => current ? { ...current, active: updated.active } : current);
          showToast(`Account successfully ${updated.active ? 'reactivated' : 'suspended'}.`);
        }}
      />

    </div>
  );
}
