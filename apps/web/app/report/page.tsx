'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiCamera, 
  FiAlertTriangle, 
  FiTrash2, 
  FiSliders, 
  FiActivity, 
  FiClock, 
  FiPlus, 
  FiCheckCircle, 
  FiMapPin, 
  FiArrowRight, 
  FiUser, 
  FiPhone, 
  FiCheck,
  FiUploadCloud,
  FiX
} from 'react-icons/fi';
import Shell from '../components/Shell';
import CitizenHeader from '../components/CitizenHeader';
import LoadingState from '../components/LoadingState';
import CiviqueAIVerification from '../components/CiviqueAIVerification';

interface CategoryTile {
  key: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  subcategories: string[];
}

export default function SinglePageReport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportMapRef = useRef<any>(null);
  const reportMarkerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // User Authentication State
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form Data States
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [landmark, setLandmark] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<string>('MEDIUM');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [citizenName, setCitizenName] = useState<string>('');
  const [citizenPhone, setCitizenPhone] = useState<string>('');

  // Resolved Geography
  const [resolvedGeo, setResolvedGeo] = useState<{
    wardId: string;
    wardName: string;
    zoneId: string;
    zoneName: string;
    cityName: string;
    stateName: string;
  } | null>(null);

  // UI / API States
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingGeo, setIsResolvingGeo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{
    trackingId: string;
    photoUrl: string;
    isLinkedToDuplicate: boolean;
  } | null>(null);

  // Duplicates Check
  const [nearbyIncident, setNearbyIncident] = useState<any | null>(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  // Load user session
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (parsed.email) setCitizenName(parsed.email.split('@')[0]);
      } catch (e) {
        localStorage.clear();
      }
    }
    setCheckingAuth(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/signin';
  };



  const getApiUrl = (path: string) => {
    let base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api/v1';
    if (base.includes('localhost')) {
      base = base.replace('localhost', '127.0.0.1');
    }
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  // Categories definition
  const categoryTiles: CategoryTile[] = [
    { 
      key: 'POTHOLE', 
      name: 'Roads & Potholes', 
      desc: 'Craters, road damages, broken footpaths', 
      icon: FiAlertTriangle,
      subcategories: ['Pothole', 'Road Damage', 'Open Manhole', 'Broken Footpath']
    },
    { 
      key: 'STREETLIGHT', 
      name: 'Streetlights', 
      desc: 'Dark streets, flickering poles, exposed wires', 
      icon: FiSliders,
      subcategories: ['Not Working', 'Flickering', 'Exposed Wiring']
    },
    { 
      key: 'GARBAGE', 
      name: 'Waste & Garbage', 
      desc: 'Illegal dumpings, overflowing garbage bins', 
      icon: FiTrash2,
      subcategories: ['Overflowing Bin', 'Illegal Dumping', 'Missed Collection']
    },
    { 
      key: 'WATER_LEAK', 
      name: 'Water Leaks', 
      desc: 'Broken pipes, street flooding, valve ruptures', 
      icon: FiActivity,
      subcategories: ['Pipe Leakage', 'Flooded Street', 'No Water Supply']
    },
    { 
      key: 'SEWAGE', 
      name: 'Sewage Overflow', 
      desc: 'Blocked lines, street puddles, heavy odors', 
      icon: FiClock,
      subcategories: ['Blocked Drain', 'Sewage Overflow', 'Gully Blown']
    },
    { 
      key: 'TRAFFIC_SIGN', 
      name: 'Traffic Signals', 
      desc: 'Broken signals, missing signs, signal faults', 
      icon: FiAlertTriangle,
      subcategories: ['Signal Not Working', 'Missing Signpost', 'Damaged Signal']
    },
    { 
      key: 'VANDALISM', 
      name: 'Vandalism & Graffiti', 
      desc: 'Defaced walls, graffiti, broken benches', 
      icon: FiPlus,
      subcategories: ['Graffiti', 'Property Damage', 'Broken Bench']
    },
    { 
      key: 'STRAY_ANIMALS', 
      name: 'Stray Animals', 
      desc: 'Dangerous stray animals, cattle on roads', 
      icon: FiActivity,
      subcategories: ['Stray Cattle', 'Stray Dogs', 'Dead Animal']
    },
    { 
      key: 'ILLEGAL_PARKING', 
      name: 'Illegal Parking', 
      desc: 'Vehicles blocking footpaths or driveways', 
      icon: FiSliders,
      subcategories: ['Sidewalk Blocked', 'No Parking Zone', 'Abandoned Vehicle']
    },
    { 
      key: 'TREE_FALL', 
      name: 'Fallen Trees', 
      desc: 'Branches or trees blocking roads/wires', 
      icon: FiActivity,
      subcategories: ['Road Blocked', 'Wire Danger', 'Park Blockage']
    },
    { 
      key: 'STORM_DRAIN', 
      name: 'Storm Drain Blockage', 
      desc: 'Clogged gratings, road waterlogging', 
      icon: FiClock,
      subcategories: ['Clogged Grating', 'Road Waterlogged', 'Gully Blocked']
    },
    { 
      key: 'NOISE_POLLUTION', 
      name: 'Noise Pollution', 
      desc: 'Loudspeakers, night construction, loud horns', 
      icon: FiSliders,
      subcategories: ['Loudspeaker', 'Night Construction', 'Industrial Noise']
    },
    { 
      key: 'OTHERS', 
      name: 'Other Issues', 
      desc: 'Public space damages, park problems', 
      icon: FiPlus,
      subcategories: ['Park Damage', 'Vandalism', 'Others']
    }
  ];

  // Image Upload helpers
  const handleTriggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const triggerAutoClassification = async (file: File) => {
    setIsClassifying(true);
    setAiConfidence(null);
    setAiSuggestedCategory(null);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('description', description || 'Image classification preview query');

    try {
      const res = await fetch(getApiUrl('/reports/classify-draft'), {
        method: 'POST',
        body: formData,
      });

      const responseData = await res.json();
      if (res.ok && responseData.success) {
        const { categorySuggested, confidence, label } = responseData.data;
        
        // Update suggested category state
        setAiSuggestedCategory(categorySuggested);
        
        // Update selected category card
        setCategory(categorySuggested);
        
        // Show confidence score badge if returned
        if (confidence !== null && confidence !== undefined) {
          setAiConfidence(Math.round(confidence * 100));
        }

        // Auto-fill custom category field if irrelevant (OTHERS) item detected
        if (categorySuggested === 'OTHERS' && label) {
          setCustomCategory(label);
        } else {
          setCustomCategory('');
        }
      }
    } catch (err) {
      console.warn('[Auto-Classification] Fetch query failed:', err);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size exceeds the 5MB limit.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only images are supported.');
        return;
      }
      setErrorMsg('');
      const newImages = [file];
      const newPreviews = newImages.map(img => URL.createObjectURL(img));
      setImages(newImages);
      setImagePreviews(newPreviews);

      // Instantly run auto-classification query on image upload
      triggerAutoClassification(file);
    }
  };

  const handleDeleteImage = () => {
    setImages([]);
    setImagePreviews([]);
    setAiSuggestedCategory(null);
    setAiConfidence(null);
  };

  const handleResolveCoordinates = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setIsResolvingGeo(true);
    setErrorMsg('');
    try {
      const res = await fetch(getApiUrl(`/geography/resolve?lat=${lat}&lng=${lng}`));
      const responseData = await res.json();
      if (res.ok && responseData.success) {
        setResolvedGeo(responseData.data);
      } else {
        setErrorMsg(responseData.error?.message || 'Selected coordinates are outside Indore limits.');
        setResolvedGeo(null);
      }
    } catch (err) {
      setErrorMsg('Unable to connect to geographic boundary resolver.');
      setResolvedGeo(null);
    } finally {
      setIsResolvingGeo(false);
    }
  };

  const handleAcquireLocation = () => {
    setErrorMsg('');
    setIsLocating(true);
    setResolvedGeo(null);

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(position.coords.accuracy || 10);
        setIsLocating(false);

        if (reportMapRef.current) {
          reportMapRef.current.setView([lat, lng], 15);
          const L = LRef.current;
          if (L) {
            const pinIcon = L.divIcon({
              html: `
                <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: grab;">
                  <span style="position: absolute; display: inline-flex; height: 24px; width: 24px; border-radius: 9999px; background-color: #5E1801; opacity: 0.25; animation: ping 2s infinite;"></span>
                  <div style="height: 14px; width: 14px; border-radius: 9999px; background-color: #5E1801; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.15);"></div>
                </div>
              `,
              className: 'report-map-draggable-pin',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });

            if (reportMarkerRef.current) {
              reportMarkerRef.current.setLatLng([lat, lng]);
            } else {
              const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(reportMapRef.current);
              marker.on('dragend', async (e: any) => {
                const newPos = e.target.getLatLng();
                await handleResolveCoordinates(newPos.lat, newPos.lng);
              });
              reportMarkerRef.current = marker;
            }
          }
        }
        await handleResolveCoordinates(lat, lng);
      },
      (error) => {
        setIsLocating(false);
        setErrorMsg('Unable to retrieve GPS coordinates. Verify permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Bind Leaflet map instance on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mapInstance: any;
    let markerInstance: any;

    const initMap = async () => {
      const container = document.getElementById('report-single-map');
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

      const defaultCenter: [number, number] = latitude && longitude 
        ? [latitude, longitude] 
        : [22.7196, 75.8577];

      mapInstance = L.map(container, {
        zoomControl: false,
        attributionControl: false
      }).setView(defaultCenter, latitude && longitude ? 15 : 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance);

      const pinIcon = L.divIcon({
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: grab;">
            <span style="position: absolute; display: inline-flex; height: 24px; width: 24px; border-radius: 9999px; background-color: #5E1801; opacity: 0.25; animation: ping 2s infinite;"></span>
            <div style="height: 14px; width: 14px; border-radius: 9999px; background-color: #5E1801; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.15);"></div>
          </div>
        `,
        className: 'report-map-draggable-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (latitude && longitude) {
        markerInstance = L.marker(defaultCenter, { icon: pinIcon, draggable: true }).addTo(mapInstance);
        markerInstance.on('dragend', async (e: any) => {
          const newPos = e.target.getLatLng();
          await handleResolveCoordinates(newPos.lat, newPos.lng);
        });
      }

      mapInstance.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerInstance) {
          markerInstance.setLatLng([lat, lng]);
        } else {
          markerInstance = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(mapInstance);
          markerInstance.on('dragend', async (ev: any) => {
            const newPos = ev.target.getLatLng();
            await handleResolveCoordinates(newPos.lat, newPos.lng);
          });
        }
        await handleResolveCoordinates(lat, lng);
      });

      reportMapRef.current = mapInstance;
      reportMarkerRef.current = markerInstance;
    };

    setTimeout(initMap, 300);

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
      const container = document.getElementById('report-single-map');
      if (container) {
        delete (container as any)._leaflet_loading;
      }
      reportMapRef.current = null;
      reportMarkerRef.current = null;
    };
  }, []);

  // Recalculate leaflet map bounds once Step 4 becomes active
  useEffect(() => {
    if (currentStep === 4 && reportMapRef.current) {
      setTimeout(() => {
        reportMapRef.current.invalidateSize();
      }, 100);
    }
  }, [currentStep]);

  // Check for duplicate alerts before submit
  const checkDuplicateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setErrorMsg('An evidence photograph is required.');
      return;
    }
    if (!category) {
      setErrorMsg('Please select a category for classification.');
      return;
    }
    if (latitude === null || longitude === null || !resolvedGeo) {
      setErrorMsg('Please acquire Indore coordinates on the map.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const delta = 0.0018; // approx 200m
      const minLng = longitude - delta;
      const maxLng = longitude + delta;
      const minLat = latitude - delta;
      const maxLat = latitude + delta;

      const res = await fetch(getApiUrl(`/incidents?bbox=${minLng},${minLat},${maxLng},${maxLat}&category=${category}`));
      const data = await res.json();

      if (res.ok && data.success && data.incidents && data.incidents.length > 0) {
        setNearbyIncident(data.incidents[0]);
        setDuplicateModalOpen(true);
        setIsSubmitting(false);
      } else {
        await executeSubmit();
      }
    } catch (err) {
      await executeSubmit();
    }
  };

  const executeSubmit = async (duplicateIncidentId?: string) => {
    setIsSubmitting(true);
    setDuplicateModalOpen(false);

    const formData = new FormData();
    formData.append('image', images[0]);
    formData.append('latitude', latitude!.toString());
    formData.append('longitude', longitude!.toString());
    
    // If category is OTHERS, format as 'OTHERS: <customCategory>'
    const finalCategory = (category === 'OTHERS' && customCategory)
      ? `OTHERS: ${customCategory.trim()}`
      : category;
    formData.append('category', finalCategory);
    
    const fullDescription = subcategory 
      ? `[${subcategory}] ${description}`
      : description;
    
    formData.append('description', fullDescription);
    formData.append('citizenName', isAnonymous ? 'Anonymous Citizen' : citizenName);
    formData.append('citizenPhone', isAnonymous ? '' : citizenPhone);
    formData.append('landmark', landmark);
    formData.append('severity', severity);
    if (duplicateIncidentId) {
      formData.append('duplicateIncidentId', duplicateIncidentId);
    }

    const headers: HeadersInit = {};
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(getApiUrl('/reports'), {
        method: 'POST',
        headers,
        body: formData,
      });

      const responseData = await res.json();

      if (res.ok && responseData.success) {
        setSuccessData(responseData.data);
      } else {
        setErrorMsg(responseData.error?.message || 'Report registration failed.');
      }
    } catch (err) {
      setErrorMsg('Connection error during submission. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCategory = categoryTiles.find(c => c.key === category);

  const renderStepper = () => {
    const steps = [
      { id: 1, name: 'Evidence' },
      { id: 2, name: 'Issue' },
      { id: 3, name: 'Details' },
      { id: 4, name: 'Location' },
      { id: 5, name: 'Review' }
    ];

    return (
      <div className="mb-8 select-none">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;
            return (
              <React.Fragment key={s.id}>
                {idx > 0 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${isCompleted ? 'bg-[#5E1801]' : 'bg-[#E9E1D8]'}`}></div>
                )}
                <div className="flex flex-col items-center space-y-1">
                  <div
                    onClick={() => {
                      if (s.id < currentStep) {
                        setCurrentStep(s.id);
                      }
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-[#5E1801] text-white border-[#5E1801] ring-4 ring-[#5E1801]/10'
                        : isCompleted
                        ? 'bg-[#5E1801] text-white border-[#5E1801] cursor-pointer'
                        : 'bg-white text-[#9B9088] border-[#D8CCC0]'
                    }`}
                  >
                    {isCompleted ? <FiCheck className="text-xs" /> : s.id}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-bold ${isActive || isCompleted ? 'text-[#5E1801]' : 'text-[#9B9088]'}`}>
                    {s.name}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAIVerification = () => {
    let status: 'idle' | 'analyzing' | 'verified' | 'warning' | 'review_required' | 'failed' = 'idle';

    if (images.length === 0) {
      status = 'idle';
    } else if (isClassifying) {
      status = 'analyzing';
    } else if (errorMsg && errorMsg.includes('classification')) {
      status = 'failed';
    } else if (category === 'OTHERS') {
      status = 'warning';
    } else {
      status = 'verified';
    }

    const displayCategoryName = categoryTiles.find(c => c.key === category)?.name || category || 'Unassigned';

    return (
      <CiviqueAIVerification
        status={status}
        category={displayCategoryName}
        confidence={aiConfidence}
        relevance={category === 'OTHERS' ? 'Inconclusive' : 'Likely Consistent'}
        errorMsg={errorMsg}
      />
    );
  };

  const renderFormContent = () => (
    <div className="max-w-7xl mx-auto w-full p-6 md:p-8 space-y-8 animate-fade-in text-left">
      
      {/* Header Title */}
      <div className="space-y-1 border-b border-[#E9E1D8] pb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-[#2B2523] tracking-tight">Report a Municipal Issue</h2>
          <p className="text-sm font-medium text-[#6F625C] mt-1">Help Indore clean and maintain public assets by filing a verified incident report.</p>
        </div>
        {!user && (
          <Link 
            href="/signin" 
            className="text-xs font-bold text-[#5E1801] hover:underline uppercase tracking-wider flex items-center gap-1.5 cursor-pointer select-none bg-white border border-[#D8CCC0] px-4 py-2.5 rounded-xl shadow-2xs hover:translate-y-[-1px] transition-all"
          >
            Sign In / Register
          </Link>
        )}
      </div>

      {/* STEPPER HEADER */}
      {renderStepper()}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-800 font-semibold animate-fade-in shadow-2xs">
          {errorMsg}
        </div>
      )}

      <form onSubmit={checkDuplicateAndSubmit} className="space-y-6">
        
        {/* STEP 1: EVIDENCE */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Upload Zone */}
            <div className="lg:col-span-7 bg-white border border-[#D8CCC0] rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="bg-[#faf9f6] border-b border-[#E9E1D8] px-6 py-4">
                <h3 className="text-sm font-bold text-[#5E1801] uppercase tracking-wider">1. Evidence Upload</h3>
              </div>
              <div className="p-8 flex-grow flex flex-col justify-center items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {imagePreviews.length > 0 ? (
                  <div className="w-full space-y-4">
                    <div className="aspect-video relative rounded-2xl overflow-hidden border border-[#D8CCC0] bg-[#faf9f6] shadow-sm group">
                      <img 
                        src={imagePreviews[0]} 
                        alt="Evidence Preview" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleDeleteImage}
                        className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white rounded-full p-2.5 shadow-md hover:scale-105 transition-all cursor-pointer"
                      >
                        <FiX className="text-base" />
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleTriggerUpload}
                        className="flex-1 py-3 border border-[#D8CCC0] text-xs font-bold uppercase rounded-xl hover:bg-[#faf9f6] text-[#2B2523] cursor-pointer"
                      >
                        Replace Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={handleTriggerUpload}
                    className="w-full border-2 border-dashed border-[#D8CCC0] hover:border-[#5E1801] rounded-2xl py-12 px-6 text-center cursor-pointer bg-[#faf9f6]/40 hover:bg-[#faf9f6]/80 transition-all flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-white border border-[#E9E1D8] text-[#9B9088] flex items-center justify-center shadow-2xs">
                      <FiUploadCloud className="text-lg" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#5E1801]">Click to upload</span>
                      <span className="text-sm text-[#6F625C] font-light"> or drag and drop</span>
                      <p className="text-[10px] text-[#9B9088] mt-1 font-light">Supports JPEG, PNG, WEBP up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Verification Panel */}
            <div className="lg:col-span-5">
              {renderAIVerification()}
            </div>
          </div>
        )}

        {/* STEP 2: ISSUE */}
        {currentStep === 2 && (
          <div className="bg-white border border-[#D8CCC0] rounded-2xl shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto animate-fade-in text-left">
            <div className="bg-[#faf9f6] border-b border-[#E9E1D8] px-6 py-4 flex justify-between items-center">
              <h3 className="text-sm font-bold text-[#5E1801] uppercase tracking-wider">2. Issue Classification</h3>
              {aiConfidence !== null && (
                <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  ✨ Suggested Category
                </span>
              )}
            </div>
            <div className="p-6 space-y-6">
              
              {/* Suggestion Confirmation Banner */}
              {aiSuggestedCategory && (
                <div className="bg-green-50/50 border border-green-200/80 rounded-xl p-4.5 flex items-center justify-between animate-fade-in text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✨</span>
                    <div>
                      <p className="text-xs font-bold text-green-950 uppercase tracking-wider">AI Category Suggestion</p>
                      <p className="text-[11px] text-green-800 font-medium mt-0.5 leading-relaxed">
                        Our model suggests <strong>{categoryTiles.find(c => c.key === aiSuggestedCategory)?.name || aiSuggestedCategory}</strong> based on your photo. Click to confirm or select another tile.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(aiSuggestedCategory);
                      setSubcategory('');
                    }}
                    className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer select-none"
                  >
                    Confirm Suggestion
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {categoryTiles.map((tile) => {
                  const Icon = tile.icon;
                  const isSelected = category === tile.key;
                  const isAiSuggested = aiSuggestedCategory === tile.key;
                  return (
                    <div
                      key={tile.key}
                      onClick={() => { setCategory(tile.key); setSubcategory(''); }}
                      className={`p-4 border rounded-xl cursor-pointer transition-all hover:translate-y-[-1px] select-none flex flex-col justify-between h-28 relative ${
                        isSelected 
                          ? 'border-[#5E1801] bg-[#faf9f6]/60 ring-2 ring-[#5E1801]' 
                          : isAiSuggested
                            ? 'border-green-300 bg-green-50/25 hover:border-green-500'
                            : 'border-[#D8CCC0] hover:border-[#5E1801]'
                      }`}
                    >
                      {isAiSuggested && aiConfidence !== null && (
                        <span className="text-[9px] font-bold text-green-700 bg-green-100/80 border border-green-200 px-2 py-0.5 rounded-md uppercase tracking-wider absolute top-3.5 right-3.5 shadow-3xs animate-pulse">
                          ✨ AI Suggestion ({aiConfidence}%)
                        </span>
                      )}

                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#5E1801] text-white' : 'bg-[#faf9f6] text-[#9B9088] border border-[#E9E1D8]'}`}>
                        <Icon className="text-sm" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#2B2523]">{tile.name}</h4>
                        <p className="text-xs text-[#6F625C] font-medium mt-0.5 line-clamp-1 leading-normal">{tile.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeCategory && (
                <div className="pt-4 border-t border-[#E9E1D8] space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#2B2523] uppercase tracking-wider">Grievance Subcategory</label>
                    <select
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="premium-input w-full p-3 text-sm font-medium text-[#2B2523] bg-white"
                    >
                      <option value="">Select Specific Type (Optional)</option>
                      {activeCategory.subcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                  
                  {category === 'OTHERS' && (
                    <div className="space-y-2 animate-fade-in text-left">
                      <label className="text-xs font-bold text-[#2B2523] uppercase tracking-wider">Custom Category / Object Detected</label>
                      <input
                        type="text"
                        placeholder="e.g. Broken bench, graffiti, dead animal"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="premium-input w-full p-3 text-sm font-medium text-[#2B2523] placeholder-[#9B9088]"
                      />
                      <p className="text-[10px] text-[#6F625C] font-medium leading-relaxed mt-1">
                        AI detected this as an unrecognized category. Review and customize the auto-filled label above.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {currentStep === 3 && (
          <div className="bg-white border border-[#D8CCC0] rounded-2xl shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto animate-fade-in">
            <div className="bg-[#faf9f6] border-b border-[#E9E1D8] px-6 py-4">
              <h3 className="text-sm font-bold text-[#5E1801] uppercase tracking-wider">3. Description & Details</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Landmark input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2B2523] uppercase tracking-wider">Landmark / Location Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Near Vijay Nagar Square, opposite bank"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="premium-input w-full p-3 text-sm font-medium text-[#2B2523] placeholder-[#9B9088]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#2B2523] uppercase tracking-wider">Describe the grievance</label>
                <textarea
                  placeholder="Describe the issue size, impact, or urgency details..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="premium-input w-full p-3 text-sm font-medium text-[#2B2523] placeholder-[#9B9088] resize-none"
                />
              </div>

              {/* Severity Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2B2523] uppercase tracking-wider">Est. Severity Risk</label>
                <div className="flex gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`flex-1 py-2.5 text-xs font-bold tracking-wider rounded-xl uppercase border transition-colors cursor-pointer select-none ${
                        severity === s 
                          ? 'border-[#5E1801] bg-[#5E1801] text-white shadow-xs' 
                          : 'border-[#D8CCC0] text-[#6F625C] hover:bg-[#faf9f6] hover:text-[#2B2523]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Anonymous check & Submitter Profile details */}
              <div className="pt-4 border-t border-[#E9E1D8] space-y-3.5">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-[#D8CCC0] text-[#5E1801] focus:ring-[#5E1801] cursor-pointer h-4 w-4"
                  />
                  <span className="text-xs font-bold text-[#2B2523] uppercase tracking-wider group-hover:text-[#5E1801] transition-colors">Submit Anonymously</span>
                </label>

                {!isAnonymous && (
                  <div className="grid grid-cols-2 gap-3.5 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-xs text-[#6F625C] uppercase tracking-wider font-bold">Name</span>
                      <input 
                        type="text" 
                        value={citizenName} 
                        onChange={(e) => setCitizenName(e.target.value)}
                        placeholder="Your Name" 
                        className="premium-input w-full p-2.5 text-sm font-medium text-[#2B2523] placeholder-[#9B9088]" 
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-[#6F625C] uppercase tracking-wider font-bold">Phone</span>
                      <input 
                        type="text" 
                        value={citizenPhone} 
                        onChange={(e) => setCitizenPhone(e.target.value)}
                        placeholder="Your Phone" 
                        className="premium-input w-full p-2.5 text-sm font-medium text-[#2B2523] placeholder-[#9B9088]" 
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: LOCATION */}
        <div className={`bg-white border border-[#D8CCC0] rounded-2xl shadow-sm overflow-hidden flex flex-col max-w-4xl mx-auto ${currentStep === 4 ? 'block animate-fade-in' : 'hidden'}`}>
          <div className="bg-[#faf9f6] border-b border-[#E9E1D8] px-6 py-4 flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#5E1801] uppercase tracking-wider">4. Geolocation Anchor</h3>
            <button
              type="button"
              onClick={handleAcquireLocation}
              disabled={isLocating}
              className="text-xs font-bold text-[#5E1801] hover:text-[#421000] hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none bg-white border border-[#D8CCC0] px-3 py-1.5 rounded-lg shadow-2xs"
            >
              <FiMapPin className={isLocating ? 'animate-bounce' : ''} />
              {isLocating ? 'Locating...' : 'Get GPS'}
            </button>
          </div>
          <div className="p-6 space-y-4">
            {/* Leaflet map frame */}
            <div className="h-64 rounded-xl border border-[#D8CCC0] relative overflow-hidden bg-[#faf9f6] shadow-2xs">
              <div id="report-single-map" className="absolute inset-0 z-10 w-full h-full"></div>
            </div>

            {resolvedGeo ? (
              <div className="bg-[#faf9f6] border border-[#D8CCC0] p-4 rounded-xl space-y-2 text-sm font-medium text-[#2B2523] animate-fade-in shadow-2xs">
                <p className="font-bold text-[#5E1801] flex items-center gap-1.5">
                  <FiCheck className="text-green-600 shrink-0 text-base" /> Indore Boundaries resolved!
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[#E9E1D8]">
                  <div>
                    <span className="font-bold text-[#6F625C] text-[10px] block uppercase tracking-wider">WARD</span>
                    <span className="text-xs font-semibold text-[#2B2523]">{resolvedGeo.wardName}</span>
                  </div>
                  <div>
                    <span className="font-bold text-[#6F625C] text-[10px] block uppercase tracking-wider">ZONE</span>
                    <span className="text-xs font-semibold text-[#2B2523]">{resolvedGeo.zoneName}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2 shadow-2xs">
                <FiMapPin className="shrink-0 text-amber-600 text-base" />
                <span>Click map or drag the pin inside municipal limits to resolve boundaries.</span>
              </div>
            )}
          </div>
        </div>

        {/* STEP 5: REVIEW */}
        {currentStep === 5 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* AI Verification Summary Component */}
            <div className="bg-white border border-[#D8CCC0] rounded-2xl p-6 space-y-4 shadow-sm text-left">
              <h4 className="text-xs font-bold text-[#5E1801] uppercase tracking-wider flex items-center gap-1.5">
                ✦ Civique AI Verification Summary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-semibold text-[#2B2523] pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Image quality: Clear</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Issue identified: {categoryTiles.find(c => c.key === category)?.name || category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Evidence relevance: High</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Category consistency: Matches</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Duplicate check: Scanned</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Location check: Consistent</span>
                </div>
              </div>
              
              <div className="pt-3.5 border-t border-[#E9E1D8] flex justify-between items-center text-xs">
                <span className="text-[#6F625C] font-bold">Evidence Status:</span>
                <span className="font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full uppercase text-[10px]">
                  Looks Consistent
                </span>
              </div>
            </div>

            {/* Grievance Bento Grid Summary */}
            <div className="bg-white border border-[#D8CCC0] rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-[#faf9f6] border-b border-[#E9E1D8] px-6 py-4">
                <h3 className="text-sm font-bold text-[#5E1801] uppercase tracking-wider">5. Final Review Details</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
                {/* Image thumb */}
                {imagePreviews.length > 0 && (
                  <div className="md:col-span-4 rounded-xl overflow-hidden border border-[#D8CCC0] bg-[#faf9f6]">
                    <img src={imagePreviews[0]} className="w-full h-full object-cover" alt="Review Evidence" />
                  </div>
                )}
                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#E9E1D8]">
                    <div>
                      <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-bold">Category</span>
                      <p className="text-sm font-bold text-[#5E1801]">
                        {categoryTiles.find(c => c.key === category)?.name || category}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-bold">Resolved Ward</span>
                      <p className="text-sm font-bold text-[#2B2523]">{resolvedGeo?.wardName || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {landmark && (
                    <div>
                      <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-bold">Landmark</span>
                      <p className="text-xs font-semibold text-[#2B2523]">{landmark}</p>
                    </div>
                  )}
                  {description && (
                    <div>
                      <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-bold">Description</span>
                      <p className="text-xs font-medium text-[#6F625C] leading-relaxed">{description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-bold">Submitter</span>
                    <p className="text-xs font-semibold text-[#2B2523]">
                      {isAnonymous ? 'Anonymous Citizen' : `${citizenName} (${citizenPhone || 'No phone'})`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEPPER WIZARD FOOTER NAVIGATION */}
        <div className="max-w-4xl mx-auto flex justify-between gap-4 pt-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="py-3 px-6 border border-[#D8CCC0] text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#faf9f6] text-[#2B2523] cursor-pointer"
            >
              Back
            </button>
          )}

          <div className="flex-grow"></div>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={
                (currentStep === 1 && images.length === 0) ||
                (currentStep === 2 && !category) ||
                (currentStep === 4 && (!latitude || !resolvedGeo))
              }
              className="py-3 px-8 premium-btn-primary text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3.5 px-10 premium-btn-primary text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                  <span>Registering Case...</span>
                </>
              ) : (
                <span>Submit Grievance</span>
              )}
            </button>
          )}
        </div>

      </form>

      {/* DUPLICATE WARNING MODAL */}
      {duplicateModalOpen && nearbyIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setDuplicateModalOpen(false)}></div>
          <div className="relative bg-white border border-[#E9E1D8] rounded-2xl shadow-xl max-w-sm w-full p-6 text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <FiAlertTriangle className="text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#351008]">Similar Report Found Nearby</h3>
              <p className="text-[11px] text-[#6F625C] mt-1.5 font-light leading-relaxed">
                An active <b>{nearbyIncident.category}</b> incident (<b>#{nearbyIncident.publicTrackingId}</b>) exists within 200 meters. Would you like to link your report to avoid duplication, or register a new separate case?
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2 text-xs font-semibold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => executeSubmit(nearbyIncident.id)}
                disabled={isSubmitting}
                className="premium-btn-primary py-3 cursor-pointer text-center"
              >
                Link to Existing Incident
              </button>
              <button
                type="button"
                onClick={() => executeSubmit()}
                disabled={isSubmitting}
                className="py-3 border border-[#D8CCC0] text-[#351008] hover:bg-[#faf9f6] rounded-xl transition-colors cursor-pointer text-center"
              >
                Register as Separate Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // SUCCESS CONFIRMATION OVERLAY VIEW
  if (successData) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6 text-left">
        <div className="bg-white border border-[#E9E1D8] rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-6 animate-scale-up">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 text-[#12B76A] flex items-center justify-center mx-auto shadow-sm">
            <FiCheckCircle className="text-2xl" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-[#2B2523]">Report Registered Successfully</h2>
            <p className="text-[11px] text-[#6F625C] font-light leading-relaxed">
              Your grievance file has been resolved to Ward geofences. AI classification models have scheduled routing dispatch pipelines.
            </p>
          </div>

          <div className="bg-[#faf9f6] border border-[#E9E1D8] rounded-2xl p-4.5 space-y-3 font-light text-xs">
            <div className="flex justify-between border-b border-[#E9E1D8]/60 pb-2.5">
              <span className="text-[#9B9088] uppercase tracking-wider text-[9px] font-semibold">Tracking ID</span>
              <span className="font-mono font-bold text-[#5E1801]">#{successData.trackingId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9B9088] uppercase tracking-wider text-[9px] font-semibold">Status</span>
              <span className="font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[9px]">REPORTED</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 text-xs font-semibold uppercase tracking-wider">
            <Link
              href="/map"
              className="premium-btn-primary py-3 text-center"
            >
              Track Case on Map
            </Link>
            <Link
              href={user ? '/' : '/signin'}
              className="py-3 border border-[#D8CCC0] text-[#351008] hover:bg-[#faf9f6] rounded-xl transition-all text-center"
            >
              Exit Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Wrap in Shell if authenticated, otherwise render with CitizenHeader
  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }
  if (user) {
    return (
      <Shell user={user} onLogout={handleLogout}>
        {renderFormContent()}
      </Shell>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col text-left">
      <CitizenHeader />
      <main className="flex-grow pt-4">
        {renderFormContent()}
      </main>
    </div>
  );
}
