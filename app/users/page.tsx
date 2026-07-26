'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C, fmtTime } from '@/components/ui';

interface PUser {
  id: string;
  email: string;
  organizationId: string;
  organizationName: string | null;
  isPlatformStaff: boolean;
  isActive: boolean;
  role: { slug: string; name: string; scope: string } | null;
  createdAt: string;
}
interface Customer { id: string; name: string }
interface Role { slug: string; name: string; scope: string }

export default function PlatformUsersPage() {
  const router = useRouter();
  const { principal, can, isPlatform, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const [orgFilter, setOrgFilter] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ organizationId: '', email: '', password: '', roleSlug: 'customer-admin' });
  const canWrite = can('users.write');

  if (!pLoading && !isPlatform) router.replace('/runs');

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api<{ customers: Customer[] }>('/api/v1/platform/customers'),
    enabled: isPlatform,
  });
  const { data: rolesData } = useQuery({
    queryKey: ['platform-roles'],
    queryFn: () => api<{ roles: Role[] }>('/api/v1/platform/roles'),
    enabled: isPlatform,
  });
  const { data, isLoading } = useQuery({
    queryKey: ['platform-users', orgFilter],
    queryFn: () =>
      api<{ users: PUser[] }>(`/api/v1/platform/users${orgFilter ? `?organizationId=${orgFilter}` : ''}`),
    enabled: isPlatform,
  });

  const customers = customersData?.customers ?? [];
  const roles = rolesData?.roles ?? [];
  const users = data?.users ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['platform-users'] });
  const onErr = (e: unknown) => setErr(e instanceof ApiError ? e.message : 'Something went wrong');
  const create = useMutation({
    mutationFn: () => api('/api/v1/platform/users', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm({ organizationId: '', email: '', password: '', roleSlug: 'customer-admin' });
      setAdding(false);
      setErr(null);
      invalidate();
    },
    onError: onErr,
  });
  const setActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) =>
      api(`/api/v1/platform/users/${v.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: v.isActive }) }),
    onSuccess: () => { setErr(null); invalidate(); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/platform/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setErr(null); invalidate(); },
    onError: onErr,
  });

  return (
    <Shell>
      <ScreenHeader
        title="Users"
        subtitle="Every user across all customer organizations"
        right={
          <div className="flex items-center gap-2.5">
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="h-[38px] rounded-[10px] border bg-white px-3 text-[13px] outline-none"
              style={{ borderColor: C.borderStrong }}
            >
              <option value="">All organizations</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {canWrite ? (
              <button onClick={() => setAdding((a) => !a)} className="flex h-[38px] items-center rounded-[10px] px-4 text-[13.5px] font-semibold text-white" style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.28)' }}>
                + New user
              </button>
            ) : null}
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-[26px] pb-[90px] pt-6">
        {err ? (
          <div className="mb-4 rounded-[12px] p-[10px_14px] text-[13px]" style={{ border: `1px solid ${C.redBorder}`, background: C.redTint, color: C.redInk }}>
            {err}
          </div>
        ) : null}

        {adding ? (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[14px] border bg-white p-4" style={{ borderColor: C.border }}>
            <L label="ORGANIZATION">
              <select className="h-[38px] w-[200px] rounded-[10px] border bg-white px-3 text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })}>
                <option value="">Select…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </L>
            <L label="EMAIL">
              <input className="h-[38px] w-[220px] rounded-[10px] border bg-white px-3 font-mono text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </L>
            <L label="PASSWORD">
              <input className="h-[38px] w-[150px] rounded-[10px] border bg-white px-3 font-mono text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 8" />
            </L>
            <L label="ROLE">
              <select className="h-[38px] rounded-[10px] border bg-white px-3 text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.roleSlug} onChange={(e) => setForm({ ...form, roleSlug: e.target.value })}>
                {roles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
              </select>
            </L>
            <button disabled={!form.organizationId || !form.email || form.password.length < 8 || create.isPending} onClick={() => create.mutate()} className="h-[38px] rounded-[10px] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: C.border }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#fafbfc' }}>
                {['Email', 'Organization', 'Role', 'Status', 'Added', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-medium tracking-[.4px]" style={{ color: C.fainter }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: C.fainter }}>Loading…</td></tr>
              ) : users.map((u) => {
                const isSelf = u.id === principal?.userId;
                return (
                <tr key={u.id} style={{ borderBottom: `1px solid #f0f1f5`, opacity: u.isActive ? 1 : 0.55 }}>
                  <td className="px-4 py-3 font-mono text-[13px]">
                    {u.email}
                    {u.isPlatformStaff ? (
                      <span className="ml-2 rounded-[5px] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold" style={{ background: '#1b2540', color: '#fff' }}>PLATFORM</span>
                    ) : null}
                    {isSelf ? <span className="ml-2 font-mono text-[10px]" style={{ color: C.fainter }}>you</span> : null}
                  </td>
                  <td className="px-4 py-3" style={{ color: C.muted }}>{u.organizationName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-[12.5px]" style={{ color: C.muted }}>{u.role?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] font-semibold" style={u.isActive ? { background: C.greenTint, color: '#13603e' } : { background: C.redTint, color: C.redInk }}>
                      {u.isActive ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: C.faint }}>{fmtTime(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && !isSelf ? (
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => setActive.mutate({ id: u.id, isActive: !u.isActive })} className="text-[12.5px] font-medium" style={{ color: C.blue }}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => { if (confirm(`Permanently delete ${u.email}?`)) remove.mutate(u.id); }} className="text-[12.5px] font-medium" style={{ color: C.redInk }}>Delete</button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>{label}</span>
      {children}
    </div>
  );
}
