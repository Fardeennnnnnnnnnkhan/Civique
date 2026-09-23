'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiLogOut, FiPhoneCall, FiChevronRight, FiShield, FiSliders } from 'react-icons/fi';
import { isNavigationActive, navigationFor } from '../../lib/navigation';
import { CiviqueLogo } from '../../components/CiviqueLogo';

type User = { id: string; email: string; role: string };

export default function Sidebar({
  user,
  onLogout,
  onNavigate,
}: {
  user: User | null;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [activeUser, setActiveUser] = useState<User>(
    user || { id: 'guest', email: 'Guest Citizen', role: 'CITIZEN' }
  );

  useEffect(() => {
    setMounted(true);
    if (user && user.id !== 'guest') {
      setActiveUser(user);
    }
  }, [user]);

  const items = navigationFor(mounted ? activeUser.role : 'CITIZEN');

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col border-r border-[#e2e8f0] bg-white text-[#0f172a] select-none font-sans"
      aria-label="Primary navigation"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4 bg-white">
        <Link href="/" onClick={onNavigate} className="flex items-center">
          <CiviqueLogo size={32} showText={true} />
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1" aria-label="Workspace navigation">
          {items.map(({ name, href, icon: Icon }) => {
            const active = isNavigationActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-h-10 items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-[#143527] text-white shadow-xs font-bold'
                    : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-6 items-center justify-center rounded-lg transition-colors ${
                      active ? 'text-white' : 'text-[#64748b] group-hover:text-[#0f172a]'
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </div>
                  <span>{name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer User Profile & Session Controls */}
      <div className="border-t border-[#e2e8f0] p-3.5 bg-white space-y-2">
        {mounted && activeUser.id !== 'guest' ? (
          <>
            <Link
              href={activeUser.role === 'CITIZEN' ? '/profile' : '/admin/settings'}
              onClick={onNavigate}
              className={`group flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-white p-2.5 text-xs shadow-2xs transition-all hover:border-[#cbd5e1] hover:bg-[#f8fafc] ${
                isNavigationActive(pathname, '/profile') ? 'ring-2 ring-[#143527]/30 border-[#143527]' : ''
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[#334155] text-xs font-bold text-white shadow-xs group-hover:bg-black transition-colors">
                    {activeUser.email ? activeUser.email.slice(0, 2).toUpperCase() : 'CZ'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-[#143527] border-2 border-white" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-bold text-[#0f172a] truncate text-xs group-hover:text-black">
                    {activeUser.email.split('@')[0]}
                  </p>
                  <p className="text-[10.5px] text-[#143527] font-medium">
                    Profile & Settings
                  </p>
                </div>
              </div>
              <FiChevronRight className="size-4 text-[#94a3b8] group-hover:text-[#0f172a] transition-transform group-hover:translate-x-0.5" />
            </Link>

            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-medium text-[#64748b] hover:bg-[#fef2f2] hover:text-[#ef4444] transition-colors cursor-pointer"
            >
              <FiLogOut aria-hidden="true" className="size-3.5 shrink-0" />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <Link
            href="/signin"
            onClick={onNavigate}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#143527] px-3.5 text-center text-xs font-bold text-white hover:bg-[#0e271c] shadow-xs transition-all cursor-pointer"
          >
            <span>Sign In / Register</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
