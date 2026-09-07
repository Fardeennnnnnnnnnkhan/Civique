'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiClock, 
  FiArrowUpRight,
  FiTrendingUp,
  FiZap
} from 'react-icons/fi';
import LoadingState from '../components/LoadingState';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ openCount: 0, resolvedCount: 0, slaCompliance: 100 });
  const [incidents, setIncidents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  // 1. Fetch dashboard metrics and incidents scoped by user role
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Fetch Metrics & Activities
    fetch(getApiUrl('/incidents/admin-metrics'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          setMetrics(resData.data.metrics);
          setActivities(resData.data.recentActivities);
        }
      })
      .catch(console.error);

    // Fetch the authenticated operational queue (the public map endpoint is not an admin DTO).
    fetch(getApiUrl('/incidents/admin-queue'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data?.incidents) {
          setIncidents(resData.data.incidents);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // 2. Initialize Map Preview container
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    const loadLeaflet = async () => {
      const container = mapContainerRef.current;
      if (!container) return;

      if ((container as any)._leaflet_id || (container as any)._leaflet_loading) return;
      (container as any)._leaflet_loading = true;

      const L = (await import('leaflet')).default;
      LRef.current = L;

      // Inject Leaflet CSS styles
      if (!document.getElementById('leaflet-css-style')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-style';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const map = L.map(container, {
        zoomControl: false,
        attributionControl: false
      }).setView([22.7196, 75.8577], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      mapRef.current = map;
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const container = mapContainerRef.current;
      if (container) {
        delete (container as any)._leaflet_loading;
      }
    };
  }, []);

  // 3. Render markers dynamically inside map preview when incidents update
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const colorMap: Record<string, string> = {
      REPORTED: '#2E90FA',
      ASSIGNED: '#7F56D9',
      IN_PROGRESS: '#EF6820',
      RESOLVED: '#12B76A',
      ESCALATED: '#F04438'
    };

    incidents.forEach(inc => {
      const color = colorMap[inc.status] || '#9B9088';
      const customIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
            <span style="position: absolute; display: inline-flex; height: 18px; width: 18px; border-radius: 9999px; background-color: ${color}; opacity: 0.3; animation: pulse 2s infinite;"></span>
            <div style="height: 10px; width: 10px; border-radius: 9999px; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
          </div>
        `,
        className: 'preview-map-marker',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon })
        .addTo(map)
        .bindPopup(`<b>${inc.category}</b><br/>#${inc.publicTrackingId}`);

      markersRef.current.push(marker);
    });

    if (incidents.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.2));
    }
  }, [incidents]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white min-h-[500px]">
        <LoadingState />
      </div>
    );
  }

  const metricCards = [
    { 
      title: 'Open Cases', 
      count: metrics.openCount.toLocaleString(), 
      borderLeft: 'border-l-4 border-[#EF6820]',
      icon: FiAlertTriangle,
      iconBg: 'bg-[#EF6820]/10',
      iconColor: 'text-[#EF6820]'
    },
    { 
      title: 'Resolved Today', 
      count: metrics.resolvedCount.toLocaleString(), 
      borderLeft: 'border-l-4 border-[#12B76A]',
      icon: FiCheckCircle,
      iconBg: 'bg-[#12B76A]/10',
      iconColor: 'text-[#12B76A]'
    },
    { 
      title: 'SLA Compliance', 
      count: `${metrics.slaCompliance}%`, 
      borderLeft: 'border-l-4 border-[#CCB999]',
      icon: FiClock,
      iconBg: 'bg-[#CCB999]/15',
      iconColor: 'text-[#5E1801]'
    }
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 text-left bg-white">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#2B2523] tracking-tight">Overview</h2>
          <p className="text-sm font-medium text-[#6F625C] mt-1">Real-time status of your assigned civic scope.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-[#12B76A] bg-green-50 border border-green-200 px-4 py-2 rounded-xl shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] animate-ping"></span>
          Live Stream Active
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metricCards.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div 
              key={idx}
              className={`bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group ${m.borderLeft}`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-semibold uppercase tracking-wider text-[#6F625C]">{m.title}</span>
                <div className={`p-2 rounded-xl ${m.iconBg} ${m.iconColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="text-lg" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-[#2B2523]">{m.count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BENTO LAYOUT (MAP & FEED) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map Preview card */}
        <div className="lg:col-span-2 bg-white border border-[#E9E1D8] rounded-2xl overflow-hidden shadow-sm flex flex-col h-[500px]">
          <div className="p-6 border-b border-[#E9E1D8] flex justify-between items-center bg-white">
            <h3 className="font-semibold text-xs text-[#2B2523] uppercase tracking-wider">Live Incident Map Preview</h3>
            <Link 
              href="/map"
              className="text-xs text-[#5E1801] hover:underline underline-offset-4 decoration-[#CCB999] font-semibold flex items-center gap-1 transition-all"
            >
              Expand Map <FiArrowUpRight className="text-sm" />
            </Link>
          </div>

          <div className="flex-1 relative bg-white overflow-hidden">
            {/* Leaflet instance container */}
            <div id="preview-map-leaflet" ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full"></div>
          </div>
        </div>

        {/* Activity Feed Card */}
        <div className="bg-white border border-[#E9E1D8] rounded-2xl overflow-hidden shadow-sm flex flex-col h-[500px]">
          <div className="p-6 border-b border-[#E9E1D8] bg-white">
            <h3 className="font-semibold text-xs text-[#2B2523] uppercase tracking-wider">Recent Activity</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-xs text-[#9B9088] font-light">
                <FiZap className="text-xl mb-2 text-[#CCB999]" />
                <span>No recent activities recorded.</span>
              </div>
            ) : (
              <div className="relative pl-6 border-l border-[#E9E1D8] space-y-6">
                {activities.map((act, idx) => {
                  const colors: Record<string, string> = {
                    critical: 'bg-[#B42318] ring-4 ring-[#B42318]/10',
                    resolved: 'bg-[#12B76A] ring-4 ring-[#12B76A]/10',
                    reported: 'bg-[#2E90FA] ring-4 ring-[#2E90FA]/10',
                  };
                  return (
                    <div key={idx} className="relative group text-left">
                      <span className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full ${colors[act.type] || 'bg-gray-400'}`}></span>
                      <span className="text-[10px] text-[#9B9088] font-semibold uppercase tracking-wider">{act.time}</span>
                      <div className="bg-white border border-[#E9E1D8] p-3 rounded-xl shadow-xs mt-1 transition-all group-hover:border-[#CCB999]">
                        <h4 className="text-xs font-semibold text-[#2B2523]">{act.title}</h4>
                        <p className="text-[11px] text-[#6F625C] font-light mt-0.5">{act.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ACTIVE TICKET QUEUE LISTING */}
      <div className="bg-white border border-[#E9E1D8] rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-6 border-b border-[#E9E1D8]">
          <h3 className="font-semibold text-xs text-[#2B2523] uppercase tracking-wider">Active Incident Queue</h3>
        </div>
        <div className="overflow-x-auto">
          {incidents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#9B9088] font-light">
              <FiCheckCircle className="text-2xl text-[#12B76A] mx-auto mb-2" />
              <span>Queue clear. No incidents currently assigned to your scope.</span>
            </div>
          ) : (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#faf9f6] text-[#6F625C] uppercase tracking-wider font-semibold border-b border-[#E9E1D8]">
                  <th className="px-6 py-4">Tracking ID</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Ward</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E1D8]/60 text-[#2B2523] font-light">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#faf9f6]/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold">#{inc.publicTrackingId}</td>
                    <td className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-[#5E1801]">
                      {inc.category}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        inc.status === 'REPORTED' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                        inc.status === 'ASSIGNED' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                        inc.status === 'IN_PROGRESS' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                        inc.status === 'RESOLVED' ? 'bg-green-50 border-green-200 text-green-700' :
                        'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-red-700">{inc.priority}</td>
                    <td className="px-6 py-4">{inc.ward?.name || 'Indore Boundary'}</td>
                    <td className="px-6 py-4">{new Date(inc.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/incidents/${inc.id}`}
                        className="premium-btn-primary inline-block px-4.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-center"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
