'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import MobileNavigation from './MobileNavigation';
import TopBar from './TopBar';

type User = { id: string; email: string; role: string };

export default function Shell({
  user,
  onLogout,
  children,
}: {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const effectiveUser: User = user || { id: 'guest', email: 'Guest Citizen', role: 'CITIZEN' };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-[#0f172a]">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden h-full md:block">
        <Sidebar user={effectiveUser} onLogout={onLogout} />
      </div>

      {/* Main Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar user={effectiveUser} onOpenNavigation={() => setOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative h-full w-72 shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] shadow-xs cursor-pointer"
            >
              ✕
            </button>
            <Sidebar user={effectiveUser} onLogout={onLogout} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavigation role={effectiveUser.role} />
    </div>
  );
}
