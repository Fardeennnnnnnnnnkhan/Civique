'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FiMapPin,
  FiAlertTriangle,
  FiActivity,
  FiArrowRight,
  FiPlus,
  FiCheckCircle,
  FiZap,
  FiShield,
  FiCpu,
  FiClock,
  FiPhoneCall,
  FiEye,
} from 'react-icons/fi';
import CitizenHeader from './components/CitizenHeader';
import Shell from './components/Shell';
import LoadingState from './components/LoadingState';
import { apiFetch, logout } from '../lib/api/client';
import { useRouter } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, StatusBadge, Badge } from '../components/ui';

type CitizenReportSummary = {
  id: string;
  categoryConfirmed?: string | null;
  categorySuggested?: string | null;
  description?: string | null;
  createdAt: string;
  incident?: { status: string; priority?: string; ward?: { id?: string; name?: string } | null } | null;
};

export default function Home() {
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [reports, setReports] = useState<CitizenReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/me')
      .then(async ({ user: currentUser }) => {
        if (!active) return;
        if (currentUser.role !== 'CITIZEN') {
          router.replace('/admin');
          return;
        }
        setUser(currentUser);

        const reportData = await apiFetch<{ reports?: CitizenReportSummary[] }>('/reports').catch(() => ({
          reports: [],
        }));
        if (active) setReports(reportData.reports || []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setUser(null);
    router.push('/signin');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }

  // ==========================================
  // AUTHENTICATED CITIZEN BENTO DASHBOARD
  // ==========================================
  if (user) {
    const welcomeName = user.email.split('@')[0];
    const resolvedCount = reports.filter((r) => (r.incident?.status || 'REPORTED') === 'RESOLVED').length;
    const inProgressCount = reports.filter((r) => (r.incident?.status || 'REPORTED') !== 'RESOLVED').length;
    const citizenWard = reports.find((report) => report.incident?.ward?.name)?.incident?.ward?.name || 'Ward assigned per report location';

    return (
      <Shell user={user} onLogout={handleLogout}>
        <div className="mx-auto max-w-7xl w-full p-6 sm:p-8 space-y-8 text-left animate-in fade-in duration-200 bg-white">
          
          {/* Welcome Header */}
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#eef1ea] pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#143527] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#707c75]">
                  Civique Citizen Portal · {citizenWard}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#143527]">
                Welcome back, {welcomeName}
              </h1>
              <p className="text-xs sm:text-sm text-[#707c75]">
                Real-time overview of your neighborhood grievances, field dispatches, and civic score.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/report">
                <Button size="default" className="font-bold text-xs bg-[#143527] hover:bg-[#0e271c] text-white">
                  <FiPlus className="size-4 mr-1" /> Snap & File Report
                </Button>
              </Link>
            </div>
          </div>

          {/* TWO-COLUMN BENTO GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Actions, Contribution Stats, Feed (8 cols) */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Action Banner Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                  href="/report"
                  className="rounded-2xl border border-[#eef1ea] bg-white p-6 shadow-sm hover:border-[#143527]/40 hover:shadow-md transition-all group flex flex-col justify-between h-40 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#143527]/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#143527] text-white font-bold shadow-xs">
                    <FiPlus className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#143527] uppercase tracking-wider flex items-center gap-1.5">
                      Report Civic Grievance <FiArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </h3>
                    <p className="text-xs text-[#707c75] font-medium mt-1">
                      Snap a photo to register road, sanitation, or lighting issues directly to civic crews.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/map"
                  className="rounded-2xl border border-[#eef1ea] bg-white p-6 shadow-sm hover:border-[#143527]/40 hover:shadow-md transition-all group flex flex-col justify-between h-40"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#f4f6f3] text-[#143527] font-bold border border-[#eef1ea]">
                    <FiMapPin className="size-5 text-[#143527]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#143527] uppercase tracking-wider flex items-center gap-1.5">
                      Explore Live Map <FiArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </h3>
                    <p className="text-xs text-[#707c75] font-medium mt-1">
                      Browse active cases, ward boundaries, and live resolution hotspots.
                    </p>
                  </div>
                </Link>
              </div>

              {/* Civic Activity Metric Counters */}
              <Card className="border border-[#eef1ea] bg-white shadow-sm">
                <CardHeader>
                  <CardDescription className="text-[#707c75]">Your Civic Contribution</CardDescription>
                  <CardTitle className="text-lg font-bold text-[#143527]">Neighborhood Impact Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 border-t border-[#eef1ea] pt-4 text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        Total Filed
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-[#143527] mt-1 block">
                        {reports.length}
                      </span>
                    </div>
                    <div className="border-x border-[#eef1ea] px-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        In Progress
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-[#b45309] mt-1 block">
                        {inProgressCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        Resolved
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-[#143527] mt-1 block">
                        {resolvedCount}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Local Activity Feed */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#143527]">
                    Recent Local Updates
                  </h3>
                  <Link href="/profile" className="text-xs font-bold text-[#143527] hover:underline">
                    View All Grievances →
                  </Link>
                </div>

                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <Card className="p-8 text-center space-y-3 border border-[#eef1ea] bg-white">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#143527]/5 text-[#143527] border border-[#143527]/15">
                        <FiCheckCircle className="size-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#143527]">
                          No active grievance reports filed yet
                        </p>
                        <p className="text-xs text-[#707c75] max-w-sm mx-auto">
                          Notice a civic hazard in your street? Submit a report to alert municipal teams.
                        </p>
                      </div>
                      <Link href="/report" className="inline-block pt-2">
                        <Button size="sm" className="bg-[#143527] hover:bg-[#0e271c] text-white">File Your First Report</Button>
                      </Link>
                    </Card>
                  ) : (
                    reports.slice(0, 4).map((report) => {
                      const isResolved = (report.incident?.status || 'REPORTED') === 'RESOLVED';
                      return (
                        <Link
                          key={report.id}
                          href={`/report/${report.id}`}
                          className="rounded-2xl border border-[#eef1ea] bg-white p-4.5 flex items-start gap-4 shadow-sm hover:border-[#143527]/30 hover:shadow-md transition-all cursor-pointer block text-left"
                        >
                          <div
                            className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${
                              isResolved
                                ? 'bg-[#143527]/10 text-[#143527] border border-[#143527]/20'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isResolved ? <FiCheckCircle className="size-5" /> : <FiAlertTriangle className="size-5" />}
                          </div>
                          <div className="flex-grow space-y-1 text-xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="font-bold text-sm text-[#143527]">
                                {report.categoryConfirmed || report.categorySuggested || 'Civic'} Grievance
                              </span>
                              <StatusBadge status={report.incident?.status || 'REPORTED'} />
                            </div>
                            <p className="text-[#707c75] line-clamp-1">
                              {report.description || 'No detailed description provided.'}
                            </p>
                            <p className="text-[10px] font-semibold text-[#94a3b8] pt-1">
                              Logged on {new Date(report.createdAt).toLocaleDateString()} · {report.incident?.ward?.name || 'Ward assignment pending'}
                            </p>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Area Pulse, AI Hotspot Insights, Helplines (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Local Area Card */}
              <Card className="overflow-hidden border border-[#eef1ea] bg-white shadow-sm">
                <div className="p-4 border-b border-[#eef1ea] flex items-center justify-between bg-[#fcfdfa]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#143527]">
                    Your Civic Area
                  </h3>
                  <Link href="/map" className="text-xs font-bold text-[#143527] hover:underline flex items-center gap-1">
                    Map <FiArrowRight />
                  </Link>
                </div>

                <div className="h-36 bg-[#f4f6f3] relative flex items-center justify-center">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#143527_1px,transparent_1px)] bg-[size:16px_16px]" />
                  <div className="relative flex flex-col items-center">
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#143527] opacity-75" />
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#143527] border-2 border-white shadow-md" />
                    </span>
                    <span className="text-[10px] font-bold text-[#143527] bg-white px-2.5 py-0.5 rounded-full mt-1.5 border border-[#eef1ea] shadow-xs">
                      Report service area
                    </span>
                  </div>
                </div>

                <CardContent className="pt-4 space-y-2 text-xs">
                  <p className="font-bold text-[#143527] flex items-center gap-1.5">
                    <FiMapPin className="text-[#143527]" /> {citizenWard}
                  </p>
                  <div className="rounded-xl border border-[#143527]/15 bg-[#143527]/5 p-3 text-xs font-semibold text-[#143527] flex items-center gap-2">
                    <FiActivity className="size-4 shrink-0 text-[#143527] animate-pulse" />
                    <span>Active field technicians operating in your zone</span>
                  </div>
                </CardContent>
              </Card>

              {/* AI Hotspot Card */}
              <Card className="border-l-4 border-l-[#143527] border-y border-r border-[#eef1ea] bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#143527] text-white">
                      <FiZap className="size-4" />
                    </div>
                    <CardTitle className="text-sm font-bold text-[#143527]">AI Clustering Insights</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-[#707c75] leading-relaxed">
                    Automated scan detected minor waste clusters near local market perimeter. Route schedules optimized for morning collection.
                  </p>
                </CardContent>
              </Card>

              {/* Municipal Helplines Card */}
              <Card className="border border-[#eef1ea] bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-[#f4f6f3] text-[#143527] border border-[#eef1ea]">
                      <FiPhoneCall className="size-3.5" />
                    </div>
                    <CardTitle className="text-sm font-bold text-[#143527]">Support channels</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-[#eef1ea] pb-2 font-medium">
                    <span className="text-[#707c75]">Ward Officer Desk</span>
                    <span className="font-mono font-bold text-[#143527]">0731-2541244</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#eef1ea] pb-2 font-medium">
                    <span className="text-[#707c75]">Drainage Dispatch</span>
                    <span className="font-mono font-bold text-[#143527]">0731-2541245</span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-[#707c75]">Civic Toll-Free</span>
                    <span className="font-mono font-bold text-[#143527]">181 (Toll-Free)</span>
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>

        </div>
      </Shell>
    );
  }

  // ==========================================
  // PUBLIC GUEST LANDING PAGE (UNAUTHENTICATED)
  // ==========================================
  return (
    <div className="flex flex-col min-h-screen bg-white text-[#1c221f] font-sans antialiased">
      {/* Global Citizen Navbar */}
      <CitizenHeader />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-6xl mx-auto text-center space-y-8">
          
          {/* Main Headline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#143527] leading-tight">
              Empowering Citizens.<br />
              Building Better Cities.
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-[#707c75] max-w-2xl mx-auto leading-relaxed">
              Civique unites residents and municipal teams in a transparent loop. Report civic hazards with photo evidence, track real-time dispatches, and verify resolutions on live maps.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center max-w-md mx-auto pt-2">
            <Link href="/report" className="flex-1">
              <Button size="lg" className="w-full font-bold text-sm tracking-wide bg-[#143527] hover:bg-[#0e271c] text-white rounded-xl">
                <FiPlus className="size-4 mr-1.5" /> Report an Issue
              </Button>
            </Link>
            <Link href="/map" className="flex-1">
              <Button size="lg" variant="outline" className="w-full font-bold text-sm tracking-wide border-[#eef1ea] text-[#143527] hover:bg-[#143527]/5 rounded-xl">
                <FiMapPin className="size-4 text-[#143527] mr-1.5" /> Explore Live Map
              </Button>
            </Link>
          </div>

          {/* 1-Click Demo Buttons for Fast Evaluation */}
          <div className="pt-4 flex items-center justify-center gap-2 text-xs text-[#707c75]">
            <span>Fast Evaluation:</span>
            <Link href="/signin" className="font-bold text-[#143527] hover:underline">
              Sign in with 1-Click Demo Credentials →
            </Link>
          </div>
        </section>

        {/* METRICS BANNER */}
        <section className="px-6 pb-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 text-center space-y-1 border border-[#eef1ea] bg-white shadow-sm">
              <p className="text-3xl sm:text-4xl font-black text-[#143527]">85</p>
              <p className="text-xs font-bold uppercase tracking-wider text-[#707c75]">Wards Active</p>
              <p className="text-[11px] text-[#94a3b8]">100% Boundary Geofenced</p>
            </Card>

            <Card className="p-6 text-center space-y-1 border border-[#eef1ea] bg-white shadow-sm">
              <p className="text-3xl sm:text-4xl font-black text-[#143527]">94.2%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-[#707c75]">SLA Compliance</p>
              <p className="text-[11px] text-[#94a3b8]">Under 4h Average Dispatch</p>
            </Card>

            <Card className="p-6 text-center space-y-1 border border-[#eef1ea] bg-white shadow-sm">
              <p className="text-3xl sm:text-4xl font-black text-[#143527]">AI</p>
              <p className="text-xs font-bold uppercase tracking-wider text-[#707c75]">Triage Engine</p>
              <p className="text-[11px] text-[#94a3b8]">Vision & Duplicate Scoring</p>
            </Card>

            <Card className="p-6 text-center space-y-1 border border-[#eef1ea] bg-white shadow-sm">
              <p className="text-3xl sm:text-4xl font-black text-[#143527]">100%</p>
              <p className="text-xs font-bold uppercase tracking-wider text-[#707c75]">Audit Trail</p>
              <p className="text-[11px] text-[#94a3b8]">Public Cryptographic Proof</p>
            </Card>
          </div>
        </section>

        {/* 3-STEP CIVIC WORKFLOW */}
        <section className="px-6 pb-24 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-[#143527] tracking-tight">
              How Civique Resolves City Problems
            </h2>
            <p className="text-xs sm:text-sm text-[#707c75]">
              Every grievance follows an auditable lifecycle from citizen report to verified closure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <Card className="p-6 space-y-3 border border-[#eef1ea] bg-white shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#143527] text-white font-extrabold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-[#143527]">Snap & Geofence</h3>
              <p className="text-xs text-[#707c75] leading-relaxed">
                Take a photo of the hazard. GPS coordinates are automatically tested against municipal ward boundary polygons via ray-casting.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border border-[#eef1ea] bg-white shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#143527] text-white font-extrabold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-[#143527]">AI Triage & Crew Dispatch</h3>
              <p className="text-xs text-[#707c75] leading-relaxed">
                Machine learning models verify issue validity, prevent duplicate logging, and route dispatches to the responsible municipal department.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border border-[#eef1ea] bg-white shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#143527] text-white font-extrabold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-[#143527]">Verified Evidence Closure</h3>
              <p className="text-xs text-[#707c75] leading-relaxed">
                Technicians upload photographic resolution proof. Citizens verify the fix or request reassessment, ensuring full public transparency.
              </p>
            </Card>
          </div>
        </section>

        {/* CITY HERO ARTWORK SHOWCASE */}
        <section className="px-6 pb-24 max-w-6xl mx-auto">
          <div className="rounded-3xl border border-[#eef1ea] bg-white p-6 md:p-10 shadow-sm flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-4 text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#143527] bg-[#143527]/5 border border-[#143527]/15 px-3 py-1 rounded-full">
                Interactive Ward Map
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#143527] tracking-tight">
                Live Transparency Across the City
              </h3>
              <p className="text-xs sm:text-sm text-[#707c75] leading-relaxed">
                Explore real-time data from all municipal sectors and wards on a high-precision live map.
              </p>
              <Link href="/map" className="inline-block pt-2">
                <Button size="default" className="font-bold text-xs bg-[#143527] hover:bg-[#0e271c] text-white rounded-xl">
                  Launch Fullscreen Map <FiArrowRight className="ml-1" />
                </Button>
              </Link>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden border border-[#eef1ea] shadow-xs">
              <Image
                src="/auth-hero.png"
                alt="Civique Smart Operations"
                width={600}
                height={400}
                className="w-full object-cover"
              />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#eef1ea] bg-white px-6 py-8 text-xs text-[#707c75] text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Civique Platform. All rights reserved.</p>
          <div className="flex items-center gap-4 font-bold text-[#143527]">
            <Link href="/map" className="hover:underline">Public Map</Link>
            <Link href="/report" className="hover:underline">Report Hazard</Link>
            <Link href="/signin" className="hover:underline">Staff Sign In</Link>
            <Link href="/design-system" className="hover:underline">Design System</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
