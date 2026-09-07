'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  FiSearch, 
  FiMapPin, 
  FiSliders, 
  FiPlus, 
  FiMinus, 
  FiNavigation, 
  FiImage, 
  FiClock, 
  FiX, 
  FiActivity,
  FiHome,
  FiChevronLeft,
  FiAlertCircle
} from 'react-icons/fi';
import { socket } from '../utils/socket';
import Shell from '../components/Shell';
import CitizenHeader from '../components/CitizenHeader';
import LoadingState from '../components/LoadingState';

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

export default function LiveCivicMapPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);

  // Multi-select state filters
  const [statusFilters, setStatusFilters] = useState<Record<string, boolean>>({
    REPORTED: true,
    ASSIGNED: true,
    IN_PROGRESS: true,
    RESOLVED: false,
    ESCALATED: true,
  });

  // Multi-select category filters
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>({
    POTHOLE: true,
    GARBAGE: true,
    STREETLIGHT: true,
    WATER_LEAK: true,
    SEWAGE: true,
    OTHER: true,
  });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const LRef = useRef<any>(null);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/signin';
  };

  // 1. Initial configuration and load incidents from API
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }

    fetch(getApiUrl('/incidents'), {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.incidents) {
          const mapped = resData.incidents.map((i: any) => ({
            id: i.id,
            trackingId: i.trackingId || i.publicTrackingId,
            category: i.category,
            title: `${i.category} Incident`,
            address: i.ward?.name || 'Indore Boundary',
            latitude: i.latitude,
            longitude: i.longitude,
            status: i.status,
            priority: i.priority,
            date: new Date(i.createdAt).toLocaleDateString(),
            desc: i.reports?.[0]?.description || 'No description provided.',
            photoUrl: i.reports?.[0]?.photoUrl || null
          }));
          setIncidents(mapped);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // 2. Real-time updates via Socket.io
    socket.connect();
    
    socket.on('incident:created', (event: any) => {
      const newInc = event.payload || event;
      const mapped = {
        id: newInc.id,
        trackingId: newInc.trackingId || newInc.publicTrackingId,
        category: newInc.category,
        title: `${newInc.category} Incident`,
        address: newInc.ward?.name || 'Indore Boundary',
        latitude: newInc.latitude,
        longitude: newInc.longitude,
        status: newInc.status,
        priority: newInc.priority,
        date: new Date(newInc.createdAt).toLocaleDateString(),
        desc: newInc.reports?.[0]?.description || 'No description provided.',
        photoUrl: newInc.reports?.[0]?.photoUrl || null
      };
      setIncidents(prev => [mapped, ...prev]);
    });

    socket.on('incident:updated', (event: any) => {
      const updatedInc = event.payload || event;
      const mapped = {
        id: updatedInc.id,
        trackingId: updatedInc.trackingId || updatedInc.publicTrackingId,
        category: updatedInc.category,
        title: `${updatedInc.category} Incident`,
        address: updatedInc.ward?.name || 'Indore Boundary',
        latitude: updatedInc.latitude,
        longitude: updatedInc.longitude,
        status: updatedInc.status,
        priority: updatedInc.priority,
        date: new Date(updatedInc.createdAt).toLocaleDateString(),
        desc: updatedInc.reports?.[0]?.description || 'No description provided.',
        photoUrl: updatedInc.reports?.[0]?.photoUrl || null
      };
      setIncidents(prev => prev.map(inc => inc.id === mapped.id ? mapped : inc));
      
      // Update selected card if currently open
      setSelectedIncident(prev => prev && prev.id === mapped.id ? mapped : prev);
    });

    return () => {
      socket.off('incident:created');
      socket.off('incident:updated');
      socket.disconnect();
    };
  }, []);

  // 3. Render and sync markers dynamically when filters or incidents update
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const matchesFilters = (inc: MapIncident) => {
      const categoryMatch = categoryFilters[inc.category] !== false;
      const statusMatch = statusFilters[inc.status] !== false;
      const searchMatch = !searchTerm || 
        inc.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inc.address.toLowerCase().includes(searchTerm.toLowerCase());
      return categoryMatch && statusMatch && searchMatch;
    };

    const filtered = incidents.filter(matchesFilters);

    const colorMap: Record<string, string> = {
      REPORTED: '#2E90FA',
      ASSIGNED: '#7F56D9',
      IN_PROGRESS: '#EF6820',
      RESOLVED: '#12B76A',
      ESCALATED: '#F04438'
    };

    filtered.forEach(inc => {
      const color = colorMap[inc.status] || '#9B9088';
      
      const customIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
            <span style="position: absolute; display: inline-flex; height: 20px; width: 20px; border-radius: 9999px; background-color: ${color}; opacity: 0.3; animation: pulse 2s infinite;"></span>
            <div style="height: 12px; width: 12px; border-radius: 9999px; background-color: ${color}; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.15);"></div>
          </div>
        `,
        className: 'custom-leaflet-marker-wrapper',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedIncident(inc);
          map.setView([inc.latitude, inc.longitude], 15);
        });

      markersRef.current.push(marker);
    });
  }, [incidents, statusFilters, categoryFilters, searchTerm]);

  // Bind Leaflet Map container
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
      }).setView([22.7196, 75.8577], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance);

      mapRef.current = mapInstance;
    };

    setTimeout(initMap, 300);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      const container = document.getElementById('leaflet-map-canvas');
      if (container) {
        delete (container as any)._leaflet_loading;
      }
      mapRef.current = null;
    };
  }, [loading]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();
  const recenterMap = () => {
    mapRef.current?.setView([22.7196, 75.8577], 13);
  };

  const handleStatusToggle = (key: string) => {
    setStatusFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCategoryToggle = (key: string) => {
    setCategoryFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusColorStyle = (s: string) => {
    switch (s) {
      case 'REPORTED': return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'ASSIGNED': return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'IN_PROGRESS': return 'bg-orange-50 border-orange-200 text-orange-700';
      case 'RESOLVED': return 'bg-green-50 border-green-200 text-green-700';
      default: return 'bg-red-50 border-red-200 text-red-700';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }

  const renderMapContent = () => (
    <div className="flex h-full w-full overflow-hidden text-left bg-white relative">
      
      {/* FILTERS PANEL */}
      <aside className="hidden lg:flex w-72 border-r border-[#E9E1D8] h-full flex-col shrink-0 bg-white z-20">
        <div className="p-6 border-b border-[#E9E1D8] space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#2B2523] uppercase tracking-wider">Live Map Filters</h2>
            <p className="text-xs text-[#6F625C] font-light mt-0.5">Real-time Indore tracker</p>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Search bar */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9088]" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="premium-input w-full pl-9 pr-4 py-2.5 text-sm font-light focus:border-[#CCB999]"
            />
          </div>

          {/* Status filters */}
          <div className="space-y-3">
            <h3 className="text-xs text-[#6F625C] font-semibold uppercase tracking-wider">Ticket Status</h3>
            <div className="space-y-2 text-sm text-[#2B2523]">
              {Object.keys(statusFilters).map((key) => {
                const checked = statusFilters[key];
                return (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleStatusToggle(key)}
                      className="rounded border-[#D8CCC0] text-[#5E1801] focus:ring-[#5E1801] cursor-pointer h-4 w-4"
                    />
                    <span className="font-light group-hover:text-[#5E1801] transition-colors uppercase tracking-wide text-xs">{key}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Category checklist */}
          <div className="space-y-3">
            <h3 className="text-xs text-[#6F625C] font-semibold uppercase tracking-wider">Category List</h3>
            <div className="space-y-2 text-sm text-[#2B2523]">
              {Object.keys(categoryFilters).map((key) => {
                const checked = categoryFilters[key];
                return (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleCategoryToggle(key)}
                      className="rounded border-[#D8CCC0] text-[#5E1801] focus:ring-[#5E1801] cursor-pointer h-4 w-4"
                    />
                    <span className="font-light group-hover:text-[#5E1801] transition-colors uppercase tracking-wide text-xs">{key}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* MAP CANVAS PANEL */}
      <main className="flex-1 relative bg-white flex overflow-hidden h-full">
        {/* Leaflet container */}
        <div id="leaflet-map-canvas" ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full"></div>

        {/* Map controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button 
            onClick={zoomIn}
            className="h-9 w-9 bg-white border border-[#E9E1D8] shadow-sm rounded-xl flex items-center justify-center text-[#2B2523] hover:bg-[#faf9f6] transition-colors cursor-pointer"
          >
            <FiPlus />
          </button>
          <button 
            onClick={zoomOut}
            className="h-9 w-9 bg-white border border-[#E9E1D8] shadow-sm rounded-xl flex items-center justify-center text-[#2B2523] hover:bg-[#faf9f6] transition-colors cursor-pointer"
          >
            <FiMinus />
          </button>
          <button 
            onClick={recenterMap}
            className="h-9 w-9 bg-white border border-[#E9E1D8] shadow-sm rounded-xl flex items-center justify-center text-[#2B2523] hover:bg-[#faf9f6] transition-colors cursor-pointer mt-2"
          >
            <FiNavigation />
          </button>
        </div>

        {/* DETAILS SLIDEOVER SIDE-PANEL DRAWER */}
        {selectedIncident && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l border-[#E9E1D8] shadow-2xl z-30 flex flex-col animate-fade-in-right">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E9E1D8] flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-[#5E1801] bg-[#f2ddbb]/40 px-2 py-0.5 rounded uppercase tracking-wider">
                  {selectedIncident.category}
                </span>
                <h3 className="text-sm font-semibold text-[#2B2523] mt-1.5 leading-snug">{selectedIncident.title}</h3>
                <p className="text-xs text-[#6F625C] font-light flex items-center gap-1">
                  <FiMapPin className="text-[#9B9088]" />
                  {selectedIncident.address}
                </p>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="p-1 text-[#9B9088] hover:text-[#2B2523] rounded-lg hover:bg-[#faf9f6] cursor-pointer"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm font-medium text-[#2B2523]">
              {selectedIncident.photoUrl && (
                <div className="rounded-xl overflow-hidden border border-[#D8CCC0] h-36 bg-[#faf9f6]">
                  <img src={selectedIncident.photoUrl} alt="Incident File" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] text-[#5E1801] uppercase tracking-wider font-bold">Grievance Description</span>
                <p className="leading-relaxed text-sm font-semibold text-[#2B2523]">{selectedIncident.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#E9E1D8]/60">
                <div>
                  <span className="text-[10px] text-[#5E1801] uppercase tracking-wider font-bold block mb-1">Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColorStyle(selectedIncident.status)}`}>
                    {selectedIncident.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5E1801] uppercase tracking-wider font-bold block mb-1">Reported On</span>
                  <span className="text-xs text-[#2B2523] font-semibold">{selectedIncident.date}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E9E1D8]/60">
                <span className="text-[10px] text-[#5E1801] uppercase tracking-wider font-bold block mb-1">Case Tracking ID</span>
                <span className="font-mono font-bold text-[#5E1801] select-all">#{selectedIncident.trackingId}</span>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            {user?.role && user.role !== 'CITIZEN' && (
              <div className="p-5 border-t border-[#E9E1D8] bg-[#faf9f6]">
                <Link
                  href={`/admin/incidents/${selectedIncident.id}`}
                  className="premium-btn-primary block w-full py-2.5 text-center text-xs font-semibold tracking-wider uppercase"
                >
                  Manage Case File
                </Link>
              </div>
            )}
          </aside>
        )}
      </main>
    </div>
  );

  // If user is authenticated, wrap in dynamic Shell
  if (user) {
    return (
      <Shell user={user} onLogout={handleLogout}>
        <div className="h-[calc(100vh-64px)] w-full overflow-hidden relative">
          {renderMapContent()}
        </div>
      </Shell>
    );
  }

  // Guest view
  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      <CitizenHeader />
      <div className="flex-grow h-[calc(100vh-64px)] w-full overflow-hidden relative">
        {renderMapContent()}
      </div>
    </div>
  );
}
