'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiSearch, 
  FiSliders, 
  FiAlertCircle, 
  FiMapPin, 
  FiClock, 
  FiArrowRight, 
  FiTrash2, 
  FiPlusCircle 
} from 'react-icons/fi';

interface MockIncident {
  id: string;
  trackingId: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  ward: string;
  reports: number;
  date: string;
}

export default function IncidentsListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [incidents, setIncidents] = useState<MockIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const getApiUrl = (path: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const cleanBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${cleanBase}${path}`;
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(getApiUrl('/incidents'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.incidents) {
          const mapped = resData.incidents.map((i: any) => ({
            id: i.id,
            trackingId: String(i.publicTrackingId || i.trackingId || i.id || 'UNKNOWN'),
            category: String(i.category || 'OTHER'),
            description: String(i.resolvedNotes || i.description || `Active ${String(i.category || 'civic').toLowerCase()} report queue`),
            status: String(i.status || 'REPORTED'),
            priority: String(i.priority || 'MEDIUM'),
            ward: i.ward?.name || 'Indore Boundary',
            reports: i.reportCount || 1,
            date: new Date(i.createdAt).toLocaleString()
          }));
          setIncidents(mapped);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    const query = searchTerm.toLowerCase();
    const matchesSearch = String(inc.trackingId || '').toLowerCase().includes(query) || 
                          String(inc.description || '').toLowerCase().includes(query) ||
                          String(inc.ward || '').toLowerCase().includes(query);
    
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || inc.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      REPORTED: 'bg-blue-50 border-blue-200 text-blue-700',
      ASSIGNED: 'bg-[#7F56D9]/10 border-[#7F56D9]/20 text-[#7F56D9]',
      IN_PROGRESS: 'bg-orange-50 border-orange-200 text-orange-700',
      RESOLVED: 'bg-green-50 border-green-200 text-green-700',
      ESCALATED: 'bg-red-50 border-red-200 text-red-700'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      MEDIUM: 'bg-blue-100 text-blue-700',
      HIGH: 'bg-orange-100 text-orange-700',
      CRITICAL: 'bg-red-100 text-red-700'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${styles[priority] || 'bg-gray-100 text-gray-700'}`}>
        {priority}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative flex h-8 w-8">
          <span className="animate-ping absolute inline-flex h-full w-full bg-[#5E1801] rounded-full opacity-75"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-[#5E1801]"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E9E1D8] pb-6">
        <div>
          <h2 className="text-2xl font-light text-[#351008] tracking-tight">Incidents Directory</h2>
          <p className="text-sm font-light text-[#6F625C] mt-1">Manage and assign reports across municipal zones.</p>
        </div>
        <button className="premium-btn-primary px-5 py-3 text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
          <FiPlusCircle className="text-base" />
          Create Incident
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B9088] text-base" />
          <input
            type="text"
            placeholder="Search by ID, ward, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input w-full pl-10 pr-4 py-2.5 text-sm font-light placeholder:text-[#9B9088]"
          />
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap gap-3">
          
          {/* Status select */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E9E1D8] rounded-xl px-3 py-1.5 text-xs text-[#6F625C]">
            <FiSliders className="text-[#9B9088]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-[#351008] font-medium p-0"
            >
              <option value="ALL">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>

          {/* Category select */}
          <div className="flex items-center gap-1.5 bg-white border border-[#E9E1D8] rounded-xl px-3 py-1.5 text-xs text-[#6F625C]">
            <FiSliders className="text-[#9B9088]" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-[#351008] font-medium p-0"
            >
              <option value="ALL">All Categories</option>
              <option value="POTHOLE">Pothole</option>
              <option value="GARBAGE">Garbage</option>
              <option value="STREETLIGHT">Streetlight</option>
              <option value="WATER_LEAK">Water Leak</option>
              <option value="SEWAGE">Sewage</option>
            </select>
          </div>

        </div>

      </div>

      {/* Incidents Table / Cards list */}
      <div className="bg-white border border-[#E9E1D8] rounded-2xl overflow-hidden shadow-sm">
        
        {filteredIncidents.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <FiAlertCircle className="text-4xl text-[#9B9088] mx-auto" />
            <h4 className="text-base font-semibold text-[#351008]">No incidents found</h4>
            <p className="text-xs text-[#6F625C] font-light max-w-sm mx-auto">
              We couldn't find any incidents matching your search terms or applied filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E9E1D8]">
            {filteredIncidents.map((inc) => (
              <div 
                key={inc.id}
                className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#faf9f6]/30 transition-colors"
              >
                
                {/* Left side: details */}
                <div className="space-y-2 max-w-2xl text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#5E1801] tracking-wider bg-[#f2ddbb]/40 px-2 py-0.5 rounded">
                      {inc.trackingId}
                    </span>
                    <span className="text-xs text-[#9B9088] font-light">{inc.date}</span>
                    <span className="text-xs text-[#6F625C] bg-[#E9E1D8]/40 px-2 py-0.5 rounded font-medium">
                      {inc.category}
                    </span>
                    {getPriorityBadge(inc.priority)}
                  </div>
                  
                  <h3 className="text-sm font-semibold text-[#351008] truncate max-w-xl">
                    {inc.description}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6F625C] font-light">
                    <span className="flex items-center gap-1">
                      <FiMapPin className="text-[#9B9088] text-sm" />
                      {inc.ward}
                    </span>
                    <span className="flex items-center gap-1">
                      <FiClock className="text-[#9B9088] text-sm" />
                      {inc.reports} report{inc.reports > 1 ? 's' : ''} linked
                    </span>
                  </div>
                </div>

                {/* Right side: badges & actions */}
                <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                  {getStatusBadge(inc.status)}
                  <Link 
                    href={`/admin/incidents/${inc.id}`}
                    className="p-2.5 border border-[#D8CCC0] text-[#5E1801] hover:bg-[#F7F4EE] rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <FiArrowRight />
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
