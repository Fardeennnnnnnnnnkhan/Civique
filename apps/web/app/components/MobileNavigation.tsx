'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavigationActive, navigationFor } from '../../lib/navigation';

export default function MobileNavigation({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navigationFor(role).slice(0, role === 'CITIZEN' ? 5 : 4);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[#e2e8f0] bg-white/95 p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden shadow-lg select-none"
      aria-label="Mobile navigation"
    >
      {items.map(({ name, href, icon: Icon }) => {
        const active = isNavigationActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] transition-all ${
              active
                ? 'font-bold text-[#143527]'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? 'bg-[#143527] text-white shadow-xs' : ''}`}>
              <Icon aria-hidden="true" className="size-4.5" />
            </div>
            <span>{name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
