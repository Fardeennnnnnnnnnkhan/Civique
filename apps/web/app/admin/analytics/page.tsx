'use client';

import { FiBarChart2, FiInfo } from 'react-icons/fi';

export default function AnalyticsDashboardPage() {
  return <div className="mx-auto w-full max-w-7xl space-y-6 p-6 text-left md:p-8"><header className="border-b border-[#E9E1D8] pb-6"><div className="flex items-center gap-2 text-[#5E1801]"><FiBarChart2 /><span className="text-xs font-bold uppercase tracking-wider">M18 analytics</span></div><h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#351008]">Civic intelligence</h1><p className="mt-1 text-sm text-[#6F625C]">Performance analytics will appear here once the verified aggregate pipeline is enabled.</p></header><section className="rounded-2xl border border-[#E9E1D8] bg-white p-8 shadow-sm"><div className="mx-auto flex max-w-xl flex-col items-center text-center"><div className="flex size-12 items-center justify-center rounded-full bg-[#faf9f6] text-[#5E1801]"><FiInfo className="text-xl" /></div><h2 className="mt-4 text-lg font-semibold text-[#351008]">Analytics is not available yet</h2><p className="mt-2 text-sm leading-relaxed text-[#6F625C]">This page no longer shows sample rankings or fabricated metrics. M18 will provide real, privacy-safe aggregates with freshness timestamps, filters, accessible chart alternatives, and exports.</p></div></section></div>;
}
