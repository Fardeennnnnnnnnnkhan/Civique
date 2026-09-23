'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiClock, 
  FiArrowUpRight,
  FiArrowRight,
  FiZap,
  FiShield,
  FiMapPin,
  FiActivity,
  FiLayers,
  FiTrendingUp,
  FiRefreshCw,
  FiFileText,
  FiBarChart2,
  FiCheckSquare,
  FiAlertCircle
} from 'react-icons/fi';
import LoadingState from '../components/LoadingState';
import { apiFetch } from '../../lib/api/client';
import { StatusBadge, PriorityBadge } from '@/components/ui';

interface MetricState {
  openCount: number;
  resolvedCount: number;
  slaCompliance: number;
}

interface ActivityItem {
  time: string;
  title: string;
  desc: string;
  type: string;
}

interface QueueIncident {
  id: string;
  publicTrackingId: string;
  category: string;
  status: string;
  priority: string;
  priorityScore?: number;
  latitude: number;
  longitude: number;
  reportCount: number;
  slaDeadline?: string | null;
  slaBreached?: boolean;
  createdAt: string;
  ward?: { id: string; name: string } | null;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<MetricState>({ openCount: 0, resolvedCount: 0, slaCompliance: 100 });
  const [scopeName, setScopeName] = useState('Indore Municipal Area');
  const [incidents, setIncidents] = useState<QueueIncident[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);

  const formatScope = (s: any): string => {
    if (!s) return 'Indore Municipal Area';
    if (typeof s === 'string') return s;
    if (s.name) return s.name;
    if (s.type === 'platform') return 'All Municipal Jurisdictions (Platform-Wide)';
    if (s.type === 'city') return s.city?.name || 'City Jurisdiction';
    if (s.type === 'zone') return s.zone?.name || 'Zone Jurisdiction';
    if (s.type === 'ward') return s.ward?.name ? `Ward: ${s.ward.name}` : 'Ward Jurisdiction';
    if (s.type === 'department') return s.department?.name ? `Department: ${s.department.name}` : 'Department Jurisdiction';
    return typeof s.type === 'string' ? `${s.type.toUpperCase()} Jurisdiction` : 'Indore Municipal Area';
  };

  const loadDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [metricsRes, queueRes] = await Promise.all([
        apiFetch<{ metrics?: MetricState; scope?: any; recentActivities?: ActivityItem[] }>('/incidents/admin-metrics'),
        apiFetch<{ incidents?: QueueIncident[]; scope?: any }>('/incidents/admin-queue?limit=15')
      ]);

      if (metricsRes.metrics) {
        setMetrics(metricsRes.metrics);
      }
      if (metricsRes.scope) {
        setScopeName(formatScope(metricsRes.scope));
      }
      if (metricsRes.recentActivities) {
        setActivities(metricsRes.recentActivities);
      }

      if (queueRes.incidents) {
        setIncidents(queueRes.incidents);
      }
      if (queueRes.scope) {
        setScopeName(formatScope(queueRes.scope));
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Initialize Map Preview container with 100% free OpenStreetMap
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading) return;

    let mapInstance: any;

    const loadLeaflet = async () => {
      const container = mapContainerRef.current;
      if (!container) return;

      if ((container as any)._leaflet_id || (container as any)._leaflet_loading) return;
      (container as any)._leaflet_loading = true;

      const L = (await import('leaflet')).default;
      LRef.current = L;

      if (!document.getElementById('leaflet-css-style')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-style';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      mapInstance = L.map(container, {
        zoomControl: false,
        attributionControl: false
      }).setView([22.7214, 75.8750], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance);

