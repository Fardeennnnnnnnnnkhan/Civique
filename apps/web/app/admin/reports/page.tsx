'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  FiSearch, 
  FiSliders, 
  FiAlertCircle, 
  FiMapPin, 
  FiClock, 
  FiArrowRight, 
  FiCheckCircle, 
  FiXCircle, 
  FiMaximize2,
  FiFileText,
  FiShield,
  FiCpu,
  FiLayers,
  FiEye,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX
} from 'react-icons/fi';
import { apiFetch } from '../../../lib/api/client';
import { StatusBadge, PriorityBadge } from '@/components/ui';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  category: string;
  confirmedCategory?: string | null;
  urgency: string;
  latitude: number;
  longitude: number;
  landmark: string;
  createdAt: string;
  incident?: {
    id: string;
    publicTrackingId: string;
    status: string;
    priority: string;
    ward?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
  } | null;
  aiAnalysis?: {
    category: string;
    confidence: number;
    status: string;
    authenticityVerdict?: string;
    rationale?: string;
    observations?: string[];
  } | null;
}

export default function ReportsTriagePage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [authenticityFilter, setAuthenticityFilter] = useState('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Slide-over Drawer
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  const fetchReports = () => {
    setLoading(true);
    setError('');
    apiFetch<{ reports?: any[] }>('/reports')
      .then((resData) => {
        if (resData.reports) {
          const mapped: ReportItem[] = resData.reports.map((r: any) => {
            const ai = r.aiAnalyses?.[0];
            const aiResult = ai?.result as any;
            return {
              id: r.id,
              title: r.title || 'Civic issue report',
              description: r.description || 'No description provided.',
              category: r.categorySuggested || 'OTHERS',
              confirmedCategory: r.categoryConfirmed || null,
              urgency: r.urgency || 'MEDIUM',
              latitude: Number(r.latitude || 22.7196),
              longitude: Number(r.longitude || 75.8577),
              landmark: r.landmark || 'Indore Municipal Area',
              createdAt: r.createdAt,
              incident: r.incident ? {
                id: r.incident.id,
                publicTrackingId: r.incident.publicTrackingId || `CVQ-IND-${r.incident.id.substring(0, 5).toUpperCase()}`,
                status: r.incident.status || 'REPORTED',
                priority: r.incident.priority || 'MEDIUM',
                ward: r.incident.ward || null,
                department: r.incident.department || null,
              } : null,
              aiAnalysis: ai ? {
                category: ai.category || 'OTHERS',
                confidence: Math.round(Number(ai.confidence || 0) * 100),
                status: ai.status,
                authenticityVerdict: aiResult?.authenticity?.verdict || 'REAL',
                rationale: aiResult?.category_rationale || '',
                observations: Array.isArray(aiResult?.observations) ? aiResult.observations : []
              } : null,
            };
          });
          setReports(mapped);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load citizen reports.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered dataset
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        rep.title.toLowerCase().includes(q) ||
        rep.description.toLowerCase().includes(q) ||
        rep.landmark.toLowerCase().includes(q) ||
        rep.id.toLowerCase().includes(q) ||
        (rep.incident?.publicTrackingId && rep.incident.publicTrackingId.toLowerCase().includes(q)) ||
        (rep.incident?.ward?.name && rep.incident.ward.name.toLowerCase().includes(q));

      const matchesCategory = categoryFilter === 'ALL' || rep.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || (rep.incident?.status || 'REPORTED') === statusFilter;
      const matchesAuth = authenticityFilter === 'ALL' || 
        (authenticityFilter === 'REAL' && rep.aiAnalysis?.authenticityVerdict === 'REAL') ||
        (authenticityFilter === 'SUSPICIOUS' && rep.aiAnalysis?.authenticityVerdict && rep.aiAnalysis.authenticityVerdict !== 'REAL');

      return matchesSearch && matchesCategory && matchesStatus && matchesAuth;
    });
  }, [reports, searchTerm, categoryFilter, statusFilter, authenticityFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, authenticityFilter, pageSize]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  // Executive Metric Counts
  const metrics = useMemo(() => {
    const total = reports.length;
    const authentic = reports.filter(r => r.aiAnalysis?.authenticityVerdict === 'REAL').length;
    const flagged = reports.filter(r => r.aiAnalysis?.authenticityVerdict && r.aiAnalysis.authenticityVerdict !== 'REAL').length;
    const pendingPromotion = reports.filter(r => (r.incident?.status || 'REPORTED') === 'REPORTED').length;
    return { total, authentic, flagged, pendingPromotion };
  }, [reports]);

  return (
    <div className="w-full max-w-[1700px] 2xl:max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 text-left font-sans bg-white">
      
      {/* ================= EXECUTIVE HEADER ================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 md:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              Citizen Intake & Reports Triage
            </h1>
          </div>
          <p className="text-xs font-medium text-[#64748b]">
            Inspect incoming civic grievances, AI authenticity screening, and multi-report promotion before operational dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchReports}
            className="flex items-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-3.5 py-2 text-xs font-semibold text-[#0f172a] shadow-2xs transition-colors cursor-pointer"
          >
            <FiRefreshCw className="size-3.5 text-[#64748b]" />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/incidents"
            className="flex items-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <FiLayers className="size-3.5" />
            <span>Operational Incident Queue</span>
          </Link>
        </div>
      </div>

      {/* ================= METRIC SUMMARY BENTO ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Total Ingested Reports</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f172a]">{metrics.total}</span>
            <span className="text-[10px] font-bold text-slate-400">submissions</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">AI Authentic & Verified</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#143527]">{metrics.authentic}</span>
            <span className="text-[10px] font-bold text-[#143527]">clean evidence</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Suspicious / Flagged</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{metrics.flagged}</span>
            <span className="text-[10px] font-bold text-amber-700">forensic review</span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">Pending Triage Promotion</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0f172a]">{metrics.pendingPromotion}</span>
            <span className="text-[10px] font-bold text-blue-600">awaiting review</span>
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
            placeholder="Search reports by title, tracking ID, description, landmark, or ward..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-bold text-[#0f172a] placeholder:text-[#94a3b8] rounded-xl border border-[#e2e8f0] bg-[#f8fafc] focus:bg-white focus:border-[#0f172a] focus:outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <FiSliders className="text-[#64748b] size-3.5" />
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

          {/* AI Authenticity */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <FiCpu className="text-[#64748b] size-3.5" />
            <select
              value={authenticityFilter}
              onChange={(e) => setAuthenticityFilter(e.target.value)}
              aria-label="Filter by AI screening"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="ALL">All AI Signals</option>
              <option value="REAL">Verified Authentic</option>
              <option value="SUSPICIOUS">Flagged / Suspicious</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#334155]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by incident status"
              className="bg-transparent border-none focus:ring-0 text-xs font-extrabold text-[#0f172a] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="AI_REVIEW">AI Review</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
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

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 flex items-center gap-2">
          <FiAlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= HIGH-DENSITY DATA TABLE ================= */}
      <div className="rounded-3xl border border-[#eef1ea] bg-white overflow-hidden shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs font-extrabold text-[#64748b] space-y-2">
              <FiRefreshCw className="size-6 text-[#94a3b8] animate-spin mx-auto" />
              <p>Querying citizen report records and AI analysis telemetry…</p>
            </div>
          ) : paginatedReports.length === 0 ? (
            <div className="p-16 text-center text-xs text-[#64748b] space-y-2">
              <FiCheckCircle className="size-8 text-[#143527] mx-auto" />
              <p className="font-black text-sm text-[#0f172a]">No reports match your filters</p>
              <p className="font-bold">Try adjusting your search query or clear the active filter parameters.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse font-sans">
              <thead>
                <tr className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider font-black border-b border-[#eef1ea]">
                  <th className="px-5 py-4">Report Identifier</th>
                  <th className="px-5 py-4">Taxonomy Category</th>
                  <th className="px-5 py-4">AI Screening & Provenance</th>
                  <th className="px-5 py-4">Jurisdiction & Geotag</th>
                  <th className="px-5 py-4">Incident Status</th>
                  <th className="px-5 py-4">Submission Timestamp</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef1ea] text-[#0f172a] font-medium">
                {paginatedReports.map((rep) => (
                  <tr 
                    key={rep.id} 
                    className="hover:bg-[#f8fafc]/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedReport(rep)}
                  >
                    {/* Report ID & Title */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[11px] font-black text-[#0f172a] block group-hover:text-black">
                          #{rep.id.substring(0, 8).toUpperCase()}
                        </span>
                        <p className="font-extrabold text-xs text-[#334155] line-clamp-1 max-w-[240px]">
                          {rep.title}
                        </p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 font-black uppercase text-[10px] text-[#0f172a] bg-[#f1f5f9] px-2.5 py-1 rounded-lg border border-[#eef1ea]">
                          {rep.category}
                        </span>
                        {rep.confirmedCategory && rep.confirmedCategory !== rep.category && (
                          <span className="block text-[9px] font-bold text-blue-700">
                            Confirmed: {rep.confirmedCategory}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AI Screening */}
                    <td className="px-5 py-4">
                      {rep.aiAnalysis ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                              rep.aiAnalysis.authenticityVerdict === 'REAL' 
                                ? 'bg-[#143527]/5 text-[#143527] border border-[#143527]/20' 
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {rep.aiAnalysis.authenticityVerdict === 'REAL' ? (
                                <FiCheckCircle className="size-3 text-[#143527]" />
                              ) : (
                                <FiAlertCircle className="size-3 text-amber-600" />
                              )}
                              <span>{rep.aiAnalysis.authenticityVerdict}</span>
                            </span>
                            <span className="font-mono text-[10px] font-bold text-[#64748b]">
                              {rep.aiAnalysis.confidence}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Processing…</span>
                      )}
                    </td>

                    {/* Jurisdiction */}
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#0f172a] flex items-center gap-1 text-xs">
                          <FiMapPin className="size-3.5 text-[#143527] shrink-0" />
                          <span>{rep.incident?.ward?.name || 'Indore Boundary'}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-[#64748b] block line-clamp-1 max-w-[200px]">
                          {rep.landmark}
                        </span>
                      </div>
                    </td>

                    {/* Incident Status */}
                    <td className="px-5 py-4">
                      {rep.incident ? (
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={rep.incident.status} />
                          <span className="font-mono text-[10px] text-[#64748b] font-bold">
                            #{rep.incident.publicTrackingId}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">Standalone Report</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="px-5 py-4 text-[#64748b] font-bold">
                      <div className="flex items-center gap-1 text-xs">
                        <FiClock className="size-3 text-[#94a3b8]" />
                        <span>
                          {new Date(rep.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rep)}
                          className="p-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f1f5f9] text-[#0f172a] shadow-2xs transition-colors cursor-pointer"
                          title="Inspect Report Dossier"
                        >
                          <FiEye className="size-3.5" />
                        </button>
                        {rep.incident && (
                          <Link
                            href={`/admin/incidents/${rep.incident.id}`}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-95"
                          >
                            <span>Incident</span>
                            <FiArrowRight className="size-3" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ================= PAGINATION BAR ================= */}
        {!loading && filteredReports.length > 0 && (
          <div className="p-4 border-t border-[#e2e8f0] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#64748b]">
              Showing <span className="font-black text-[#0f172a]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-black text-[#0f172a]">{Math.min(currentPage * pageSize, filteredReports.length)}</span> of{' '}
              <span className="font-black text-[#0f172a]">{filteredReports.length}</span> reports
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

      {/* ================= SLIDE-OVER DETAIL DRAWER ================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" 
            onClick={() => setSelectedReport(null)} 
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-[#e2e8f0] flex flex-col text-left font-sans">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-[#e2e8f0] bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#64748b]">
                      Citizen Report Dossier
                    </span>
                    <span className="font-mono text-xs font-black text-[#0f172a] bg-white px-2 py-0.5 rounded border border-[#e2e8f0]">
                      #{selectedReport.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-[#0f172a] mt-1">
                    {selectedReport.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="size-8 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:text-black hover:bg-[#f1f5f9] transition-colors cursor-pointer"
                >
                  <FiX className="size-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Description Card */}
                <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                    Citizen Description & Statement
                  </span>
                  <p className="text-xs font-semibold text-[#0f172a] leading-relaxed">
                    {selectedReport.description}
                  </p>
                </div>

                {/* AI Screening Telemetry */}
                {selectedReport.aiAnalysis && (
                  <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#0f172a] flex items-center gap-1.5">
                        <FiCpu className="size-4 text-[#143527]" />
                        <span>Groq AI Diagnostics</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        selectedReport.aiAnalysis.authenticityVerdict === 'REAL'
                          ? 'bg-[#143527]/5 text-[#143527] border border-[#143527]/20'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {selectedReport.aiAnalysis.authenticityVerdict}
                      </span>
                    </div>

                    {selectedReport.aiAnalysis.rationale && (
                      <p className="text-xs text-[#334155] font-semibold bg-slate-50/50 p-3 rounded-xl border border-[#eef1ea]">
                        {selectedReport.aiAnalysis.rationale}
                      </p>
                    )}

                    {selectedReport.aiAnalysis.observations && selectedReport.aiAnalysis.observations.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#64748b]">Visual Observations</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedReport.aiAnalysis.observations.map((obs, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700">
                              {obs}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Location Card */}
                <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 space-y-2 shadow-2xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                    Geotagged Boundary
                  </span>
                  <div className="text-xs font-bold text-[#0f172a] space-y-1">
                    <p className="flex items-center gap-1.5">
                      <FiMapPin className="text-[#143527] size-3.5 shrink-0" />
                      <span>{selectedReport.incident?.ward?.name || 'Indore Municipal Boundary'}</span>
                    </p>
                    <p className="text-slate-500 font-normal">
                      Landmark: {selectedReport.landmark}
                    </p>
                    <p className="font-mono text-[11px] text-slate-600">
                      Coordinates: {selectedReport.latitude.toFixed(5)}, {selectedReport.longitude.toFixed(5)}
                    </p>
                  </div>
                </div>

                {/* Linked Incident */}
                {selectedReport.incident && (
                  <div className="rounded-2xl border border-[#eef1ea] bg-white p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b]">
                        Promoted Incident
                      </span>
                      <StatusBadge status={selectedReport.incident.status} />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono font-black text-sm text-[#0f172a]">
                        #{selectedReport.incident.publicTrackingId}
                      </span>
                      <Link
                        href={`/admin/incidents/${selectedReport.incident.id}`}
                        className="flex items-center gap-1 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3.5 py-1.5 text-xs font-black text-white shadow-2xs transition-all"
                      >
                        <span>Open Incident Dossier</span>
                        <FiArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
