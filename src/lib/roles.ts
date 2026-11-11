import type { AdminRole } from './types';

export const ROLE_LABEL: Record<AdminRole, string> = { superadmin: 'Admin', ops: 'Operations', intern: 'Intern' };

export interface Section { href: string; label: string; group: string; roles: AdminRole[] }

const A: AdminRole = 'superadmin', O: AdminRole = 'ops', I: AdminRole = 'intern';
/** The menu, in order; the sidebar shows a heading over each run of the same `group`. Admin (superadmin) is in every row. */
export const SECTIONS: Section[] = [
  { href: '/dashboard', label: 'Dashboard', group: 'Overview', roles: [A] },
  { href: '/creators', label: 'Creators', group: 'People', roles: [A, I] },
  { href: '/brands', label: 'Brands', group: 'People', roles: [A, I] },
  { href: '/campaigns', label: 'Campaigns', group: 'Marketplace', roles: [A, I] },
  { href: '/jobs', label: 'Jobs', group: 'Marketplace', roles: [A, I] },
  { href: '/moderation', label: 'Moderation', group: 'Trust and safety', roles: [A, I] },
  { href: '/tickets', label: 'Support', group: 'Trust and safety', roles: [A, I] },
  { href: '/offers', label: 'Offers', group: 'Venue rewards', roles: [A, O] },
  { href: '/vouchers', label: 'Vouchers', group: 'Venue rewards', roles: [A, O] },
  { href: '/reports', label: 'Reports', group: 'Venue rewards', roles: [A, O] },
  { href: '/settings', label: 'Settings', group: 'Workspace', roles: [A] },
  { href: '/notifications', label: 'Push notifications', group: 'Workspace', roles: [A] },
  { href: '/team', label: 'Team', group: 'Workspace', roles: [A] },
];

/** The section owning a path: the longest href that is the path or a parent of it. */
export function sectionFor(pathname: string): Section | undefined {
  return SECTIONS.filter((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];
}

/** A path outside every section (/login) is open to all. */
export function canOpen(role: AdminRole, pathname: string): boolean {
  return sectionFor(pathname)?.roles.includes(role) ?? true;
}

const HOME: Record<AdminRole, string> = { superadmin: '/dashboard', ops: '/offers', intern: '/tickets' };
export const homeFor = (role: AdminRole): string => HOME[role];
