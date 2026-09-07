'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  FiMapPin, 
  FiClock, 
  FiCheckCircle, 
  FiShield, 
  FiImage, 
  FiArrowLeft,
  FiActivity,
  FiInfo,
  FiAlertCircle
} from 'react-icons/fi';
import CitizenHeader from '../../components/CitizenHeader';
import Shell from '../../components/Shell';

interface CaseUpdate {
  time: string;
  title: string;
  desc: string;
  completed: boolean;
}

export default function CitizenCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const reportMapRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [report, setReport] = useState<any | null>(null);
  const [updates, setUpdates] = useState<CaseUpdate[]>([]);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/signin');
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/signin');
      return;
    }
    setUser(JSON.parse(storedUser));

    fetch(getApiUrl(`/reports/${id}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.report) {
          const rep = resData.report;
          setReport(rep);

          // Construct timeline updates
          const timeline: CaseUpdate[] = [
            { time: new Date(rep.createdAt).toLocaleDateString(), title: 'Report Submitted', desc: 'Grievance recorded in system.', completed: true }
          ];

          if (rep.incident) {
            const inc = rep.incident;
            timeline.push({ time: new Date(inc.createdAt).toLocaleDateString(), title: 'Incident Created', desc: 'Case promoted to active queue.', completed: true });
            
            if (inc.status === 'ASSIGNED' || inc.status === 'IN_PROGRESS' || inc.status === 'RESOLVED') {
              timeline.push({ time: 'Completed', title: 'Crew Assigned', desc: 'Dispatched maintenance workers.', completed: true });
            } else {
              timeline.push({ time: 'Pending', title: 'Crew Assignment', desc: 'Awaiting ward officer allocation.', completed: false });
            }

            if (inc.status === 'IN_PROGRESS' || inc.status === 'RESOLVED') {
              timeline.push({ time: 'Active', title: 'Work In Progress', desc: 'Maintenance crew on-site patching repairs.', completed: true });
            } else {
              timeline.push({ time: 'Pending', title: 'Work In Progress', desc: 'Crew work pending.', completed: false });
            }

            if (inc.status === 'RESOLVED') {
              timeline.push({ time: new Date(inc.resolvedAt).toLocaleDateString(), title: 'Case Resolved', desc: 'Verified and closed.', completed: true });
            } else {
              timeline.push({ time: 'Pending', title: 'Resolution Check', desc: 'Awaiting verification.', completed: false });
            }
          } else {
            timeline.push({ time: 'Pending', title: 'Incident Promotion', desc: 'Awaiting operator verification.', completed: false });
          }

          setUpdates(timeline);
        } else {
          setErrorMsg(resData.error?.message || 'Grievance record was not found.');
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Unable to retrieve case details. Connection error.');
        setLoading(false);
      });
  }, [id, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !report || !report.latitude || !report.longitude) return;

    let mapInstance: any;

    const initMap = async () => {
      const container = document.getElementById('report-detail-map');
      if (!container) return;

      // Prevent double initialization errors in StrictMode
      if ((container as any)._leaflet_id || (container as any)._leaflet_loading) return;
      (container as any)._leaflet_loading = true;

      const L = (await import('leaflet')).default;
      LRef.current = L;

      // Inject standard leaflet stylesheet
      if (!document.getElementById('leaflet-css-style')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-style';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      mapInstance = L.map(container, {
        zoomControl: false,
        attributionControl: true
      }).setView([report.latitude, report.longitude], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance);

      const pinIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <span style="position: absolute; display: inline-flex; height: 24px; width: 24px; border-radius: 9999px; background-color: #5E1801; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="height: 14px; width: 14px; border-radius: 9999px; background-color: #5E1801; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);"></div>
          </div>
        `,
        className: 'report-map-static-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([report.latitude, report.longitude], { icon: pinIcon }).addTo(mapInstance);

      reportMapRef.current = mapInstance;
    };

    initMap();

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      const container = document.getElementById('report-detail-map');
      if (container) {
        delete (container as any)._leaflet_loading;
      }
      reportMapRef.current = null;
    };
  }, [report]);

  if (loading) {
    return (
      <div className="flex flex-grow items-center justify-center bg-[#faf9f6] min-h-screen">
        <div className="relative flex h-8 w-8">
          <span className="animate-ping absolute inline-flex h-full w-full bg-[#5E1801] rounded-full opacity-75"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-[#5E1801]"></span>
        </div>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans antialiased text-[#351008] text-left">
        <CitizenHeader />
        <main className="flex-grow max-w-xl mx-auto p-6 md:p-12 space-y-6">
          <div className="p-5 bg-white border border-[#E9E1D8] rounded-2xl shadow-sm text-center space-y-4">
            <FiAlertCircle className="text-4xl text-[#ba1a1a] mx-auto animate-pulse" />
            <h3 className="text-base font-semibold text-[#351008]">{errorMsg || 'Case not found'}</h3>
            <Link href="/profile" className="premium-btn-primary inline-flex px-6 py-2 text-xs font-semibold uppercase tracking-wider">
              Back to My Profile
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const trackingId = report.incident?.publicTrackingId || `REP-${report.id.substring(0, 8).toUpperCase()}`;
  const status = report.incident?.status || 'REPORTED';
  const category = report.categoryConfirmed || report.categorySuggested || 'OTHER';
  const incident = report.incident;

  // Timeline Step Status Configuration
  const step1Time = new Date(report.createdAt).toLocaleString();
  const step1Completed = true;

  const step2Time = incident ? new Date(incident.createdAt).toLocaleString() : 'Awaiting classification';
  const step2Completed = !!incident;
  const deptName = incident?.department?.name || 'Department Routing (Pending)';

  const step3Completed = !!incident && ['ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED'].includes(incident.status);
  const step3Time = (incident && incident.assignedAt) ? new Date(incident.assignedAt).toLocaleString() : 'Awaiting dispatcher routing';
  const workerEmail = incident?.worker?.email || 'Field worker details pending allocation';

  const step4Completed = !!incident && ['IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED'].includes(incident.status);
  const step4Time = (incident && incident.startedAt) ? new Date(incident.startedAt).toLocaleString() : 'Awaiting crew dispatch';

  const step5Completed = !!incident && incident.status === 'RESOLVED';
  const step5Time = incident?.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : 'Awaiting resolution submission';
  const resolvedNotes = incident?.resolvedNotes || 'Verification logs will appear here upon completion.';

  return (
    <Shell user={user} onLogout={handleLogout}>
      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-in text-left">
        
        {/* Back Link */}
        <div>
          <Link 
            href="/profile"
            className="inline-flex items-center gap-1.5 text-xs text-[#6F625C] hover:text-[#5E1801] transition-colors"
          >
            <FiArrowLeft />
            <span className="font-semibold">Back to My Profile</span>
          </Link>
        </div>

        {/* Case Profile Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-[#E9E1D8]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[#6F625C]">#{trackingId}</span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 border-blue-200 text-blue-700`}>
                {status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#351008] tracking-tight leading-snug">{report.description || 'Grievance report submission'}</h1>
            <p className="text-xs text-[#6F625C] font-semibold">
              Category: <span className="font-bold text-[#5E1801]">{category}</span> • Filed {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#EF6820] bg-orange-50 border border-orange-200 px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs">
              <FiClock className="animate-pulse" /> Active Case SLA Tracking
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Case map and detailed timeline (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Map Container */}
            <div className="bg-white border border-[#E9E1D8] rounded-2xl overflow-hidden shadow-sm">
              <div id="report-detail-map" className="h-56 bg-[#F7F4EE] relative w-full z-10"></div>
              <div className="p-5 border-t border-[#E9E1D8]/60 bg-[#faf9f6]">
                <h4 className="text-[10px] font-bold text-[#5E1801] uppercase tracking-wider">Resolved Boundary Coordinates</h4>
                <p className="text-sm font-semibold text-[#351008] mt-1 flex items-center gap-1">
                  <FiMapPin /> {report.incident?.ward?.name || 'Indore Serviced Municipal Limits'}
                </p>
                <p className="text-[10px] font-mono text-[#6F625C] mt-1">Lat: {report.latitude.toFixed(6)} · Lng: {report.longitude.toFixed(6)}</p>
              </div>
            </div>

            {/* DETAILED TIMELINE SECTION */}
            <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-8">
              <div>
                <h3 className="text-xs font-bold text-[#351008] uppercase tracking-wider">Civic Resolution Progress Timeline</h3>
                <p className="text-xs text-[#6F625C] mt-1 font-medium">Detailed Municipal verification log and crew dispatch status.</p>
              </div>

              {/* 5-Step Progress Trail */}
              <div className="relative pl-8 space-y-8 text-left">
                {/* Visual Connector Line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-[#E9E1D8]"></div>

                {/* Step 1: Submission Received */}
                <div className="relative">
                  <span className={`absolute -left-[28px] top-0.5 w-6 h-6 rounded-full border border-white flex items-center justify-center shadow-sm text-[10px] ${
                    step1Completed ? 'bg-[#5E1801] text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    1
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold text-[#351008]">Submission Received</h4>
                      <span className="text-[10px] text-[#9B9088] font-bold">{step1Time}</span>
                    </div>
                    <p className="text-xs text-[#6F625C] font-medium leading-relaxed">
                      Citizen report registered in Civique. Incident verification and image integrity check queued.
                    </p>
                  </div>
                </div>

                {/* Step 2: Department Mapped */}
                <div className="relative">
                  <span className={`absolute -left-[28px] top-0.5 w-6 h-6 rounded-full border border-white flex items-center justify-center shadow-sm text-[10px] ${
                    step2Completed ? 'bg-[#5E1801] text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    2
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold text-[#351008]">Grievance Boundary Verification</h4>
                      <span className="text-[10px] text-[#9B9088] font-bold">{step2Time}</span>
                    </div>
                    <p className="text-xs text-[#6F625C] font-medium leading-relaxed">
                      Assigned department: <span className="font-bold text-[#2B2523]">{deptName}</span>. Boundary checks confirmed ward coverage coordinates.
                    </p>
                  </div>
                </div>

                {/* Step 3: Dispatch & Assignment */}
                <div className="relative">
                  <span className={`absolute -left-[28px] top-0.5 w-6 h-6 rounded-full border border-white flex items-center justify-center shadow-sm text-[10px] ${
                    step3Completed ? 'bg-[#5E1801] text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    3
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold text-[#351008]">Crew Dispatch & Assignment</h4>
                      <span className="text-[10px] text-[#9B9088] font-bold">{step3Time}</span>
                    </div>
                    <p className="text-xs text-[#6F625C] font-medium leading-relaxed">
                      Field maintenance crew assigned to repair: <span className="font-mono text-[11px] font-bold text-[#5E1801]">{workerEmail}</span>.
                    </p>
                  </div>
                </div>

                {/* Step 4: Work In Progress */}
                <div className="relative">
                  <span className={`absolute -left-[28px] top-0.5 w-6 h-6 rounded-full border border-white flex items-center justify-center shadow-sm text-[10px] ${
                    step4Completed ? 'bg-[#5E1801] text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    4
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold text-[#351008]">Repairs in Progress</h4>
                      <span className="text-[10px] text-[#9B9088] font-bold">{step4Time}</span>
                    </div>
                    <p className="text-xs text-[#6F625C] font-medium leading-relaxed">
                      Crew dispatched on-site with required machinery. Tracking status actively updated from worker app.
                    </p>
                  </div>
                </div>

                {/* Step 5: Verification & Resolution */}
                <div className="relative">
                  <span className={`absolute -left-[28px] top-0.5 w-6 h-6 rounded-full border border-white flex items-center justify-center shadow-sm text-[10px] ${
                    step5Completed ? 'bg-[#12B76A] text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    5
                  </span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-sm font-bold text-[#351008]">Resolution Verified</h4>
                      <span className="text-[10px] text-[#9B9088] font-bold">{step5Time}</span>
                    </div>
                    <p className="text-xs text-[#6F625C] font-medium leading-relaxed">
                      {resolvedNotes}
                    </p>
                    {incident?.afterPhotoUrls && incident.afterPhotoUrls.length > 0 && (
                      <div className="mt-3 bg-[#faf9f6] border border-[#E9E1D8] p-2.5 rounded-xl max-w-sm">
                        <span className="text-[9px] text-[#5E1801] font-bold uppercase tracking-wider block mb-1">Resolution Evidence Photo</span>
                        <div className="aspect-video rounded-lg overflow-hidden border border-[#D8CCC0] bg-[#F7F4EE]">
                          <img src={incident.afterPhotoUrls[0]} alt="Resolution" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Explanatory transparency card */}
            <div className="bg-[#F7F4EE]/60 border border-[#CCB999]/30 rounded-2xl p-6 shadow-xs relative">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-[#f2ddbb]/50 text-[#5E1801] rounded-xl shrink-0">
                  <FiInfo className="text-base" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-[#351008] uppercase tracking-wider">What Happens Next?</h3>
                  <p className="text-xs text-[#6F625C] font-medium leading-relaxed">
                    Municipal crews process the reports queue. Once assigned, teams repair the damage on-site, upload an after-photo, and verify completion through automated resolution check pipelines.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Metadata, Evidence, Audits (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Case Details Summary Card */}
            <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-[#351008] uppercase tracking-wider">Case Overview</h3>
              
              <div className="space-y-3.5 text-xs text-[#6F625C] font-medium">
                <div className="flex justify-between border-b border-[#E9E1D8]/60 pb-2">
                  <span>Tracking ID</span>
                  <span className="font-mono font-bold text-[#5E1801]">#{trackingId}</span>
                </div>
                <div className="flex justify-between border-b border-[#E9E1D8]/60 pb-2">
                  <span>Priority Level</span>
                  <span className="font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded uppercase tracking-wider text-[9px]">{incident?.priority || 'MEDIUM'}</span>
                </div>
                <div className="flex justify-between border-b border-[#E9E1D8]/60 pb-2">
                  <span>Ward Limit</span>
                  <span className="font-bold text-[#2B2523]">{incident?.ward?.name || 'Ward 44'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Filed On</span>
                  <span className="font-bold text-[#2B2523]">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Evidence Image Gallery */}
            <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-[#351008] uppercase tracking-wider flex items-center gap-1.5">
                <FiImage className="text-[#9B9088]" /> Attached Evidence Photos
              </h3>

              <div className="aspect-video rounded-xl border border-[#E9E1D8] overflow-hidden bg-[#F7F4EE] relative group cursor-pointer shadow-xs">
                <img 
                  alt="Closeup view" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  src={report.photoUrl}
                />
              </div>
            </div>

            {/* Security Audit signature */}
            <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-[#351008] uppercase tracking-wider flex items-center gap-1.5">
                <FiShield className="text-[#CCB999]" /> Ledger Safety
              </h4>
              <p className="text-[10px] text-[#6F625C] font-semibold leading-relaxed">
                This grievance is registered cryptographically. Any status change writes a matching hash block to prevent retrospective alterations.
              </p>
            </div>

          </div>

        </div>
      </div>
    </Shell>
  );
}
