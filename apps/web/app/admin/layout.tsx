'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FiGrid, 
  FiAlertCircle, 
  FiBarChart2, 
  FiMap, 
  FiSettings, 
  FiLogOut, 
  FiMenu, 
  FiX, 
  FiBell, 
  FiActivity,
  FiUser,
  FiFileText,
  FiUsers
} from 'react-icons/fi';
import NotificationBell from '../components/NotificationBell';

import Shell from '../components/Shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('accessToken');
    if (!storedUser || !token) {
      router.push('/signin');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role === 'CITIZEN') {
        router.push('/');
        return;
      }
      setUser(parsedUser);
      setCheckingAuth(false);
    } catch (e) {
      localStorage.clear();
      router.push('/signin');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/signin');
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="relative flex h-8 w-8">
          <span className="animate-ping absolute inline-flex h-full w-full bg-[#5E1801] rounded-full opacity-75"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-[#5E1801]"></span>
        </div>
      </div>
    );
  }

  return (
    <Shell user={user} onLogout={handleLogout}>
      {children}
    </Shell>
  );
}
