'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FiSearch, 
  FiAlertCircle, 
  FiMapPin, 
  FiClock, 
  FiArrowRight, 
  FiPlusCircle,
  FiTrash2,
  FiSun,
  FiDroplet,
  FiActivity,
  FiOctagon,
  FiHelpCircle,
  FiShield,
  FiCheckCircle,
  FiRefreshCw,
  FiCopy,
  FiSliders,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle,
  FiCheck,
  FiLayers
} from 'react-icons/fi';
import LoadingState from '../../components/LoadingState';
import { apiFetch } from '../../../lib/api/client';
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui';

interface AdminIncident {
  id: string;
  trackingId: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  ward: string;
  department?: string | null;
  reports: number;
  date: string;
  rawDate: string;
  slaDeadline?: string | null;
  slaBreached?: boolean;
  assignedTo?: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any }> = {
  POTHOLE: { label: 'Road Potholes', icon: FiAlertCircle },
  GARBAGE: { label: 'Solid Waste', icon: FiTrash2 },
  STREETLIGHT: { label: 'Streetlights', icon: FiSun },
  WATER_LEAK: { label: 'Water Leaks', icon: FiDroplet },
  SEWAGE: { label: 'Sewage Overflow', icon: FiActivity },
  TRAFFIC_SIGN: { label: 'Traffic Signs', icon: FiOctagon },
  OTHERS: { label: 'Other Hazards', icon: FiHelpCircle },
};