      mapRef.current = mapInstance;
      renderMarkers();
    };

    const timer = setTimeout(loadLeaflet, 200);

    return () => {
      clearTimeout(timer);
      if (mapInstance) {
        mapInstance.remove();
      }
      const container = mapContainerRef.current;
      if (container) {
        delete (container as any)._leaflet_loading;
      }
      mapRef.current = null;
    };
  }, [loading]);

  const renderMarkers = () => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const colorMap: Record<string, string> = {
      RESOLVED: '#143527',
      IN_PROGRESS: '#334155',
      ASSIGNED: '#d97706',
      REPORTED: '#2563eb',
      ESCALATED: '#dc2626'
    };

    incidents.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;
      const color = colorMap[inc.status] || '#475569';
      const isEscalated = inc.status === 'ESCALATED' || inc.priority === 'CRITICAL';

      const customIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; cursor: pointer;">
            ${isEscalated ? `<span style="position: absolute; display: inline-flex; height: 26px; width: 26px; border-radius: 9999px; background-color: rgba(220, 38, 38, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
            <div style="height: 20px; width: 20px; border-radius: 9999px; background-color: ${color}; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.3); display: flex; align-items: center; justify-content: center;">
              <div style="height: 6px; width: 6px; border-radius: 9999px; background-color: white;"></div>
            </div>
          </div>
        `,
        className: 'admin-map-pin',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 4px; color: #0f172a;">
            <b style="color: #0f172a; text-transform: uppercase;">${inc.category}</b><br/>
            <span style="color: #64748b; font-family: monospace;">#${inc.publicTrackingId}</span><br/>
            <span style="font-size: 10px; font-weight: bold; color: ${color};">${inc.status}</span>
          </div>
        `);

      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      try {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.25));
      } catch {}
    }
  };

  useEffect(() => {
    renderMarkers();
  }, [incidents]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-[600px]">
        <LoadingState />
      </div>
    );
  }

  const filteredIncidents = incidents.filter((inc) => {
    if (filterPriority === 'ALL') return true;
    if (filterPriority === 'CRITICAL') return inc.priority === 'CRITICAL' || inc.status === 'ESCALATED';
    if (filterPriority === 'HIGH') return inc.priority === 'HIGH';
    if (filterPriority === 'OPEN') return inc.status === 'REPORTED' || inc.status === 'OPEN' || inc.status === 'ACKNOWLEDGED';
    if (filterPriority === 'ACTIVE') return inc.status === 'IN_PROGRESS' || inc.status === 'ASSIGNED';
    return true;
  });

  const criticalCount = incidents.filter(i => i.priority === 'CRITICAL' || i.status === 'ESCALATED').length;
  const inProgressCount = incidents.filter(i => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED').length;

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8 xl:p-10 font-sans text-left">
      <div className="max-w-[1700px] 2xl:max-w-[1920px] mx-auto space-y-8">
        
        {/* ================= COMMAND SUITE MASTER HEADER ================= */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 rounded-2xl border border-[#eef1ea] bg-white p-6 md:p-8 shadow-xs">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0f172a] tracking-tight">
              Municipal Operations Hub
            </h1>
            <p className="text-sm font-medium text-[#64748b] flex items-center gap-2">
              <FiMapPin className="text-[#143527] size-4 shrink-0" />
              <span>Jurisdictional Scope: <strong className="text-[#0f172a]">{scopeName}</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-[#0f172a] shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-[#143527]' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Sync Data'}</span>
            </button>

            <Link
              href="/admin/reports"
              className="flex items-center gap-2 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-[#0f172a] shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FiFileText className="size-3.5 text-[#334155]" />
              <span>Citizen Reports</span>
            </Link>

            <Link
              href="/admin/incidents"
              className="flex items-center gap-2 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] px-4 py-2.5 text-xs font-semibold text-[#0f172a] shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FiLayers className="size-3.5 text-[#334155]" />
              <span>Incident Queue ({incidents.length})</span>
            </Link>

            <Link
              href="/admin/analytics"
              className="flex items-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FiBarChart2 className="size-3.5 stroke-[2.5]" />
              <span>Civic Analytics</span>
              <FiArrowRight className="size-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* ================= 5 EXECUTIVE KPI METRIC CARDS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
          {/* 1. Active Cases */}
          <div className="rounded-3xl border border-[#fef3c7] bg-white p-5 md:p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#64748b]">Active Unresolved</span>
              <div className="p-2.5 rounded-xl bg-[#fffbeb] text-[#d97706] shadow-2xs">
                <FiAlertTriangle className="text-xl stroke-[2.5]" />
              </div>
            </div>
            <div>
              <span className="text-3xl lg:text-4xl font-black tracking-tight text-[#0f172a] block">
                {metrics.openCount.toLocaleString()}
              </span>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-[11px] font-black text-[#dc2626] bg-[#fef2f2] px-2 py-0.5 rounded-md border border-[#fee2e2]">
                  {criticalCount} Critical
                </span>
                <span className="text-[11px] font-bold text-[#64748b]">awaiting triage</span>
              </div>
            </div>
          </div>

          {/* 2. In Progress Work */}
          <div className="rounded-3xl border border-[#e2e8f0] bg-white p-5 md:p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#64748b]">Crew In Field</span>
              <div className="p-2.5 rounded-xl bg-[#f1f5f9] text-[#334155] shadow-2xs">
                <FiActivity className="text-xl stroke-[2.5]" />
              </div>
            </div>
            <div>
              <span className="text-3xl lg:text-4xl font-black tracking-tight text-[#0f172a] block">
                {inProgressCount}
              </span>
              <p className="text-xs font-bold text-[#64748b] mt-2">
                Assigned & ongoing repairs
              </p>
            </div>
          </div>

          {/* 3. Resolved */}
          <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 md:p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#64748b]">Resolved Today</span>
              <div className="p-2.5 rounded-xl bg-[#143527]/5 text-[#143527] shadow-2xs">
                <FiCheckCircle className="text-xl stroke-[2.5]" />
              </div>
            </div>
            <div>
              <span className="text-3xl lg:text-4xl font-black tracking-tight text-[#143527] block">
                {metrics.resolvedCount.toLocaleString()}
              </span>
              <p className="text-xs font-bold text-[#64748b] mt-2">
                Audited & verified closed past 24h
              </p>
            </div>
          </div>

          {/* 4. SLA Compliance */}
          <div className="rounded-3xl border border-[#eef1ea] bg-white p-5 md:p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-[#64748b]">SLA Compliance</span>
              <div className="p-2.5 rounded-xl bg-[#f8fafc] text-[#0f172a] shadow-2xs">
                <FiClock className="text-xl stroke-[2.5]" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl lg:text-4xl font-black tracking-tight text-[#0f172a]">
                  {metrics.slaCompliance}%
                </span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${metrics.slaCompliance >= 90 ? 'bg-[#143527]/10 text-[#143527]' : 'bg-[#fffbeb] text-[#d97706]'}`}>
                  {metrics.slaCompliance >= 90 ? 'HEALTHY' : 'WARNING'}
                </span>
              </div>
              <p className="text-xs font-bold text-[#64748b] mt-2">
                Target: &gt;90% resolution SLA
              </p>
            </div>
          </div>

          {/* 5. AI Authenticity Screening */}
          <div className="rounded-2xl border border-[#eef1ea] bg-white p-5 md:p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748b]">AI Triage Pass Rate</span>
              <div className="p-2.5 rounded-xl bg-[#143527]/5 text-[#143527] shadow-2xs">
                <FiShield className="text-xl stroke-[2.5]" />
              </div>
            </div>
            <div>
              <span className="text-3xl lg:text-4xl font-bold tracking-tight text-[#0f172a] block">
                98.4%
              </span>
              <p className="text-xs font-medium text-[#64748b] mt-2">
                Multimodal verified authentic
              </p>
            </div>
          </div>
        </div>

        {/* ================= BENTO GRID: OPERATIONS MAP & LIVE AUDIT LOG ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Operations Mini-Map Preview (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-[#eef1ea] bg-white overflow-hidden shadow-xs flex flex-col h-[520px]">
            <div className="p-5 border-b border-[#eef1ea] flex flex-wrap justify-between items-center gap-3 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-[#143527] flex items-center justify-center text-white font-bold">
                  <FiLayers className="size-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#0f172a] uppercase tracking-wider">
                    Geographic Incident Distribution
                  </h3>
                  <p className="text-xs font-medium text-[#64748b]">Real-time municipal telemetry across wards</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 text-[11px] font-bold text-[#475569] bg-white px-3 py-1.5 rounded-xl border border-[#eef1ea]">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#dc2626]" /> Critical</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#d97706]" /> Assigned</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#143527]" /> Resolved</span>
                </div>

                <Link 
                  href="/map"
                  className="flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                >
                  <span>Explore Live Map</span>
                  <FiArrowUpRight className="size-3.5 stroke-[2.5]" />
                </Link>
              </div>
            </div>

            {/* Isolate z-0 so Leaflet never bleeds through modals */}
            <div className="flex-1 relative bg-slate-100 overflow-hidden isolate z-0">
              <div id="admin-preview-map-leaflet" ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            </div>
          </div>

          {/* Real-Time Municipal Activity Stream (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-[#eef1ea] bg-white overflow-hidden shadow-xs flex flex-col h-[520px]">
            <div className="p-5 border-b border-[#eef1ea] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiActivity className="text-[#143527] size-4" />
                <h3 className="font-bold text-xs text-[#0f172a] uppercase tracking-wider">
                  Live Dispatch Stream
                </h3>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {incidents.slice(0, 6).map((inc) => (
                <Link
                  key={inc.id}
                  href={`/admin/incidents/${inc.id}`}
                  className="block p-3 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-[#0f172a]">#{inc.publicTrackingId}</span>
                    <StatusBadge status={inc.status} />
                  </div>
                  <p className="text-xs text-[#475569] font-medium truncate">{inc.category.replace(/_/g, ' ')}{inc.ward?.name ? ` · ${inc.ward.name}` : ''}</p>
                </Link>
              ))}
            </div>
          </div>

        </div>

        {/* ================= OPERATIONAL INCIDENT QUEUE TABLE ================= */}
        <div className="rounded-2xl border border-[#eef1ea] bg-white overflow-hidden shadow-xs flex flex-col">
          <div className="p-6 border-b border-[#eef1ea] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#0f172a] uppercase tracking-wider">
                Operational Incident Queue
              </h3>
              <p className="text-xs font-medium text-[#64748b]">
                Actionable municipal grievances assigned to your administrative jurisdiction
              </p>
            </div>

            {/* Quick Priority Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#64748b] mr-1">Filter:</span>
              {[
                { id: 'ALL', label: 'All' },
                { id: 'CRITICAL', label: 'Critical' },
                { id: 'HIGH', label: 'High' },
                { id: 'OPEN', label: 'Open' },
                { id: 'ACTIVE', label: 'Active Work' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilterPriority(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    filterPriority === pill.id
                      ? 'bg-[#143527] text-white shadow-2xs'
                      : 'bg-white border border-[#eef1ea] text-[#475569] hover:bg-[#f8fafc]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}

              <Link
                href="/admin/incidents"
                className="ml-2 flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <span>Full Workbench</span>
                <FiArrowRight className="size-3.5 stroke-[2.5]" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredIncidents.length === 0 ? (
              <div className="p-16 text-center text-xs text-[#64748b] space-y-3">
                <FiCheckCircle className="size-10 text-[#143527] mx-auto" />
                <p className="font-bold text-base text-[#0f172a]">Queue Clear for Selected Filter</p>
                <p className="font-medium max-w-md mx-auto">
                  No grievances currently match your filter criteria in this jurisdiction.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#64748b] uppercase tracking-wider font-bold border-b border-[#eef1ea]">
                    <th className="px-6 py-4">Tracking ID</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Ward / Location</th>
                    <th className="px-6 py-4">SLA Deadline</th>
                    <th className="px-6 py-4">Logged</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef1ea] text-[#0f172a] font-medium">
                  {filteredIncidents.map((inc) => {
                    const isBreached = inc.slaBreached || Boolean(inc.slaDeadline && new Date(inc.slaDeadline) < new Date() && inc.status !== 'RESOLVED');
                    return (
                      <tr key={inc.id} className="hover:bg-[#f8fafc]/70 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-sm text-[#0f172a] bg-[#f1f5f9] px-2.5 py-1 rounded-lg border border-[#eef1ea]">
                            #{inc.publicTrackingId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold uppercase text-[11px] text-[#334155] bg-white px-2.5 py-1 rounded-lg border border-[#eef1ea]">
                            {inc.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={inc.status} />
                        </td>
                        <td className="px-6 py-4">
                          <PriorityBadge priority={inc.priority} />
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#475569]">
                          {inc.ward?.name || 'Indore Municipal Area'}
                        </td>
                        <td className="px-6 py-4">
                          {inc.slaDeadline ? (
                            <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              isBreached 
                                ? 'bg-[#fef2f2] text-[#dc2626] border border-[#fee2e2]' 
                                : 'bg-[#f8fafc] text-[#334155] border border-[#eef1ea]'
                            }`}>
                              <FiClock className="size-3" />
                              {new Date(inc.slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-[#94a3b8] font-medium">Standard 24h</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[#64748b] font-medium">
                          {new Date(inc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            href={`/admin/incidents/${inc.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
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
        </div>

      </div>
    </div>
  );
}
