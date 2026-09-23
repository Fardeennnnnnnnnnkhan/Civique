import type { IconType } from 'react-icons';
import { FiAlertCircle, FiBarChart2, FiClock, FiFileText, FiGrid, FiHome, FiMap, FiPlus, FiUsers, FiCompass, FiShield, FiGitMerge, FiTrendingUp } from 'react-icons/fi';

export type NavigationItem = { name: string; href: string; icon: IconType };

const citizen: NavigationItem[] = [
  { name: 'Home', href: '/', icon: FiHome },
  { name: 'Report an issue', href: '/report', icon: FiPlus },
  { name: 'Explore map', href: '/map', icon: FiMap },
  { name: 'My reports & timeline', href: '/profile', icon: FiFileText },
];

const fieldWorker: NavigationItem[] = [
  { name: "Today's work", href: '/admin/worker', icon: FiClock },
  { name: 'Assigned tasks', href: '/admin/worker', icon: FiAlertCircle },
  { name: 'Work map', href: '/map', icon: FiMap },
];

const official: NavigationItem[] = [
  { name: 'Dashboard', href: '/admin', icon: FiGrid },
  { name: 'Reports', href: '/admin/reports', icon: FiFileText },
  { name: 'Incidents', href: '/admin/incidents', icon: FiAlertCircle },
  { name: 'People', href: '/admin/people', icon: FiUsers },
  { name: 'Geography', href: '/admin/geography', icon: FiCompass },
  { name: 'Analytics', href: '/admin/analytics', icon: FiBarChart2 },
  { name: 'Live map', href: '/map', icon: FiMap },
  { name: 'Duplicate review', href: '/admin/duplicates', icon: FiGitMerge },
  { name: 'Priority policy', href: '/admin/priority', icon: FiTrendingUp },
  { name: 'Socio moderation', href: '/admin/moderation', icon: FiShield },
  { name: 'Integrations', href: '/admin/integrations', icon: FiShield },
  { name: 'City control plane', href: '/admin/tenants', icon: FiShield },
];

export function navigationFor(role: string): NavigationItem[] {
  if (role === 'CITIZEN') return citizen;
  if (role === 'FIELD_WORKER') return fieldWorker;
  const items = [...official];
  if (['CITY_ADMIN', 'COMMISSIONER', 'SUPER_ADMIN'].includes(role)) items.splice(5, 0, { name: 'Roles & permissions', href: '/admin/roles', icon: FiShield });
  return items;
}

export function isNavigationActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
