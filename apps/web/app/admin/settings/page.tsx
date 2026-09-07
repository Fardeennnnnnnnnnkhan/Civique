'use client';

import React from 'react';
import { FiSettings, FiSliders, FiBell, FiShield, FiDatabase } from 'react-icons/fi';

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6 text-left animate-fade-in">
      
      {/* Header */}
      <div className="border-b border-[#E9E1D8] pb-6">
        <h2 className="text-2xl font-light text-[#351008] tracking-tight">System Settings</h2>
        <p className="text-sm font-light text-[#6F625C] mt-1">Configure platform properties, SLA compliance windows, and notification rules.</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <FiShield className="mt-0.5 shrink-0" />
        <p>Configuration persistence is not enabled for this environment. The controls below are read-only until an authorized settings API is available.</p>
      </div>

      {/* Settings Grid */}
      <div className="space-y-6">
        
        {/* General Config */}
        <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-[#351008] uppercase tracking-wider flex items-center gap-1.5">
            <FiSliders className="text-[#CCB999]" /> General Parameters
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light">
            <div className="space-y-1">
              <label className="block text-[#6F625C] font-semibold uppercase tracking-wider">Default SLA Compliance Window (Hours)</label>
              <input type="number" defaultValue="24" disabled aria-disabled="true" className="premium-input w-full px-3 py-2 text-xs font-light opacity-60" />
            </div>
            <div className="space-y-1">
              <label className="block text-[#6F625C] font-semibold uppercase tracking-wider">Warning Escalation Threshold (Hours)</label>
              <input type="number" defaultValue="4" disabled aria-disabled="true" className="premium-input w-full px-3 py-2 text-xs font-light opacity-60" />
            </div>
          </div>
        </div>

        {/* Notifications Config */}
        <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-[#351008] uppercase tracking-wider flex items-center gap-1.5">
            <FiBell className="text-[#CCB999]" /> Notification Channels
          </h3>

          <div className="space-y-3 text-xs text-[#351008] font-light">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" defaultChecked disabled aria-disabled="true" className="rounded border-[#D8CCC0] text-[#5E1801] opacity-60" />
              <span>Send automated email receipts for new citizen reports</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" defaultChecked disabled aria-disabled="true" className="rounded border-[#D8CCC0] text-[#5E1801] opacity-60" />
              <span>Send SMS updates to field workers on emergency assignments</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" defaultChecked disabled aria-disabled="true" className="rounded border-[#D8CCC0] text-[#5E1801] opacity-60" />
              <span>Trigger AI auto-classification pipelines on upload</span>
            </label>
          </div>
        </div>

        {/* Database Stats */}
        <div className="bg-white border border-[#E9E1D8] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-[#351008] uppercase tracking-wider flex items-center gap-1.5">
            <FiDatabase className="text-[#CCB999]" /> Database Connection (Supabase)
          </h3>

          <div className="flex items-center gap-4 bg-[#faf9f6] p-4 rounded-xl border border-[#E9E1D8] text-xs font-light">
            <div className="p-2 bg-[#12B76A]/10 text-[#12B76A] rounded-lg">
              <FiShield className="text-base" />
            </div>
            <div>
              <p className="font-semibold text-[#351008]">Status: CONNECTED</p>
              <p className="text-[#6F625C] text-[10px] mt-0.5">Indore Ward boundary spatial geofencing active (85 wards cached).</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
