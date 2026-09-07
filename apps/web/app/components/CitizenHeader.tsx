'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  FiHome, 
  FiMap, 
  FiPlusCircle, 
  FiUser, 
  FiBell, 
  FiMapPin, 
  FiLogOut, 
  FiActivity,
  FiSettings,
  FiChevronDown
} from 'react-icons/fi';

export default function CitizenHeader() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    router.push('/signin');
  };

  const navItems = [
    { name: 'Home', href: '/', icon: FiHome },
    { name: 'Explore', href: '/map', icon: FiMap },
    { name: 'Report', href: '/report', icon: FiPlusCircle },
    { name: 'My Reports', href: '/profile', icon: FiUser },
  ];

  const mockNotifications = [
    { id: 1, title: 'Case Resolved', desc: 'Streetlight resolved in Ward 44.', time: '10m ago' },
    { id: 2, title: 'Crew Dispatched', desc: 'DPW Unit 4 en route for Pothole #980869.', time: '2h ago' },
  ];

  return (
    <>
      {/* DESKTOP GLOBAL HEADER */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#E9E1D8] px-8 py-3.5 flex items-center justify-between z-50 select-none shadow-xs">
        
        {/* Left: Brand logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8.5 h-8.5 rounded-xl bg-[#5E1801] flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <img src="/civique.png" alt="Civique Logo" className="w-5.5 h-5.5 object-contain invert" />
            </div>
            <div className="text-left">
              <span className="font-display font-semibold tracking-wide text-xs text-[#5E1801]">CIVIQUE</span>
              <p className="text-[8px] text-[#9B9088] tracking-widest font-bold">CIVIC INTELLIGENCE</p>
            </div>
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#6F625C]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-4 py-2 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'text-[#5E1801] font-bold bg-[#f2ddbb]/40' 
                    : 'hover:text-[#5E1801] hover:bg-[#faf9f6]'
                }`}
              >
                <span>{item.name}</span>
                {isActive && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#5E1801]"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Notification dropdown + User profile */}
        <div className="flex items-center gap-4 text-xs font-medium">
          
          {/* Location Indicator context */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#faf9f6] border border-[#E9E1D8] rounded-full px-3.5 py-1.5 text-[10px] text-[#6F625C] font-semibold">
            <FiMapPin className="text-[#5E1801] animate-bounce" />
            <span>Indore, Ward 44</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3 relative">
              
              {/* Notification icon */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 border border-[#E9E1D8] text-[#5E1801] rounded-xl hover:bg-[#faf9f6] transition-colors relative"
                >
                  <FiBell className="text-base" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF6820] border-2 border-white"></span>
                </button>

                {/* Notifications Popup */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2.5 w-68 bg-white border border-[#E9E1D8] rounded-2xl p-4 shadow-xl z-50 space-y-3.5 text-left animate-fade-in">
                    <div className="border-b border-[#E9E1D8] pb-2 flex justify-between items-center">
                      <span className="text-[10px] text-[#9B9088] uppercase tracking-wider font-semibold">Recent Alerts</span>
                      <button onClick={() => setNotificationsOpen(false)} className="text-[9px] text-[#5E1801] hover:underline">Clear</button>
                    </div>
                    <div className="space-y-3">
                      {mockNotifications.map((notif) => (
                        <div key={notif.id} className="text-xs font-light space-y-0.5">
                          <div className="flex justify-between font-semibold text-[#351008]">
                            <span>{notif.title}</span>
                            <span className="text-[9px] text-[#9B9088] font-normal">{notif.time}</span>
                          </div>
                          <p className="text-[10px] text-[#6F625C] leading-normal">{notif.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile drop trigger */}
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 p-1 border border-[#E9E1D8] rounded-xl hover:bg-[#faf9f6] transition-colors pr-2"
                >
                  <div className="w-7.5 h-7.5 bg-[#f2ddbb]/60 text-[#5E1801] rounded-lg flex items-center justify-center font-bold text-xs">
                    {user.email.substring(0, 2).toUpperCase()}
                  </div>
                  <FiChevronDown className="text-stone-500" />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-48 bg-white border border-[#E9E1D8] rounded-2xl p-2 shadow-xl z-50 space-y-1 text-left animate-fade-in">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[#faf9f6] text-[#351008] text-xs font-medium rounded-xl transition-all"
                    >
                      <FiUser /> Profile Activity
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-[#faf9f6] text-[#351008] text-xs font-medium rounded-xl transition-all"
                    >
                      <FiSettings /> Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-[#ba1a1a] text-xs font-semibold rounded-xl transition-all text-left border-t border-[#faf9f6] mt-1 pt-2"
                    >
                      <FiLogOut /> Log Out
                    </button>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/signin" className="text-xs font-semibold text-[#6F625C] hover:text-[#5E1801] transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="premium-btn-primary px-4 py-2 text-[10px] uppercase tracking-wider font-semibold">
                Sign Up
              </Link>
            </div>
          )}

        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E9E1D8] px-6 py-2 flex items-center justify-between z-40 shadow-lg select-none">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          if (item.name === 'Report') {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="relative -top-4 w-12.5 h-12.5 bg-[#5E1801] hover:bg-[#351008] text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <Icon className="text-xl" />
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center gap-1 p-2 text-stone-500 hover:text-[#5E1801] transition-colors ${
                isActive ? 'text-[#5E1801]' : 'text-stone-400'
              }`}
            >
              <Icon className="text-lg" />
              <span className="text-[8px] font-semibold uppercase tracking-wider">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
