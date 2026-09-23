'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FiHome,
  FiMap,
  FiPlusCircle,
  FiUser,
  FiMapPin,
  FiLogOut,
  FiChevronDown,
} from 'react-icons/fi';
import { apiFetch, logout } from '../../lib/api/client';
import { CiviqueLogo } from '../../components/CiviqueLogo';
import NotificationBell from './NotificationBell';

export default function CitizenHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<{ id?: string; email: string; role: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await logout().catch(() => undefined);
    setUser(null);
    router.push('/signin');
  };

  const navItems = [
    { name: 'Home', href: '/', icon: FiHome },
    { name: 'Live Map', href: '/map', icon: FiMap },
    { name: 'Report Issue', href: '/report', icon: FiPlusCircle },
    { name: 'My Grievances', href: '/profile', icon: FiUser },
  ];

  return (
    <header className="sticky top-0 bg-white border-b border-[#eef1ea] px-6 md:px-8 py-3.5 flex items-center justify-between z-50 select-none">
      {/* Left: Brand Logo */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center">
          <CiviqueLogo size={32} />
        </Link>
      </div>

      {/* Center: Navigation Links */}
      <nav className="hidden md:flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#475569]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-[#143527] font-bold bg-[#f2f7f4]'
                  : 'hover:text-[#143527] hover:bg-[#f8fafc]'
              }`}
            >
              <span>{item.name}</span>
              {isActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#143527]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right: Auth Controls & Profile */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            {user.id && <NotificationBell userId={user.id} />}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white p-1.5 pr-3 hover:bg-[#f1f5f9] transition-colors cursor-pointer"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#334155] text-xs font-bold text-white">
                  {user.email.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:block text-xs font-bold text-[#0f172a] max-w-[120px] truncate">
                  {user.email.split('@')[0]}
                </span>
                <FiChevronDown className="text-xs text-[#64748b]" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[#e2e8f0] bg-white p-2 text-xs shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="p-2.5 border-b border-[#f1f5f9]">
                    <p className="font-bold text-[#0f172a] truncate">{user.email}</p>
                    <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider mt-0.5">
                      {user.role.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 rounded-xl p-2.5 hover:bg-[#f1f5f9] text-[#0f172a] font-medium transition-colors"
                  >
                    <FiUser className="text-sm text-[#64748b]" /> My Profile & Reports
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-xl p-2.5 text-left text-[#ef4444] hover:bg-[#fef2f2] font-medium transition-colors cursor-pointer"
                  >
                    <FiLogOut className="text-sm" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              href="/signin"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#e2e8f0] bg-white px-3.5 text-xs font-semibold text-[#0f172a] hover:bg-[#f1f5f9] transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#143527] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#0e271c] transition-all active:scale-98"
            >
              Create Account
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
