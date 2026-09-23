'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Textarea,
  Dialog,
  StatusBadge,
  PriorityBadge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui';

export default function DesignSystemPage() {
  const [dark, setDark] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingButton, setLoadingButton] = useState(false);
  const [inputValue, setInputValue] = useState('');

  return (
    <div className={dark ? 'dark min-h-screen bg-[#020617] text-[#f8fafc]' : 'min-h-screen bg-white text-slate-900 font-sans text-left'}>
      <div className="mx-auto max-w-7xl space-y-12 px-6 py-12 sm:px-8">
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-200 pb-8 dark:border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 rounded-full bg-[#143527] shadow-[0_0_12px_#143527]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#143527] dark:text-[#f8fafc]">
                Civique Theme Specification · Pure White & Deep Forest Green
              </p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
              Civique Design System
            </h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Unified design language featuring pure white surfaces, high-contrast borders, deep forest green (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-bold text-[#143527] dark:bg-slate-800 dark:text-emerald-400">
                #143527
              </code>
              ) primary brand actions, and accessible typography.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              ← Return to Platform
            </Link>
            <Button variant={dark ? 'default' : 'secondary'} onClick={() => setDark((prev) => !prev)}>
              {dark ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
            </Button>
          </div>
        </header>

        {/* 1. Color Palette Tokens */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">1. Core Theme Tokens</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Exact hex color mappings active across Civique.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="h-14 w-full rounded-xl bg-[#143527] shadow-inner flex items-center justify-center font-bold text-white text-xs">
                #143527
              </div>
              <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">Primary (Forest)</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">CTA, Badges, Brand</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="h-14 w-full rounded-xl bg-[#0e271c] shadow-inner flex items-center justify-center font-bold text-white text-xs">
                #0e271c
              </div>
              <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">Primary Hover</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Hover states</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="h-14 w-full rounded-xl bg-[#ffffff] border border-slate-200 flex items-center justify-center font-bold text-slate-900 text-xs">
                #ffffff
              </div>
              <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">Canvas & Cards</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Universal background</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="h-14 w-full rounded-xl bg-[#eef1ea] flex items-center justify-center font-bold text-slate-700 text-xs">
                #eef1ea
              </div>
              <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">Clean Border</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Subtle delimiters</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="h-14 w-full rounded-xl bg-[#0f172a] flex items-center justify-center font-bold text-white text-xs">
                #0f172a
              </div>
              <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">Typography Slate</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Headings & text</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="h-14 w-full rounded-xl bg-[#ef4444] flex items-center justify-center font-bold text-white text-xs">
                #ef4444
              </div>
              <p className="mt-3 text-xs font-bold text-slate-900 dark:text-white">Destructive</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Alerts, critical SLA</p>
            </div>
          </div>
        </section>

        {/* 2. Bento Grid Mockup */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">2. Bento Grid Preview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Cards styled cleanly according to the master Civique theme.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metric Card 1: Total Incidents */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white">
              <CardHeader>
                <CardDescription>Total Registered Incidents</CardDescription>
                <CardTitle className="text-3xl font-extrabold text-slate-900 dark:text-white">15,231</CardTitle>
                <p className="text-xs font-medium text-[#143527] flex items-center gap-1 mt-1">
                  ↑ +20.1% <span className="text-slate-500 dark:text-slate-400">from last month</span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-12 w-full flex items-end gap-1.5 pt-2">
                  {[40, 65, 30, 80, 55, 90, 70, 85, 100].map((val, i) => (
                    <div
                      key={i}
                      style={{ height: `${val}%` }}
                      className="flex-1 rounded-sm bg-[#143527] hover:brightness-110 transition-all"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Metric Card 2: Resolution Target */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white">
              <CardHeader>
                <CardDescription>Verified Resolutions</CardDescription>
                <CardTitle className="text-3xl font-extrabold text-slate-900 dark:text-white">+2,350</CardTitle>
                <p className="text-xs font-medium text-[#143527] flex items-center gap-1 mt-1">
                  ↑ +180.1% <span className="text-slate-500 dark:text-slate-400">civic velocity</span>
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Target: 95%</span>
                    <span className="text-[#143527] font-bold">94.2%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-[#143527] rounded-full" style={{ width: '94.2%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metric Card 3: Civic Activity Goal */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white">
              <CardHeader>
                <CardDescription>Field Crew Daily Target</CardDescription>
                <CardTitle className="text-3xl font-extrabold text-slate-900 dark:text-white">350</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dispatches per day</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5 h-10">
                  {[20, 45, 60, 85, 95, 80, 100, 75, 60, 40].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className={`flex-1 rounded-sm ${i === 4 ? 'bg-slate-800 dark:bg-white' : 'bg-[#143527]'}`}
                    />
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button size="sm" variant="secondary" className="w-full">
                  Update Goal
                </Button>
              </CardFooter>
            </Card>

            {/* Quick Action Card */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900 dark:text-white">Rapid Actions</CardTitle>
                <CardDescription>Common operations workflow</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start text-xs font-semibold" onClick={() => setDialogOpen(true)}>
                  + Assign Field Crew Modal
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs dark:bg-slate-900 dark:border-slate-800"
                >
                  📍 View Indore Live Map
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 3. Interactive Buttons & Badges */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Buttons Showcase */}
          <Card className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">3. Button Variants & Sizes</CardTitle>
              <CardDescription>Tactile buttons with active micro-animations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Primary (Forest Green)</Button>
                <Button variant="secondary">Secondary (Slate)</Button>
                <Button variant="outline" className="dark:bg-slate-900 dark:border-slate-800">
                  Outline
                </Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Sizes & Loading States</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small (sm)</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large (lg)</Button>
                  <Button
                    isLoading={loadingButton}
                    onClick={() => {
                      setLoadingButton(true);
                      setTimeout(() => setLoadingButton(false), 1500);
                    }}
                  >
                    Click to Test Spinner
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges Showcase */}
          <Card className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">4. Civic Lifecycle & Priority Badges</CardTitle>
              <CardDescription>Status and SLA indicators with paired text and iconography.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">Incident Status Badges</p>
                <div className="flex flex-wrap gap-2.5">
                  <StatusBadge status="REPORTED" />
                  <StatusBadge status="AI_REVIEW" />
                  <StatusBadge status="OPEN" />
                  <StatusBadge status="ASSIGNED" />
                  <StatusBadge status="IN_PROGRESS" />
                  <StatusBadge status="RESOLVED" />
                  <StatusBadge status="ESCALATED" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">SLA Priority Badges</p>
                <div className="flex flex-wrap gap-2.5">
                  <PriorityBadge priority="CRITICAL" />
                  <PriorityBadge priority="HIGH" />
                  <PriorityBadge priority="MEDIUM" />
                  <PriorityBadge priority="LOW" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. Inputs and Form Controls */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">5. Form Inputs & Validation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Clean inputs with focused brand rings and clear error feedback.</p>
          </div>

          <Card className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Input
                  label="Citizen Full Name"
                  id="demo-name"
                  placeholder="e.g. Rahul Sharma"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Input label="Contact Email" id="demo-email" type="email" placeholder="rahul@example.com" />
                <Input
                  label="Indore Ward Number"
                  id="demo-ward"
                  placeholder="Ward 44 (Khajrana)"
                  error={
                    inputValue.length > 0 && inputValue.length < 3
                      ? 'Ward input must contain at least 3 characters'
                      : undefined
                  }
                />
              </div>

              <div className="mt-6">
                <Textarea
                  label="Incident Detailed Description"
                  id="demo-desc"
                  placeholder="Describe the municipal grievance, nearby landmark, or road hazard..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 6. Civic Data Table */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">6. Municipal Operations Table</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sticky header, hoverable rows, and integrated badges for the official queue.</p>
          </div>

          <Table className="dark:bg-slate-900 dark:border-slate-800 border-slate-200 bg-white">
            <TableHeader className="dark:bg-slate-800 dark:border-slate-800">
              <TableRow className="dark:border-slate-800">
                <TableHead>Tracking ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Indore Ward</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="dark:divide-slate-800">
              {[
                { id: 'CVQ-IND-00104', cat: 'Pothole Hazard', ward: 'Ward 44 · Khajrana', priority: 'CRITICAL', status: 'IN_PROGRESS' },
                { id: 'CVQ-IND-00105', cat: 'Drainage Overflow', ward: 'Ward 12 · Vijay Nagar', priority: 'HIGH', status: 'ASSIGNED' },
                { id: 'CVQ-IND-00106', cat: 'Streetlight Outage', ward: 'Ward 28 · Palasia', priority: 'MEDIUM', status: 'OPEN' },
                { id: 'CVQ-IND-00107', cat: 'Solid Waste Dumping', ward: 'Ward 51 · Rajwada', priority: 'LOW', status: 'RESOLVED' },
              ].map((row) => (
                <TableRow key={row.id} className="dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <TableCell className="font-mono font-bold text-xs">{row.id}</TableCell>
                  <TableCell className="font-semibold text-slate-900 dark:text-white">{row.cat}</TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400">{row.ward}</TableCell>
                  <TableCell>
                    <PriorityBadge priority={row.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="dark:bg-slate-900 dark:border-slate-800"
                      onClick={() => setDialogOpen(true)}
                    >
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>

      {/* 7. Dialog / Modal Component */}
      <Dialog
        open={dialogOpen}
        title="Assign Field Worker"
        description="Select an authorized municipal department and verified field technician for dispatch in Indore."
        onClose={() => setDialogOpen(false)}
      >
        <div className="space-y-4">
          <Input label="Department Selection" id="assign-dept" defaultValue="Public Works Department (PWD)" readOnly />
          <Input label="Lead Technician" id="assign-worker" defaultValue="Suresh Verma (Field Technician #4)" readOnly />
          <div className="rounded-xl border border-[#143527]/20 bg-[#143527]/5 p-3 text-xs text-[#143527] font-medium">
            ✓ Dispatching worker will trigger an automated notification and initialize the 4-hour SLA countdown timer.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>
              Confirm Assignment
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
