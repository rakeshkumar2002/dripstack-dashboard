'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { clearToken, getToken } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { C } from './ui';

type NavItem = { href: string; label: string; icon: React.ReactNode; perm?: string };

const iUsers = (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <circle cx="6.5" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M2.5 14.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M12 4.4a2.6 2.6 0 0 1 0 5M13 14.5c0-1.7-.8-3.2-2-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const iBuilding = (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <rect x="3" y="2.5" width="8" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M11 7h3.5v8.5H11" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5.4 5.5h3M5.4 8h3M5.4 10.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const iWrench = (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <circle cx="6.5" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M2.5 15c0-2.2 1.8-4 4-4 .9 0 1.7.3 2.4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M11 11.5l3.5 3.5M12.8 9.8a2 2 0 1 0 2.4 2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const iMail = (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <rect x="2.5" y="4" width="13" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M3 5l6 4.5L15 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const iShield = (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <path d="M9 2l5.5 2v4c0 3.4-2.3 6.4-5.5 7.5C5.8 14.4 3.5 11.4 3.5 8V4L9 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M6.6 8.6l1.7 1.7 3-3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const iKey = (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
    <circle cx="6" cy="6" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8.3 8.3l5 5M11.5 11.8l1.4-1.4M13 13.3l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const NAV: NavItem[] = [
  {
    href: '/runs',
    label: 'Pipeline',
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4.5" width="3.4" height="9.5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
        <rect x="7.3" y="2.2" width="3.4" height="13.6" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12.6" y="7" width="3.4" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: '/sequences',
    label: 'Sequences',
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
        <circle cx="4.5" cy="4.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="13.5" cy="13.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.5 6.7v3.3c0 1.8 1.5 3.3 3.3 3.3h3.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
        <rect x="2.4" y="9" width="3" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" />
        <rect x="7.5" y="5" width="3" height="10" rx="1" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12.6" y="2.6" width="3" height="12.4" rx="1" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: '/integrations',
    label: 'Integrations',
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
        <circle cx="6" cy="9" r="3.4" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="9" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

const PLATFORM_MGMT: NavItem[] = [
  { href: '/customers', label: 'Customers', icon: iBuilding, perm: 'customers.read' },
  { href: '/users', label: 'Users', icon: iUsers, perm: 'users.read' },
];
const CUSTOMER_MGMT: NavItem[] = [
  { href: '/technicians', label: 'Technicians', icon: iWrench, perm: 'technicians.read' },
  { href: '/team', label: 'Team', icon: iUsers, perm: 'users.read' },
  { href: '/email', label: 'Email', icon: iMail, perm: 'technicians.read' },
  { href: '/sso', label: 'SSO', icon: iKey, perm: 'integrations.read' },
  { href: '/security', label: 'Audit log', icon: iShield, perm: 'users.read' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { principal, isPlatform, can } = usePrincipal();

  const mgmt = (isPlatform ? PLATFORM_MGMT : CUSTOMER_MGMT).filter((n) => !n.perm || can(n.perm));
  const orgName = principal?.organization?.name ?? (isPlatform ? 'Platform' : 'Workspace');
  const roleName = (principal?.role.slug ?? '').replace(/-/g, ' ') || 'Member';
  const initials = orgName.replace(/[^A-Za-z ]/g, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'DS';

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  function signOut() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SIDEBAR */}
      <div
        className="flex w-[238px] shrink-0 flex-col bg-white"
        style={{ borderRight: `1px solid ${C.border}`, padding: '16px 14px' }}
      >
        <div className="flex items-center gap-[11px]" style={{ padding: '6px 8px 16px' }}>
          <div
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]"
            style={{ background: C.blue, boxShadow: '0 4px 10px rgba(47,95,208,.32)' }}
          >
            <div className="h-[13px] w-[13px] rounded-[4px]" style={{ border: '2.4px solid #fff' }} />
          </div>
          <div className="min-w-0 leading-[1.1]">
            <div className="font-display text-[16px] font-semibold tracking-[-.2px]">DripStack</div>
            <div className="truncate text-[11.5px]" style={{ color: C.faint }}>
              {orgName}
            </div>
          </div>
        </div>

        <div className="font-mono text-[10px] tracking-[.6px]" style={{ color: C.fainter, padding: '6px 10px 8px' }}>
          WORKSPACE
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-[14px] font-medium transition-colors"
                style={{
                  background: active ? C.blueTint : 'transparent',
                  color: active ? C.blue : '#565d6b',
                }}
              >
                {n.icon}
                {n.label}
              </Link>
            );
          })}
        </nav>

        {mgmt.length ? (
          <>
            <div
              className="font-mono text-[10px] tracking-[.6px]"
              style={{ color: C.fainter, padding: '16px 10px 8px' }}
            >
              MANAGEMENT
            </div>
            <nav className="flex flex-col gap-0.5">
              {mgmt.map((n) => {
                const active = pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex items-center gap-[11px] rounded-[9px] px-[11px] py-[9px] text-[14px] font-medium transition-colors"
                    style={{ background: active ? C.blueTint : 'transparent', color: active ? C.blue : '#565d6b' }}
                  >
                    {n.icon}
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </>
        ) : null}

        <div className="mt-auto flex flex-col gap-3">
          <div
            className="rounded-[13px] p-[13px]"
            style={{ border: `1px solid ${C.border}`, background: 'linear-gradient(180deg,#f7f9ff,#eef3ff)' }}
          >
            <div className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.blue }}>
              ABSORBED TODAY
            </div>
            <div className="mt-[5px] flex items-baseline gap-[7px]">
              <span className="font-display text-[28px] font-semibold tracking-[-1px]">23</span>
              <span className="text-[12.5px]" style={{ color: C.muted }}>
                of 28 incidents
              </span>
            </div>
            <div className="mt-[9px] h-[6px] overflow-hidden rounded-[4px]" style={{ background: '#dbe4fb' }}>
              <div className="h-full rounded-[4px]" style={{ width: '82%', background: C.blue }} />
            </div>
            <div className="mt-[7px] text-[11.5px]" style={{ color: C.muted }}>
              82% resolved without a human
            </div>
          </div>
          <div
            className="flex items-center gap-[10px] px-[6px] pt-3"
            style={{ borderTop: `1px solid #eef0f4` }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full font-display text-[13px] font-semibold text-white"
              style={{ background: '#1b2540' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1 leading-[1.15]">
              <div className="truncate text-[13.5px] font-semibold capitalize">{roleName}</div>
              <div className="text-[11.5px] capitalize" style={{ color: C.faint }}>
                {principal?.role.scope ?? 'workspace'}
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="text-[18px] leading-none"
              style={{ color: '#b6bccb' }}
            >
              ⎋
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
