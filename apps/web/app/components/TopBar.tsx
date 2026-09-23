'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiMenu, FiUser, FiMapPin, FiPlus, FiZap, FiShield } from 'react-icons/fi';
import NotificationBell from './NotificationBell';
import { CiviqueLogo } from '../../components/CiviqueLogo';

type User = { id: string; email: string; role: string };

export default function TopBar({
  user,
  onOpenNavigation,
}: {
  user: User;
  onOpenNavigation: () => void;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [activeUser, setActiveUser] = useState<User>(user);

  useEffect(() => {
    setMounted(true);
    if (user && user.id !== 'guest') {
      setActiveUser(user);
    }
  }, [user]);

  const accountHref = activeUser.role === 'CITIZEN' ? '/profile' : '/admin/settings';
  const initials = activeUser.email ? activeUser.email.slice(0, 2).toUpperCase() : null;
  const isReportPage = pathname === '/report';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[#e2e8f0] bg-white px-4 md:px-6 select-none font-sans">
      {/* Left Section: Mobile menu */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenNavigation}
          className="flex size-10 items-center justify-center rounded-xl p-2 text-[#0f172a] hover:bg-[#f1f5f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143527] md:hidden cursor-pointer"
        >
          <FiMenu aria-hidden="true" className="size-5" />
        </button>

        {/* Mobile Brand Logo */}
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <CiviqueLogo size={28} showText={true} />
        </Link>
      </div>

      {/* Right Section: Quick Action + Notifications + User Pill */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Report CTA */}
        {!isReportPage && (
          <Link
            href="/report"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#143527] hover:bg-[#0e271c] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <FiPlus className="size-3.5 stroke-[2.5]" />
            <span>Report Issue</span>
          </Link>
        )}

        {/* Notifications */}
        {mounted && activeUser.id !== 'guest' && (
          <NotificationBell userId={activeUser.id} />
        )}

        {/* Divider */}
        {mounted && activeUser.id !== 'guest' && (
          <span className="h-5 w-px bg-[#e2e8f0]" aria-hidden="true" />
        )}

        {/* User Identity Pill / Auth Controls */}
        {mounted && activeUser.id !== 'guest' ? (
          <Link
            href={accountHref}
            className="flex items-center gap-2.5 rounded-xl border border-[#e2e8f0] bg-white p-1.5 pr-3 shadow-2xs hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#143527] group"
            title="Profile & Settings"
          >
            <div className="relative">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#334155] text-xs font-bold text-white shadow-xs group-hover:bg-black transition-colors">
                {initials || <FiUser aria-hidden="true" className="size-4" />}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-[#143527] border-2 border-white" />
            </div>
            <div className="hidden flex-col text-left lg:flex">
              <span className="max-w-40 truncate text-xs font-bold text-[#0f172a] group-hover:text-black">
                {activeUser.email.split('@')[0]}
              </span>
              <span className="text-[10.5px] font-medium text-[#64748b]">
                {activeUser.role.replaceAll('_', ' ')}
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0f172a] hover:bg-[#f8fafc] shadow-2xs transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#143527] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0e271c] shadow-2xs transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
