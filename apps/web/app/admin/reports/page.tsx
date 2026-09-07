'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  FiSearch, 
  FiSliders, 
  FiAlertCircle, 
  FiMapPin, 
  FiClock, 
  FiArrowRight, 
  FiCheck, 
  FiX, 
  FiMaximize2 
} from 'react-icons/fi';

interface MockReport {
  id: string;
  trackingId: string;
  category: string;
  description: string;
  status: string;
  citizenName: string;
  landmark: string;
  date: string;
  ward: string;
}

export default function ReportsTriagePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reports, setReports] = useState<MockReport[]>([]);
  const [loading, setLoading] = useState(true);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(getApiUrl('/reports'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.reports) {
          const mapped = resData.reports.map((r: any) => ({
            id: r.id,
            trackingId: r.incident?.publicTrackingId || `REP-${r.id.substring(0, 8).toUpperCase()}`,
            category: r.categorySuggested || 'OTHER',
            description: r.description || '',
            status: r.incident?.status || 'REPORTED',
            citizenName: r.citizenName || 'Anonymous',
            landmark: r.landmark || 'None listed',
            date: new Date(r.createdAt).toLocaleString(),
            ward: r.incident?.ward?.name || 'Indore Boundary'
          }));
          setReports(mapped);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleTriage = (id: string, action: string) => {
    toast.success(`Report ${id} triaged action: ${action}`);
  };

  const filteredReports = reports.filter((rep: MockReport) => {
    const matchesSearch = rep.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rep.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rep.ward.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || rep.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 text-left">
      
      {/* Header */}
      <div className="border-b border-[#E9E1D8] pb-6">
        <h2 className="text-2xl font-light text-[#351008] tracking-tight">Citizen Reports Triage</h2>
        <p className="text-sm font-light text-[#6F625C] mt-1">Review raw citizen reports before promotion or grouping into active incidents.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B9088]" />
          <input
            type="text"
            placeholder="Search raw reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input w-full pl-10 pr-4 py-2.5 text-sm font-light placeholder:text-[#9B9088]"
          />
        </div>

        {/* Filter select */}
        <div className="flex items-center gap-1.5 bg-white border border-[#E9E1D8] rounded-xl px-3 py-1.5 text-xs text-[#6F625C] w-fit">
          <FiSliders className="text-[#9B9088]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-[#351008] font-medium p-0"
          >
            <option value="ALL">All Reports</option>
            <option value="REPORTED">Reported</option>
            <option value="OPEN">Open (Promoted)</option>
            <option value="DUPLICATE">Duplicate</option>
          </select>
        </div>

      </div>

      {/* Reports Grid */}
      <div className="bg-white border border-[#E9E1D8] rounded-2xl overflow-hidden shadow-sm">
        {filteredReports.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FiAlertCircle className="text-3xl text-[#9B9088] mx-auto" />
            <h4 className="text-base font-semibold text-[#351008]">No reports found</h4>
          </div>
        ) : (
          <div className="divide-y divide-[#E9E1D8]">
            {filteredReports.map((rep) => (
              <div 
                key={rep.id}
                className="p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:bg-[#faf9f6]/30 transition-colors"
              >
                
                {/* Info block */}
                <div className="space-y-2 max-w-3xl text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#5E1801] bg-[#f2ddbb]/40 px-2 py-0.5 rounded">
                      {rep.trackingId}
                    </span>
                    <span className="text-xs text-[#9B9088] font-light">{rep.date}</span>
                    <span className="text-xs text-[#6F625C] bg-[#E9E1D8]/40 px-2 py-0.5 rounded font-medium">
                      {rep.category}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      rep.status === 'DUPLICATE' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      {rep.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#351008]">"{rep.description}"</h3>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6F625C] font-light">
                    <span className="flex items-center gap-1">
                      <FiMapPin className="text-[#9B9088]" /> {rep.ward}
                    </span>
                    {rep.landmark && (
                      <span className="flex items-center gap-1">
                        <FiClock className="text-[#9B9088]" /> Landmark: {rep.landmark}
                      </span>
                    )}
                    <span>Reporter: {rep.citizenName}</span>
                  </div>
                </div>

                {/* Operations Triage buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  {rep.status === 'REPORTED' && (
                    <>
                      <button
                        onClick={() => handleTriage(rep.id, 'PROMOTE')}
                        className="px-3.5 py-2 bg-[#5E1801] text-white hover:bg-[#351008] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <FiCheck /> Promote
                      </button>
                      <button
                        onClick={() => handleTriage(rep.id, 'MERGE')}
                        className="px-3.5 py-2 border border-[#D8CCC0] hover:bg-[#faf9f6] text-xs font-semibold rounded-xl transition-all text-[#351008] flex items-center gap-1 cursor-pointer"
                      >
                        Merge
                      </button>
                    </>
                  )}
                  <button className="p-2 border border-[#D8CCC0] hover:bg-[#faf9f6] text-[#6F625C] rounded-xl transition-all">
                    <FiMaximize2 className="text-sm" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