export default function IncidentsListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'sla'>('date');
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeName, setScopeName] = useState('Indore Municipal Area');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatScope = (s: any): string => {
    if (!s) return 'Indore Municipal Area';
    if (typeof s === 'string') return s;
    if (s.name) return s.name;
    if (s.type === 'platform') return 'All Municipal Jurisdictions (Platform Wide)';
    if (s.type === 'city') return s.city?.name || 'City Jurisdiction';
    if (s.type === 'zone') return s.zone?.name || 'Zone Jurisdiction';
    if (s.type === 'ward') return s.ward?.name ? `Ward: ${s.ward.name}` : 'Ward Jurisdiction';
    if (s.type === 'department') return s.department?.name ? `Department: ${s.department.name}` : 'Department Jurisdiction';
    return typeof s.type === 'string' ? `${s.type.toUpperCase()} Jurisdiction` : 'Indore Municipal Area';
  };

  const fetchIncidents = () => {
    setLoading(true);
    // Query authenticated administrative queue endpoint
    apiFetch<{ incidents?: any[]; scope?: any }>('/incidents/admin-queue?limit=100')
      .then((resData) => {
        if (resData.scope) setScopeName(formatScope(resData.scope));
        if (resData.incidents && resData.incidents.length > 0) {
          const mapped: AdminIncident[] = resData.incidents.map((i: any) => ({
            id: i.id,
            trackingId: String(i.publicTrackingId || i.trackingId || `CVQ-IND-${i.id.substring(0, 5).toUpperCase()}`),
            category: String(i.category || 'POTHOLE'),
            description: String(i.reports?.[0]?.description || i.description || `Municipal grievance recorded for ${String(i.category || 'civic').toLowerCase()} hazard.`),
            status: String(i.status || 'REPORTED'),
            priority: String(i.priority || 'MEDIUM'),
            ward: i.ward?.name ? `${i.ward.name}, Indore` : 'Indore Municipal Area',
            department: i.department?.name || null,
            reports: i.reportCount || 1,
            date: new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            rawDate: i.createdAt,
            slaDeadline: i.slaDeadline || null,
            slaBreached: Boolean(i.slaBreached),
            assignedTo: i.assignedTo || null,
          }));
          setIncidents(mapped);
        } else {
          // Fallback to general incidents endpoint if queue is newly seeded
          apiFetch<{ incidents?: any[] }>('/incidents')
            .then((fallbackData) => {
              if (fallbackData.incidents) {
                const mapped: AdminIncident[] = fallbackData.incidents.map((i: any) => ({
                  id: i.id,
                  trackingId: String(i.publicTrackingId || i.trackingId || `CVQ-IND-${i.id.substring(0, 5).toUpperCase()}`),
                  category: String(i.category || 'POTHOLE'),
                  description: String(i.resolvedNotes || i.description || `Municipal grievance recorded for ${String(i.category || 'civic').toLowerCase()} hazard.`),
                  status: String(i.status || 'REPORTED'),
                  priority: String(i.priority || 'MEDIUM'),
                  ward: i.ward?.name ? `${i.ward.name}, Indore` : 'Indore Municipal Area',
                  department: null,
                  reports: i.reportCount || 1,
                  date: new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                  rawDate: i.createdAt,
                  slaDeadline: null,
                  slaBreached: false,
                  assignedTo: i.assignedTo || null,
                }));
                setIncidents(mapped);
              }
              setLoading(false);
            })
            .catch(() => setLoading(false));
          return;
        }
        setLoading(false);
      })
      .catch(() => {
        // Fallback to general incidents endpoint
        apiFetch<{ incidents?: any[] }>('/incidents')
          .then((fallbackData) => {
            if (fallbackData.incidents) {
              const mapped: AdminIncident[] = fallbackData.incidents.map((i: any) => ({
                id: i.id,
                trackingId: String(i.publicTrackingId || i.trackingId || `CVQ-IND-${i.id.substring(0, 5).toUpperCase()}`),
                category: String(i.category || 'POTHOLE'),
                description: String(i.resolvedNotes || i.description || `Municipal grievance recorded for ${String(i.category || 'civic').toLowerCase()} hazard.`),
                status: String(i.status || 'REPORTED'),
                priority: String(i.priority || 'MEDIUM'),
                ward: i.ward?.name ? `${i.ward.name}, Indore` : 'Indore Municipal Area',
                department: null,
                reports: i.reportCount || 1,
                date: new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                rawDate: i.createdAt,
                slaDeadline: null,
                slaBreached: false,
                assignedTo: i.assignedTo || null,
              }));
              setIncidents(mapped);
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter & Sort
  const filteredAndSortedIncidents = useMemo(() => {
    let result = incidents.filter((inc) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        inc.trackingId.toLowerCase().includes(query) ||
        inc.description.toLowerCase().includes(query) ||
        inc.ward.toLowerCase().includes(query) ||
        inc.category.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || inc.category.includes(categoryFilter);
      const matchesPriority = priorityFilter === 'ALL' || inc.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        const pOrder: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      if (sortBy === 'sla') {
        if (a.slaBreached && !b.slaBreached) return -1;
        if (!a.slaBreached && b.slaBreached) return 1;
        return new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
      }
      return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
    });

    return result;
  }, [incidents, searchTerm, statusFilter, categoryFilter, priorityFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, priorityFilter, pageSize, sortBy]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedIncidents.length / pageSize));
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedIncidents.slice(start, start + pageSize);
  }, [filteredAndSortedIncidents, currentPage, pageSize]);

  // Executive Metrics
  const metrics = useMemo(() => {
    const total = incidents.length;
    const inProgress = incidents.filter(i => ['ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED'].includes(i.status)).length;
    const resolved = incidents.filter(i => i.status === 'RESOLVED').length;
    const escalated = incidents.filter(i => i.status === 'ESCALATED' || i.slaBreached).length;
    return { total, inProgress, resolved, escalated };
  }, [incidents]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-[500px]">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1700px] 2xl:max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-left font-sans bg-white">
      
      {/* ================= DIRECTORY HEADER ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-2xl border border-[#eef1ea] bg-white p-5 md:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Operational Incident Directory
            </h1>
          </div>
          <p className="text-xs font-medium text-[#64748b] flex items-center gap-1.5">
            <FiMapPin className="text-[#143527] size-3.5 shrink-0" />
            <span>Jurisdiction: {scopeName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchIncidents}
            className="flex items-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-[#0f172a] shadow-2xs transition-colors cursor-pointer"
          >
            <FiRefreshCw className="size-3.5 text-[#64748b]" />
            <span>Refresh Queue</span>
          </button>
          <Link
            href="/admin/reports"
            className="flex items-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FiLayers className="size-3.5" />
            <span>Citizen Reports Intake</span>
          </Link>
        </div>
      </div>

      {/* ================= METRIC SUMMARY BENTO ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Total Actionable Incidents</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f172a]">{metrics.total}</span>
            <span className="text-[10px] font-bold text-slate-400">cases</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Active Work Orders</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{metrics.inProgress}</span>
            <span className="text-[10px] font-bold text-blue-700">in field</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Verified Resolutions</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#143527]">{metrics.resolved}</span>
            <span className="text-[10px] font-bold text-[#143527]">closed</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">SLA Escalations</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{metrics.escalated}</span>
            <span className="text-[10px] font-bold text-rose-700">tier breach</span>
          </div>
        </div>
      </div>

      {/* ================= FILTER TOOLBAR ================= */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-2xl border border-[#e2e8f0] bg-white p-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] size-4" />
          <input
            type="text"
            placeholder="Search by Tracking ID (#CIV-IND-...), ward name, or defect keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold text-[#0f172a] placeholder:text-[#94a3b8] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white focus:border-[#0f172a] focus:outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <FiSliders className="text-[#64748b] size-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by lifecycle status"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
              <option value="RESOLVED">Resolved</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="POTHOLE">Road Potholes</option>
              <option value="GARBAGE">Solid Waste</option>
              <option value="STREETLIGHT">Streetlights</option>
              <option value="WATER_LEAK">Water Leaks</option>
              <option value="SEWAGE">Sewage Overflow</option>
              <option value="TRAFFIC_SIGN">Traffic Signs</option>
              <option value="OTHERS">Other Hazards</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <span className="text-[10px] text-[#64748b] font-black">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort order"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="date">Latest Date</option>
              <option value="priority">Highest Priority</option>
              <option value="sla">SLA Deadline</option>
            </select>
          </div>

          {/* Page Size */}
          <div className="flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1.5 text-xs font-bold text-[#334155]">
            <span className="text-[10px] text-[#64748b] font-black">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= HIGH-DENSITY INCIDENT TABLE ================= */}
      <div className="rounded-3xl border border-[#eef1ea] bg-white overflow-hidden shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          {paginatedIncidents.length === 0 ? (
            <div className="p-16 text-center text-xs text-[#64748b] space-y-2">
              <FiCheckCircle className="size-8 text-[#143527] mx-auto" />
              <p className="font-black text-sm text-[#0f172a]">No incidents match your criteria</p>
              <p className="font-bold">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead>
                <tr className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider font-black border-b border-[#eef1ea]">
                  <th className="px-5 py-4">Tracking ID</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Priority</th>
                  <th className="px-5 py-4">Municipal Ward</th>
                  <th className="px-5 py-4">SLA Compliance</th>
                  <th className="px-5 py-4">Linked Intake</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ea] text-[#0f172a] font-medium">
                {paginatedIncidents.map((inc) => {
                  const catKey = Object.keys(CATEGORY_CONFIG).find((k) => inc.category.includes(k)) || 'OTHERS';
                  const catConfig = CATEGORY_CONFIG[catKey] || CATEGORY_CONFIG.OTHERS;
                  const Icon = catConfig.icon;

                  return (
                    <tr key={inc.id} className="hover:bg-[#f8fafc]/80 transition-colors group">
                      {/* Tracking ID */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-black text-[#0f172a]">
                          <span>#{inc.trackingId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(inc.trackingId)}
                            className="text-[#94a3b8] hover:text-[#0f172a] transition-colors cursor-pointer"
                            title="Copy tracking ID"
                          >
                            {copiedId === inc.trackingId ? (
                              <FiCheck className="size-3 text-[#143527]" />
                            ) : (
                              <FiCopy className="size-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-slate-100 flex items-center justify-center text-[#0f172a]">
                            <Icon className="size-3.5" />
                          </div>
                          <span className="font-extrabold uppercase text-[11px] text-[#334155]">
                            {inc.category}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={inc.status} />
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-4">
                        <PriorityBadge priority={inc.priority} />
                      </td>

                      {/* Ward */}
                      <td className="px-5 py-4 font-bold text-[#334155]">
                        <div className="flex items-center gap-1 text-xs">
                          <FiMapPin className="size-3.5 text-[#143527] shrink-0" />
                          <span>{inc.ward}</span>
                        </div>
                      </td>

                      {/* SLA Target */}
                      <td className="px-5 py-4">
                        {inc.slaBreached || inc.status === 'ESCALATED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-rose-300 bg-rose-50 text-rose-800">
                            <FiAlertTriangle className="size-3 text-rose-600" /> BREACHED
                          </span>
                        ) : inc.status === 'RESOLVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-[#143527]/20 bg-[#143527]/5 text-[#143527]">
                            <FiCheckCircle className="size-3 text-[#143527]" /> MET SLA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-amber-200 bg-amber-50 text-amber-800">
                            <FiClock className="size-3 text-amber-600" /> 24h TARGET
                          </span>
                        )}
                      </td>

                      {/* Linked Reports */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-xs text-[#64748b]">
                          {inc.reports} {inc.reports === 1 ? 'Report' : 'Reports'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/incidents/${inc.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-95"
                        >
                          <span>Manage</span>
                          <FiArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= PAGINATION BAR ================= */}
        {filteredAndSortedIncidents.length > 0 && (
          <div className="p-4 border-t border-[#e2e8f0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#64748b]">
              Showing <span className="font-black text-[#0f172a]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-black text-[#0f172a]">{Math.min(currentPage * pageSize, filteredAndSortedIncidents.length)}</span> of{' '}
              <span className="font-black text-[#0f172a]">{filteredAndSortedIncidents.length}</span> incidents
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-white px-3 py-1.5 font-black text-[#0f172a] shadow-2xs hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <FiChevronLeft className="size-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-2 font-mono font-bold text-xs text-[#0f172a]">
                Page <span className="font-black">{currentPage}</span> of <span className="font-black">{totalPages}</span>
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 rounded-xl border border-[#e2e8f0] bg-white px-3 py-1.5 font-black text-[#0f172a] shadow-2xs hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <span>Next</span>
                <FiChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
