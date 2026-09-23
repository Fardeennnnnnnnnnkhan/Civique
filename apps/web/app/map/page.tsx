'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  FiSearch, 
  FiMapPin, 
  FiSliders, 
  FiPlus, 
  FiMinus, 
  FiNavigation, 
  FiClock, 
  FiX, 
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiTrash2,
  FiSun,
  FiDroplet,
  FiOctagon,
  FiHelpCircle,
  FiArrowRight,
  FiCopy,
  FiCheck,
  FiLayers,
  FiShare2,
  FiShield,
  FiList
} from 'react-icons/fi';
import { resumeRealtime, socket } from '../utils/socket';
import Shell from '../components/Shell';
import LoadingState from '../components/LoadingState';
import { apiFetch, logout } from '../../lib/api/client';
import { StatusBadge, PriorityBadge, Badge } from '@/components/ui';

interface MapIncident {
  id: string;
  trackingId: string;
  category: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  priority: string;
  date: string;
  desc: string;
  photoUrl: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  POTHOLE: { label: 'Road Potholes', icon: FiAlertCircle, color: '#eab308', bg: '#fefce8' },
  GARBAGE: { label: 'Solid Waste', icon: FiTrash2, color: '#143527', bg: '#143527]/10' },
  STREETLIGHT: { label: 'Streetlights', icon: FiSun, color: '#f59e0b', bg: '#fffbeb' },
  WATER_LEAK: { label: 'Water Leaks', icon: FiDroplet, color: '#0284c7', bg: '#f0f9ff' },
  SEWAGE: { label: 'Sewage Overflow', icon: FiActivity, color: '#9333ea', bg: '#faf5ff' },
  TRAFFIC_SIGN: { label: 'Traffic Signs', icon: FiOctagon, color: '#e11d48', bg: '#fff1f2' },
  OTHERS: { label: 'Other Hazards', icon: FiHelpCircle, color: '#475569', bg: '#f8fafc' },
};

const EMPTY_INCIDENTS: MapIncident[] = [];

