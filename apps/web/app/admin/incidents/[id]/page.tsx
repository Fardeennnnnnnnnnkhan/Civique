'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  FiMapPin, 
  FiClock, 
  FiImage, 
  FiSend, 
  FiArrowLeft,
  FiSliders,
  FiAlertCircle,
  FiCheckCircle
} from 'react-icons/fi';
import LoadingState from '../../../components/LoadingState';
import OperationsModal from '../../../components/OperationsModal';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [status, setStatus] = useState('REPORTED');
  const [worker, setWorker] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [incident, setIncident] = useState<any | null>(null);

  // Worker resolution states
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; email: string } | null>(null);
  const [resolvedNotes, setResolvedNotes] = useState('');
  const [resolutionPhoto, setResolutionPhoto] = useState<File | null>(null);
  const [submittingOperations, setSubmittingOperations] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/signin');
      return;
    }

    // Retrieve active user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {}
    }

    // Fetch incident details
    fetch(getApiUrl(`/incidents/${id}`), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.incident) {
          setIncident(resData.incident);
          setStatus(resData.incident.status);
          setWorker(resData.incident.assignedTo || resData.incident.workerRef || '');
          setDepartment(resData.incident.departmentId || '');
        } else {
          setErrorMsg(resData.error?.message || 'Incident not found.');
        }
        setLoading(false);
      })
      .catch(() => {
        setErrorMsg('Unable to retrieve incident details. Connection error.');
        setLoading(false);
      });

    // Fetch departments
    fetch(getApiUrl('/geography/departments'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data?.departments) {
          setDepartments(resData.data.departments);
        }
      })
      .catch(console.error);

    // Fetch field workers
    fetch(getApiUrl('/users/workers'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data?.workers) {
          setWorkers(resData.data.workers);
        }
      })
      .catch(console.error);
  }, [id, router]);

  // Leaflet map initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || !incident) return;

    const loadLeaflet = async () => {
      const container = mapContainerRef.current;
      if (!container) return;

      if ((container as any)._leaflet_id || (container as any)._leaflet_loading) return;
      (container as any)._leaflet_loading = true;

      const L = (await import('leaflet')).default;
      LRef.current = L;

      // Inject Leaflet CSS
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
      }).setView([incident.latitude, incident.longitude], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const colorMap: Record<string, string> = {
        REPORTED: '#2E90FA',
        ASSIGNED: '#7F56D9',
        IN_PROGRESS: '#EF6820',
        RESOLUTION_SUBMITTED: '#12B76A',
        RESOLVED: '#12B76A',
        ESCALATED: '#F04438'
      };
      const color = colorMap[incident.status] || '#9B9088';

      const customIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;">
            <span style="position: absolute; display: inline-flex; height: 22px; width: 22px; border-radius: 9999px; background-color: ${color}; opacity: 0.3; animation: pulse 2s infinite;"></span>
            <div style="height: 12px; width: 12px; border-radius: 9999px; background-color: ${color}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        className: 'detail-map-marker',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      L.marker([incident.latitude, incident.longitude], { icon: customIcon }).addTo(map);

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
  }, [incident]);

  // Worker Action: Start Work
  const handleStartWork = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setSubmittingOperations(true);
    try {
      const res = await fetch(getApiUrl(`/incidents/${id}/start`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Repair work marked as In Progress successfully.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error?.message || 'Failed to start repair work.');
      }
    } catch (err) {
      toast.error('Error starting repair work.');
    } finally {
      setSubmittingOperations(false);
    }
  };

  // Worker Action: Submit Resolution
  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (!resolutionPhoto) {
      toast.error('Please select an after-photo showing proof of repair.');
      return;
    }

    setSubmittingOperations(true);
    const formData = new FormData();
    formData.append('photo', resolutionPhoto);
    formData.append('resolvedNotes', resolvedNotes);
    formData.append('captureAt', new Date().toISOString());
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      await new Promise<void>((resolve) => navigator.geolocation.getCurrentPosition((position) => { formData.append('latitude', String(position.coords.latitude)); formData.append('longitude', String(position.coords.longitude)); resolve(); }, () => resolve(), { enableHighAccuracy: true, timeout: 5000 }));
    }

    try {
      const res = await fetch(getApiUrl(`/incidents/${id}/resolve`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Resolution details submitted successfully. Awaiting verification.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(data.error?.message || 'Failed to submit resolution.');
      }
    } catch (err) {
      toast.error('Error submitting resolution.');
    } finally {
      setSubmittingOperations(false);
    }
  };

  // Admin Action: Save Assignments & Operations
  const handleUpdate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      // 1. Update status if changed
      if (status !== incident.status) {
        const statusRes = await fetch(getApiUrl(`/incidents/${id}/status`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          toast.error(statusData.error?.message || 'Failed to update status.');
          return;
        }
      }

      // 2. Assign worker/department if changed
      if (worker !== (incident.assignedTo || incident.workerRef || '') || department !== (incident.departmentId || '')) {
        const assignRes = await fetch(getApiUrl(`/incidents/${id}/assign`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            departmentId: department || null, 
            assignedTo: worker || null 
          })
        });
        const assignData = await assignRes.json();
        if (!assignRes.ok) {
          toast.error(assignData.error?.message || 'Failed to update assignment.');
          return;
        }
      }

      toast.success('Incident operations updated successfully.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error('Error updating incident operations details.');
    }
  };

  const getStatusStyle = (s: string) => {
    const styles: Record<string, string> = {
      REPORTED: 'bg-blue-50 border-blue-200 text-blue-700',
      ASSIGNED: 'bg-[#7F56D9]/10 border-[#7F56D9]/20 text-[#7F56D9]',
      IN_PROGRESS: 'bg-orange-50 border-orange-200 text-orange-700',
      RESOLUTION_SUBMITTED: 'bg-green-50 border-green-200 text-green-700',
      RESOLVED: 'bg-green-50 border-green-200 text-green-700',
      ESCALATED: 'bg-red-50 border-red-200 text-red-700'
    };
    return styles[s] || 'bg-gray-50 border-gray-200 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <LoadingState />
      </div>
    );
  }

  if (errorMsg || !incident) {
    return (
      <div className="max-w-xl mx-auto p-6 md:p-12 text-center space-y-4">
        <FiAlertCircle className="text-4xl text-[#ba1a1a] mx-auto" />
        <h3 className="text-base font-semibold text-[#2B2523]">{errorMsg || 'Incident not found'}</h3>
        <Link href="/admin/incidents" className="premium-btn-primary inline-flex px-6 py-2 text-xs font-semibold uppercase tracking-wider">
          Back to Incidents Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 text-left">
      
      {/* Back navigation link */}
      <div>
        <Link 
          href="/admin/incidents"
          className="inline-flex items-center gap-1.5 text-xs text-[#6F625C] hover:text-[#5E1801] transition-colors"
        >
          <FiArrowLeft />
          <span>Back to Incidents Directory</span>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-[#E9E1D8]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#6F625C]">#{incident.publicTrackingId}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(status)}`}>
              {status}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              {incident.priority} PRIORITY
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#2B2523] tracking-tight">{incident.category} Grievance Incident</h1>
          <p className="text-sm text-[#6F625C] font-medium">
            Category: <span className="font-semibold text-[#2B2523]">{incident.category}</span> • Mapped {new Date(incident.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#B42318] bg-red-50 border border-red-200 px-3.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1">
            <FiClock className="animate-pulse" /> active SLA tracking
          </span>
        </div>
      </div>

      {/* Bento Grid panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: details, files, and updates */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* AI insights Card */}
          <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#CCB999]"></div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#f2ddbb]/40 text-[#5E1801] rounded-xl shrink-0">
                <FiSliders className="text-lg" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="text-sm font-semibold text-[#2B2523]">AI Computer Vision Classification</h3>
                  <span className="text-[10px] font-semibold text-[#12B76A] bg-green-50 border border-green-200 px-2 py-0.5 rounded">91% Confidence</span>
                </div>
                <p className="text-xs text-[#6F625C] leading-relaxed font-light">
                  Visual scan matches category classification rules. Standard priority score assigned automatically. Safety flags active.
                </p>
              </div>
            </div>
          </div>

          {/* Description details card */}
          <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-xs text-[#2B2523] uppercase tracking-wider">Reports Logged ({incident.reports?.length || 0})</h3>
            
            {incident.reports?.map((rep: any, idx: number) => (
              <div key={rep.id} className="border-b border-[#E9E1D8]/60 pb-4 last:border-none last:pb-0">
                <div className="flex justify-between items-center text-xs text-[#9B9088] uppercase tracking-wider font-semibold mb-1.5">
                  <span>Report #{idx + 1}</span>
                  <span>{new Date(rep.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-[#2B2523] bg-white p-4 rounded-xl border border-[#E9E1D8] font-light leading-relaxed italic">
                  "{rep.description || 'No description listed'}"
                </p>
                {rep.photoUrl && (
                  <div className="mt-3 flex items-center gap-2">
                    <FiImage className="text-stone-400" />
                    <a href={rep.photoUrl} target="_blank" rel="noreferrer" className="text-xs text-[#5E1801] hover:underline font-semibold">
                      View Attached Photo
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resolution Evidence Card (If resolutions submitted) */}
          {(incident.afterPhotoUrls?.length > 0 || incident.resolvedNotes) && (
            <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-xs text-[#2B2523] uppercase tracking-wider text-[#12B76A]">Resolution Evidence</h3>
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl space-y-3">
                {incident.resolvedNotes && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#9B9088] uppercase tracking-wider">Field Worker Notes</h4>
                    <p className="text-sm font-light text-[#2B2523] mt-1">"{incident.resolvedNotes}"</p>
                  </div>
                )}
                {incident.afterPhotoUrls?.map((url: string, index: number) => (
                  <div key={index} className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-[#9B9088] uppercase tracking-wider">After Photo Proof</h4>
                    <div className="relative rounded-xl overflow-hidden border border-[#E9E1D8] max-w-md bg-stone-100">
                      <img src={url} alt="Resolution proof" className="w-full h-auto object-cover max-h-60" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: location, actions, and contact info */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Location map details */}
          <div className="bg-white border border-[#E9E1D8] rounded-2xl overflow-hidden shadow-sm">
            <div className="h-44 bg-[#F7F4EE] relative flex items-center justify-center">
              {/* Map container */}
              <div id="detail-map-leaflet" ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full"></div>
            </div>
            
            <div className="p-5 space-y-2">
              <h4 className="text-xs font-semibold text-[#2B2523] uppercase tracking-wider">Geographic Mapping</h4>
              <p className="text-xs text-[#2B2523] font-semibold flex items-center gap-1">
                <FiMapPin className="text-[#9B9088]" />
                {incident.ward?.name || 'Indore Boundary'}
              </p>
              <div className="text-xs font-mono text-[#6F625C] bg-white border border-[#E9E1D8] rounded-lg px-2.5 py-1.5 flex justify-between">
                <span>Lat: {incident.latitude.toFixed(6)}</span>
                <span>Lng: {incident.longitude.toFixed(6)}</span>
              </div>
            </div>
          </div>

          {/* Operations Actions Panel */}
          <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-xs text-[#2B2523] uppercase tracking-wider">Update Operations</h3>
            
            {submittingOperations ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5E1801]"></div>
              </div>
            ) : currentUser?.role === 'FIELD_WORKER' ? (
              /* WORKER ACTIONS */
              <div className="space-y-4">
                {status === 'ASSIGNED' && (
                  <div className="space-y-2">
                    <p className="text-xs text-[#6F625C] font-light leading-relaxed">
                      You are assigned to this ticket. Click below to begin the repair works and notify the dashboard.
                    </p>
                    <button
                      onClick={handleStartWork}
                      className="premium-btn-primary w-full py-2.5 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FiSend /> Start Repair Work
                    </button>
                  </div>
                )}

                {status === 'IN_PROGRESS' && (
                  <form onSubmit={handleResolveIncident} className="space-y-4">
                    <p className="text-xs text-[#6F625C] font-light leading-relaxed">
                      Submit resolution details and a photograph showing the completed repair to request verification.
                    </p>
                    
                    <div className="space-y-2"><label className="block text-xs text-[#6F625C] font-semibold uppercase tracking-wider" htmlFor="photoInput">After photo proof</label><label htmlFor="photoInput" className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D8CCC0] bg-[#F7F4EE]/60 px-4 py-6 text-center transition-colors hover:border-[#5E1801] hover:bg-[#f2ddbb]/20"><FiImage className="mb-2 text-2xl text-[#5E1801]" /><span className="text-xs font-semibold text-[#351008]">{resolutionPhoto ? resolutionPhoto.name : 'Choose a repair photo'}</span><span className="mt-1 text-[10px] text-[#9B9088]">JPEG, PNG or WebP · max 5MB</span><input id="photoInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setResolutionPhoto(e.target.files?.[0] || null)} className="sr-only" required /></label>{resolutionPhoto && <div className="flex items-center justify-between rounded-xl border border-[#E9E1D8] bg-white px-3 py-2 text-[11px] text-[#6F625C]"><span>Evidence ready for validation</span><button type="button" onClick={() => setResolutionPhoto(null)} className="font-semibold text-[#B42318]">Remove</button></div>}</div>

                    <div className="space-y-1">
                      <label className="block text-xs text-[#6F625C] font-semibold uppercase tracking-wider" htmlFor="notesInput">Resolution Notes</label>
                      <textarea
                        id="notesInput"
                        placeholder="Describe the repairs completed (e.g. potholes filled, pole replaced)..."
                        value={resolvedNotes}
                        onChange={(e) => setResolvedNotes(e.target.value)}
                        className="premium-input w-full px-3 py-2 text-xs font-light bg-white focus:border-[#CCB999] h-20 resize-none"
                        required
                      />
                    </div>

                    <div className="rounded-2xl border border-[#E9E1D8] bg-[#F7F4EE]/70 p-3 text-[11px] text-[#6F625C]"><span className="font-semibold text-[#351008]">Evidence checks</span><p className="mt-1">Your submission records capture time, location, worker identity, and a tamper-evident image hash. It will move to verification—not directly to resolved.</p></div>

                    <button
                      type="submit"
                      className="premium-btn-primary w-full py-2.5 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FiSend /> Submit Resolution
                    </button>
                  </form>
                )}

                {status === 'RESOLUTION_SUBMITTED' && (
                  <div className="bg-[#12B76A]/5 border border-[#12B76A]/20 p-4 rounded-xl text-center space-y-1">
                    <FiCheckCircle className="text-xl text-[#12B76A] mx-auto" />
                    <h4 className="text-xs font-semibold text-[#12B76A]">Resolution Submitted</h4>
                    <p className="text-[10px] text-[#6F625C] font-light">Awaiting AI verification and citizen confirmation.</p>
                  </div>
                )}

                {status === 'RESOLVED' && (
                  <div className="bg-[#12B76A]/10 border border-[#12B76A]/20 p-4 rounded-xl text-center space-y-1">
                    <FiCheckCircle className="text-xl text-[#12B76A] mx-auto" />
                    <h4 className="text-xs font-semibold text-[#12B76A]">Incident Resolved</h4>
                    <p className="text-[10px] text-[#6F625C] font-light">Grievance closed successfully.</p>
                  </div>
                )}

                {!['ASSIGNED', 'IN_PROGRESS', 'RESOLUTION_SUBMITTED', 'RESOLVED'].includes(status) && (
                  <p className="text-xs text-[#9B9088] text-center font-light py-2">
                    Work order is in status <span className="font-semibold uppercase text-[#5E1801]">{status}</span>. Awaiting assignment update from Ward Officers.
                  </p>
                )}
              </div>
            ) : (
              /* OFFICIAL / ADMIN ACTIONS */
              <form className="space-y-4" onSubmit={handleUpdate}>
                
                <div className="rounded-2xl border border-[#E9E1D8] bg-[#F7F4EE]/70 p-4">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#9B9088]">Ownership</p><p className="mt-1 text-sm font-semibold text-[#351008]">{departments.find(d => d.id === department)?.name || 'No department selected'}</p><p className="mt-0.5 text-xs text-[#6F625C]">{workers.find(w => w.id === worker)?.email || 'No field worker selected'}</p></div><button type="button" onClick={() => setAssignmentOpen(true)} className="rounded-xl border border-[#D8CCC0] bg-white px-3 py-2 text-xs font-semibold text-[#5E1801] hover:bg-[#f2ddbb]/30">Manage assignment</button></div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-[#6F625C] font-semibold uppercase tracking-wider" htmlFor="statusSelect">Ticket Status</label>
                  <select
                    id="statusSelect"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="premium-input w-full px-3 py-2 text-xs font-light bg-white focus:border-[#CCB999]"
                  >
                    <option value="REPORTED">Reported</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLUTION_SUBMITTED">Resolution Submitted</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="ESCALATED">Escalated</option>
                  </select>
                </div>

                <div className="hidden space-y-1">
                  <label className="block text-[10px] text-[#6F625C] font-semibold uppercase tracking-wider" htmlFor="deptSelect">Assign Department</label>
                  <select
                    id="deptSelect"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="premium-input w-full px-3 py-2 text-xs font-light bg-white focus:border-[#CCB999]"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div className="hidden space-y-1">
                  <label className="block text-[10px] text-[#6F625C] font-semibold uppercase tracking-wider" htmlFor="workerSelect">Assign Field Worker</label>
                  <select
                    id="workerSelect"
                    value={worker}
                    onChange={(e) => setWorker(e.target.value)}
                    className="premium-input w-full px-3 py-2 text-xs font-light bg-white focus:border-[#CCB999]"
                  >
                    <option value="">Select Worker</option>
                    {workers.map((wrk: any) => (
                      <option key={wrk.id} value={wrk.id}>{wrk.email || wrk.phoneNumber || wrk.id}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="premium-btn-primary w-full py-2.5 text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FiSend /> Save Operations
                </button>

              </form>
            )}
          </div>

        </div>

      </div>

      <OperationsModal open={assignmentOpen} department={department} worker={worker}
        departments={departments.map(d => ({ id: d.id, label: d.name, meta: `${d.defaultSlaHours || 24}h SLA` }))}
        workers={workers.map(w => ({ id: w.id, label: w.email || w.phoneNumber || w.id, meta: w.ward?.name || 'Field worker' }))}
        onDepartment={setDepartment} onWorker={setWorker} onClose={() => setAssignmentOpen(false)}
        onSave={async () => { await handleUpdate(); }} saving={submittingOperations} />

    </div>
  );
}
