'use client';

import React, { useEffect, useState } from 'react';
import { 
  FiSearch, 
  FiSliders, 
  FiUser, 
  FiMail, 
  FiShield, 
  FiAlertCircle,
  FiAward,
  FiPhone,
  FiMapPin
} from 'react-icons/fi';

interface MockPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  wardOrDept: string;
  activeTickets: number;
  active: boolean;
}

export default function PeopleDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [people, setPeople] = useState<MockPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setError('Sign in is required to view people.'); setLoading(false); return; }
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    fetch(`${base.endsWith('/api/v1') ? base : `${base}/api/v1`}/users/directory`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error?.message || 'Unable to load people.'); return payload; })
      .then((payload) => setPeople((payload.data?.users || []).map((person: { id: string; email: string | null; phoneNumber: string | null; role: string; active: boolean; wardId: string | null; zoneId: string | null; departmentId: string | null; activeIncidentCount: number }) => ({ id: person.id, name: person.email?.split('@')[0] || 'Civique user', email: person.email || 'No email', phone: person.phoneNumber || 'No phone number', role: person.role, wardOrDept: person.wardId ? `Ward ${person.wardId}` : person.zoneId ? `Zone ${person.zoneId}` : person.departmentId ? `Department ${person.departmentId}` : 'No assigned scope', activeTickets: person.activeIncidentCount, active: person.active }))))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredPeople = people.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          person.wardOrDept.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || person.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      CITY_ADMIN: 'bg-red-50 border-red-200 text-red-700',
      WARD_OFFICER: 'bg-[#7F56D9]/10 border-[#7F56D9]/20 text-[#7F56D9]',
      FIELD_WORKER: 'bg-orange-50 border-orange-200 text-orange-700',
      CITIZEN: 'bg-blue-50 border-blue-200 text-blue-700'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles[role] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 text-left">
      
      {/* Header */}
      <div className="border-b border-[#E9E1D8] pb-6">
        <h2 className="text-2xl font-light text-[#351008] tracking-tight">People Directory</h2>
        <p className="text-sm font-light text-[#6F625C] mt-1">Manage city administrators, ward officers, field work crews, and citizen profiles.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B9088]" />
          <input
            type="text"
            placeholder="Search by name, email or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input w-full pl-10 pr-4 py-2.5 text-sm font-light placeholder:text-[#9B9088]"
          />
        </div>

        {/* Filter select */}
        <div className="flex items-center gap-1.5 bg-white border border-[#E9E1D8] rounded-xl px-3 py-1.5 text-xs text-[#6F625C] w-fit">
          <FiSliders className="text-[#9B9088]" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-[#351008] font-medium p-0"
          >
            <option value="ALL">All Roles</option>
            <option value="CITY_ADMIN">Administrators</option>
            <option value="WARD_OFFICER">Ward Officers</option>
            <option value="FIELD_WORKER">Field Crews</option>
            <option value="CITIZEN">Citizens</option>
          </select>
        </div>

      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loading && <div className="rounded-2xl border border-[#E9E1D8] bg-white p-10 text-center text-sm text-[#6F625C]">Loading authorized accounts…</div>}

      {/* People Grid */}
      {!loading && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPeople.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-[#E9E1D8] rounded-2xl p-16 text-center space-y-3">
            <FiAlertCircle className="text-3xl text-[#9B9088] mx-auto" />
            <h4 className="text-base font-semibold text-[#351008]">No accounts found</h4>
          </div>
        ) : (
          filteredPeople.map((person) => (
            <div 
              key={person.id}
              className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
            >
              {/* Avatar circle */}
              <div className="w-12 h-12 rounded-xl bg-[#faf9f6] border border-[#E9E1D8] flex items-center justify-center font-semibold text-[#5E1801] text-sm shrink-0">
                {person.name.substring(0, 2).toUpperCase()}
              </div>

              {/* Detail block */}
              <div className="space-y-3 flex-1 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#351008]">{person.name}</h3>
                  {getRoleBadge(person.role)}
                </div>

                <div className="space-y-1.5 text-xs text-[#6F625C] font-light">
                  <p className="flex items-center gap-1.5">
                    <FiMail className="text-[#9B9088]" /> {person.email}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <FiPhone className="text-[#9B9088]" /> {person.phone}
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-[#351008]">
                    <FiMapPin className="text-[#CCB999]" /> {person.wardOrDept}
                  </p>
                </div>

                {/* Foot stats */}
                <div className="pt-3 border-t border-[#E9E1D8]/50 flex justify-between items-center text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold">
                  <span>Assigned Workload</span>
                  <span className={person.active ? (person.activeTickets > 0 ? 'text-[#5E1801]' : 'text-gray-400') : 'text-red-600'}>
                    {person.active ? `${person.activeTickets} Ticket${person.activeTickets !== 1 ? 's' : ''} Active` : 'Suspended'}
                  </span>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
      )}

    </div>
  );
}