export default function LiveCivicMapPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);
  const lastRealtimeSequenceRef = useRef('0');
  const appliedRealtimeEventsRef = useRef<Set<string>>(new Set());
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [baseLayer, setBaseLayer] = useState<'osm' | 'esri'>('osm');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const incidentsRef = useRef<MapIncident[]>([]);

  useEffect(() => { incidentsRef.current = incidents; }, [incidents]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setUser(null);
    window.location.href = '/signin';
  };

  // Safe user & incident load
  useEffect(() => {
    apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (currentUser?.id) {
          setUser(currentUser);
        }
      })
      .catch(() => undefined);

    apiFetch<{ incidents?: any[] }>('/incidents')
      .then((resData) => {
        if (resData.incidents && resData.incidents.length > 0) {
          const mapped = resData.incidents.map((i: any) => ({
            id: i.id,
            trackingId: i.trackingId || i.publicTrackingId || `CVQ-IND-${i.id.substring(0, 5).toUpperCase()}`,
            category: i.category || 'POTHOLE',
            title: i.title || `${i.category} Hazard`,
            address: i.ward?.name ? `${i.ward.name}, Indore` : 'Indore Municipal Area',
            latitude: i.latitude || 22.7196,
            longitude: i.longitude || 75.8577,
            status: i.status || 'REPORTED',
            priority: i.priority || 'MEDIUM',
            date: new Date(i.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            desc: i.reports?.[0]?.description || i.description || 'Reported civic issue requiring maintenance dispatch.',
            photoUrl: i.reports?.[0]?.photoUrl || null,
          }));
          setIncidents(mapped);
        } else {
          setIncidents(EMPTY_INCIDENTS);
        }
        setLoading(false);
      })
      .catch(() => {
        setIncidents(EMPTY_INCIDENTS);
        setLoading(false);
      });

    const applyRealtimeEvent = (event: any, allowGap = false) => {
      const eventId = typeof event?.eventId === 'string' ? event.eventId : null;
      if (eventId && appliedRealtimeEventsRef.current.has(eventId)) return;
      const nextSequence = typeof event.sequence === 'string' ? event.sequence : null;
      if (nextSequence && BigInt(nextSequence) <= BigInt(lastRealtimeSequenceRef.current)) return;
      if (nextSequence && !allowGap && BigInt(nextSequence) > BigInt(lastRealtimeSequenceRef.current) + BigInt(1)) return;
      const next = event.payload || event;
      if (!next?.id) return;
      const existing = incidentsRef.current.find((item) => item.id === next.id);
      const merged = existing ? { ...existing, ...next } : next;
      if (nextSequence) lastRealtimeSequenceRef.current = nextSequence;
      if (eventId) {
        appliedRealtimeEventsRef.current.add(eventId);
        if (appliedRealtimeEventsRef.current.size > 1000) {
          const oldest = appliedRealtimeEventsRef.current.values().next().value;
          if (oldest) appliedRealtimeEventsRef.current.delete(oldest);
        }
      }
      const mapped = {
        id: merged.id,
        trackingId: merged.trackingId || merged.publicTrackingId || `CVQ-IND-${merged.id.substring(0, 5).toUpperCase()}`,
        category: merged.category || 'POTHOLE',
        title: merged.title || `${merged.category || 'Civic'} Hazard`,
        address: merged.ward?.name ? `${merged.ward.name}, Indore` : (existing?.address || 'Indore Municipal Area'),
        latitude: merged.latitude ?? existing?.latitude,
        longitude: merged.longitude ?? existing?.longitude,
        status: merged.status || existing?.status || 'REPORTED',
        priority: merged.priority || existing?.priority || 'MEDIUM',
        date: new Date(merged.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        desc: merged.reports?.[0]?.description || merged.description || existing?.desc || 'No description provided.',
        photoUrl: merged.reports?.[0]?.photoUrl || merged.photoUrl || existing?.photoUrl || null,
      };
      setIncidents((prev) => event.type === 'incident:created' ? [mapped, ...prev.filter((item) => item.id !== mapped.id)] : prev.map((item) => item.id === mapped.id ? mapped : item));
      setSelectedIncident((prev) => prev && prev.id === mapped.id ? mapped : prev);
    };

    const synchronizeRealtime = async () => {
      try {
        let cursor = lastRealtimeSequenceRef.current;
        let page;
        do {
          page = await resumeRealtime(cursor);
          page.events.forEach((event) => applyRealtimeEvent(event, true));
          cursor = page.latestSequence || cursor;
        } while (page.hasMore);
      } catch {}
    };

    const handleLiveEvent = async (event: any) => {
      const nextSequence = typeof event?.sequence === 'string' ? event.sequence : null;
      if (nextSequence && BigInt(nextSequence) > BigInt(lastRealtimeSequenceRef.current) + BigInt(1)) await synchronizeRealtime();
      applyRealtimeEvent(event);
    };

    socket.connect();
    socket.on('connect', synchronizeRealtime);
    socket.on('incident:created', handleLiveEvent);
    socket.on('incident:updated', handleLiveEvent);
    void synchronizeRealtime();

    return () => {
      socket.off('incident:created', handleLiveEvent);
      socket.off('incident:updated', handleLiveEvent);
      socket.off('connect', synchronizeRealtime);
      socket.disconnect();
    };
  }, []);

  // Filter computation
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchCat = activeCategory === 'ALL' || inc.category === activeCategory;
      const matchStat = activeStatus === 'ALL' || 
        (activeStatus === 'ACTIVE' && (inc.status === 'REPORTED' || inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS')) ||
        (activeStatus === 'RESOLVED' && inc.status === 'RESOLVED') ||
        (activeStatus === 'ESCALATED' && inc.status === 'ESCALATED') ||
        inc.status === activeStatus;
      const matchQuery = !searchTerm || 
        inc.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.desc.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchStat && matchQuery;
    });
  }, [incidents, activeCategory, activeStatus, searchTerm]);

  // Leaflet Container & Markers
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loading) return;

    let mapInstance: any;

    const initMap = async () => {
      const container = document.getElementById('leaflet-map-canvas');
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
      }).setView([22.7214, 75.8750], 13);

      // OpenStreetMap is the safe default. Carto is opt-in because its key is
      // provider/account scoped and an invalid optional key must not break the map.
      const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
      const useCarto = process.env.NEXT_PUBLIC_MAP_TILE_PROVIDER === 'carto' && Boolean(cartoKey);
      const initialUrl = useCarto
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const layer = L.tileLayer(initialUrl, {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance);

      tileLayerRef.current = layer;
      mapRef.current = mapInstance;
      renderMarkers();
    };

    setTimeout(initMap, 200);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      const container = document.getElementById('leaflet-map-canvas');
      if (container) {
        delete (container as any)._leaflet_loading;
      }
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, [loading]);

  // Dynamic Marker Synchronization
  const renderMarkers = () => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredIncidents.forEach((inc) => {
      let pinColor = '#0f172a'; // slate
      let pulseRing = 'rgba(15, 23, 42, 0.2)';
      let isPulse = false;

      if (inc.status === 'RESOLVED') {
        pinColor = '#143527';
        pulseRing = 'rgba(20, 53, 39, 0.3)';
      } else if (inc.status === 'ESCALATED') {
        pinColor = '#dc2626';
        pulseRing = 'rgba(220, 38, 38, 0.3)';
        isPulse = true;
      } else if (inc.status === 'IN_PROGRESS') {
        pinColor = '#334155';
        pulseRing = 'rgba(20, 53, 39, 0.3)';
        isPulse = true;
      } else if (inc.status === 'ASSIGNED') {
        pinColor = '#d97706';
        pulseRing = 'rgba(217, 119, 6, 0.3)';
      } else if (inc.status === 'REPORTED') {
        pinColor = '#2563eb';
        pulseRing = 'rgba(37, 99, 235, 0.3)';
      }

      const customIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer;">
            ${isPulse ? `<span style="position: absolute; display: inline-flex; height: 30px; width: 30px; border-radius: 9999px; background-color: ${pulseRing}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ''}
            <div style="height: 22px; width: 22px; border-radius: 9999px; background-color: ${pinColor}; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25); display: flex; align-items: center; justify-content: center;">
              <div style="height: 6px; width: 6px; border-radius: 9999px; background-color: white;"></div>
            </div>
          </div>
        `,
        className: 'civique-leaflet-pin',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedIncident(inc);
          map.flyTo([inc.latitude, inc.longitude], 15, { duration: 1 });
        });

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    renderMarkers();
  }, [filteredIncidents]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const recenterMap = () => {
    mapRef.current?.flyTo([22.7214, 75.8750], 13, { duration: 1.2 });
  };

  const toggleBaseLayer = () => {
    const next = baseLayer === 'osm' ? 'esri' : 'osm';
    setBaseLayer(next);
    if (!tileLayerRef.current || !mapRef.current) return;

    tileLayerRef.current.remove();
    const L = LRef.current;
    if (!L) return;

    const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY;
    let nextUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; OpenStreetMap contributors';

    if (next === 'esri') {
      nextUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS';
    } else if (process.env.NEXT_PUBLIC_MAP_TILE_PROVIDER === 'carto' && cartoKey) {
      nextUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`;
      attribution = '&copy; OpenStreetMap &copy; CARTO';
    }

    tileLayerRef.current = L.tileLayer(nextUrl, {
      attribution,
      maxZoom: 19
    }).addTo(mapRef.current);
  };

  const copyTracking = (trackingId: string) => {
    navigator.clipboard.writeText(trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }

  const effectiveUser = user || { id: 'guest', email: 'Guest Citizen', role: 'CITIZEN' };

  return (
    <Shell user={effectiveUser} onLogout={handleLogout}>
      <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-white font-sans">
        
        {/* ================= LEAFLET MAP CONTAINER ================= */}
        <div id="leaflet-map-canvas" ref={mapContainerRef} className="absolute inset-0 z-0 h-full w-full" />

        {/* ================= FLOATING TOP CONTROL DOCK ================= */}
        <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
          <div className="max-w-5xl mx-auto space-y-2">
            
            {/* Main Search & Status Pill Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-2xl border border-[#eef1ea] bg-white/95 backdrop-blur-md p-2.5 sm:px-4 shadow-lg pointer-events-auto">
              
              {/* Search Field */}
              <div className="relative flex-1 min-w-[200px]">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] size-4" />
                <input
                  type="text"
                  placeholder="Search by Tracking ID (e.g. CVQ-IND-44821), Ward, or Defect..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-[#eef1ea] bg-[#f8fafc] pl-10 pr-4 py-2 text-xs font-semibold text-[#0f172a] placeholder:text-[#94a3b8] focus:border-[#143527] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143527]/20 transition-all shadow-2xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { id: 'ALL', label: 'All Incidents' },
                  { id: 'ACTIVE', label: 'Active Dispatches' },
                  { id: 'RESOLVED', label: 'Verified Fixed' },
                  { id: 'ESCALATED', label: 'SLA Escalations' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveStatus(st.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                      activeStatus === st.id
                        ? 'bg-[#143527] text-white shadow-xs font-bold'
                        : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Area Pulse Counter */}
              <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-[#eef1ea] text-xs font-black text-[#0f172a] shrink-0">
                <span className="flex size-2 rounded-full bg-[#143527] ring-2 ring-[#143527]/30 animate-pulse" />
                <span>{filteredIncidents.length} Mapped</span>
              </div>
              <button type="button" aria-pressed={viewMode === 'list'} onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white px-3 py-1.5 text-xs font-extrabold text-[#0f172a] shadow-2xs hover:bg-[#f8fafc]">
                <FiList className="size-3.5" /> {viewMode === 'map' ? 'Accessible list' : 'Map view'}
              </button>
            </div>

            {/* Category Filter Pills (Floating below search bar) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => setActiveCategory('ALL')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold backdrop-blur-md shadow-xs transition-all cursor-pointer ${
                  activeCategory === 'ALL'
                    ? 'border-[#143527] bg-[#143527] text-white'
                    : 'border-[#eef1ea] bg-white/95 text-[#475569] hover:bg-white hover:text-[#0f172a]'
                }`}
              >
                <span>All Categories</span>
              </button>

              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                const active = activeCategory === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategory(key)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold backdrop-blur-md shadow-xs transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-[#143527] bg-[#143527] text-white shadow-xs'
                        : 'border-[#eef1ea] bg-white/95 text-[#475569] hover:bg-white hover:text-[#0f172a]'
                    }`}
                  >
                    <Icon className="size-3.5" style={{ color: active ? '#ffffff' : config.color }} />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {viewMode === 'list' && (
          <section aria-label="Accessible civic incident list" className="absolute inset-4 top-28 z-20 overflow-y-auto rounded-3xl border border-[#eef1ea] bg-white/95 p-4 shadow-2xl backdrop-blur-md sm:p-6">
            <div className="mx-auto max-w-4xl space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-[#eef1ea] pb-4"><div><h2 className="text-xl font-black text-[#0f172a]">Public civic incident list</h2><p className="text-xs text-[#64748b]">Approximate locations are shown to protect household privacy.</p></div><button type="button" onClick={() => setViewMode('map')} className="rounded-xl border border-[#eef1ea] bg-white px-3 py-2 text-xs font-bold text-[#0f172a]">Return to map</button></div>
              {filteredIncidents.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-[#64748b]">No public incidents match these filters.</p> : filteredIncidents.map((inc) => <article key={inc.id} className="rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-xs"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-xs font-black text-[#143527]">{inc.trackingId}</p><h3 className="mt-1 text-sm font-black text-[#0f172a]">{inc.title}</h3><p className="mt-1 text-xs text-[#64748b]">{inc.address} · Approximate location</p></div><div className="flex items-center gap-2"><StatusBadge status={inc.status} /><PriorityBadge priority={inc.priority} /><button type="button" onClick={() => setSelectedIncident(inc)} className="rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3 py-2 text-xs font-black text-white">View details</button></div></div></article>)}
            </div>
          </section>
        )}

        {/* ================= FLOATING MAP NAVIGATION CONTROLS ================= */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 shadow-lg">
          <button
            type="button"
            aria-label="Toggle map basemap"
            onClick={toggleBaseLayer}
            title={baseLayer === 'osm' ? 'Switch to Esri High-Res Street View' : 'Switch to OpenStreetMap Standard'}
            className="flex size-10 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#0f172a] shadow-xs hover:bg-[#f8fafc] active:scale-95 transition-all cursor-pointer"
          >
            <FiLayers className="size-4.5" />
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={zoomIn}
            className="flex size-10 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#0f172a] shadow-xs hover:bg-[#f8fafc] active:scale-95 transition-all cursor-pointer"
          >
            <FiPlus className="size-4.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={zoomOut}
            className="flex size-10 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white text-[#0f172a] shadow-xs hover:bg-[#f8fafc] active:scale-95 transition-all cursor-pointer"
          >
            <FiMinus className="size-4.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            aria-label="Recenter to Indore"
            onClick={recenterMap}
            title="Recenter to Indore Municipal Area"
            className="mt-1 flex size-10 items-center justify-center rounded-xl border border-[#eef1ea] bg-[#143527] text-white shadow-xs hover:bg-[#0e271c] active:scale-95 transition-all cursor-pointer"
          >
            <FiNavigation className="size-4.5" />
          </button>
        </div>

        {/* ================= FLOATING BOTTOM LEGEND ================= */}
        <div className="absolute bottom-6 left-6 z-20 hidden md:flex items-center gap-3 rounded-2xl border border-[#eef1ea] bg-white/95 backdrop-blur-md px-4 py-2 text-[11px] font-extrabold text-[#475569] shadow-lg select-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#94a3b8]">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#143527] border border-white shadow-2xs" />
            <span>Resolved</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#334155] border border-white shadow-2xs" />
            <span>In Progress</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#d97706] border border-white shadow-2xs" />
            <span>Assigned</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#2563eb] border border-white shadow-2xs" />
            <span>Reported</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#dc2626] border border-white shadow-2xs animate-pulse" />
            <span>Escalated</span>
          </span>
        </div>

        {/* ================= SLIDE-OVER INCIDENT DETAIL DRAWER ================= */}
        {selectedIncident && (
          <aside className="absolute right-0 top-0 bottom-0 z-30 w-full sm:w-96 border-l border-[#eef1ea] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-left font-sans">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#eef1ea] bg-white flex items-start justify-between">
              <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#0f172a] bg-white px-2.5 py-1 rounded-lg border border-[#eef1ea] shadow-2xs">
                    {selectedIncident.trackingId}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyTracking(selectedIncident.trackingId)}
                    className="text-xs font-bold text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                    title="Copy tracking ID"
                  >
                    {copied ? <FiCheck className="text-[#143527]" /> : <FiCopy />}
                  </button>
                </div>
                <h3 className="text-base font-black text-[#0f172a] leading-snug">
                  {selectedIncident.title}
                </h3>
                <p className="text-xs font-bold text-[#64748b] flex items-center gap-1">
                  <FiMapPin className="text-[#143527] size-3.5 shrink-0" />
                  <span className="truncate">{selectedIncident.address}</span>
                </p>
              </div>

              <button
                type="button"
                aria-label="Close drawer"
                onClick={() => setSelectedIncident(null)}
                className="flex size-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] cursor-pointer"
              >
                <FiX className="size-5" />
              </button>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-left">
              
              {/* Photo Evidence if Available */}
              {selectedIncident.photoUrl ? (
                <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-[#eef1ea] bg-slate-900 shadow-2xs">
                  <img
                    src={selectedIncident.photoUrl}
                    alt="Grievance evidence"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-xs">
                    Geotagged Photographic Proof
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-3 text-xs text-[#64748b]">
                  <FiShield className="text-[#143527] size-4 shrink-0" />
                  <span>Citizen submission logged with geofenced GPS coordinates.</span>
                </div>
              )}

              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#eef1ea] bg-[#f8fafc] p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
                    Municipal Status
                  </span>
                  <StatusBadge status={selectedIncident.status} />
                </div>
                <div className="rounded-xl border border-[#eef1ea] bg-[#f8fafc] p-3 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#64748b] block">
                    Priority Level
                  </span>
                  <PriorityBadge priority={selectedIncident.priority} />
                </div>
              </div>

              {/* Factual Grievance Description */}
              <div className="space-y-1 rounded-2xl border border-[#eef1ea] bg-white p-4 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#475569] block">
                  Incident Description
                </span>
                <p className="text-xs text-[#334155] leading-relaxed">
                  {selectedIncident.desc}
                </p>
              </div>

              {/* SLA & Time Meta */}
              <div className="rounded-2xl border border-[#eef1ea] bg-[#f8fafc] p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748b] font-medium">Logged on Portal:</span>
                  <span className="font-extrabold text-[#0f172a]">{selectedIncident.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748b] font-medium">SLA Resolution Target:</span>
                  <span className="font-extrabold text-[#143527]">24h Municipal Dispatch</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748b] font-medium">Administrative Area:</span>
                  <span className="font-extrabold text-[#0f172a]">Selected incident service area</span>
                </div>
              </div>

            </div>

            {/* Drawer Footer Action Buttons */}
            <div className="p-4 border-t border-[#eef1ea] bg-white space-y-2">
              <Link
                href={`/report/${selectedIncident.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#143527] hover:bg-[#0e271c] py-2.5 text-xs font-black text-white shadow-xs transition-all active:scale-95"
              >
                <span>Open Grievance Dossier</span>
                <FiArrowRight className="size-3.5 stroke-[3]" />
              </Link>

              {effectiveUser.role && effectiveUser.role !== 'CITIZEN' && (
                <Link
                  href={`/admin/incidents/${selectedIncident.id}`}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#eef1ea] bg-white hover:bg-[#f8fafc] py-2 text-xs font-extrabold text-[#0f172a] shadow-2xs transition-colors"
                >
                  <span>Manage in Operations Desk</span>
                </Link>
              )}
            </div>

          </aside>
        )}

      </div>
    </Shell>
  );
}
