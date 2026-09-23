'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingState from '../components/LoadingState';
import Shell from '../components/Shell';
import { apiFetch, logout } from '../../lib/api/client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    
    apiFetch<{ user: { id: string; email: string; role: string } }>('/auth/me')
      .then(({ user: currentUser }) => {
        if (!active) return;
        if (currentUser.role === 'CITIZEN') {
          router.push('/');
          return;
        }
        setUser(currentUser);
        setCheckingAuth(false);
      })
      .catch(() => {
        if (!active) return;
        router.push('/signin');
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

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <LoadingState />
      </div>
    );
  }

  return (
    <Shell user={user} onLogout={handleLogout}>
      {children}
    </Shell>
  );
}
