'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C, fmtTime } from '@/components/ui';

interface OrgUser {
  id: string;
  email: string;
  isActive: boolean;
  role: { slug: string; name: string; scope: string } | null;
  createdAt: string;
}

const ROLES = [
  { slug: 'customer-admin', name: 'Customer Admin' },
  { slug: 'customer-member', name: 'Customer Member' },
];

export default function TeamPage() {
  const router = useRouter();
  const { principal, can, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', roleSlug: 'customer-member' });
  const canWrite = can('users.write');

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: () => api<{ users: OrgUser[] }>('/api/v1/users'),
  });

  if (!pLoading && !can('users.read')) router.replace('/runs');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['team'] });
  const onErr = (e: unknown) => setErr(e instanceof ApiError ? e.message : 'Something went wrong');
  const create = useMutation({
    mutationFn: () => api('/api/v1/users', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm({ email: '', password: '', roleSlug: 'customer-member' });
      setAdding(false);
      setErr(null);
      invalidate();
    },
    onError: onErr,
  });
  const patchRole = useMutation({
    mutationFn: (v: { id: string; roleSlug: string }) =>
      api(`/api/v1/users/${v.id}`, { method: 'PATCH', body: JSON.stringify({ roleSlug: v.roleSlug }) }),
    onSuccess: () => { setErr(null); invalidate(); },
    onError: onErr,
  });
  const setActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) =>
      api(`/api/v1/users/${v.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: v.isActive }) }),
    onSuccess: () => { setErr(null); invalidate(); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => { setErr(null); invalidate(); },
    onError: onErr,
  });

  const users = data?.users ?? [];

  return (
    <Shell>
      <ScreenHeader
        title="Team"
        subtitle="Members of your workspace and their access level"
        right={
          canWrite ? (
            <button
              onClick={() => setAdding((a) => !a)}
              className="flex h-[38px] items-center rounded-[10px] px-4 text-[13.5px] font-semibold text-white"
              style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.28)' }}
            >
              + Invite user
            </button>
          ) : null
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
            <L label="EMAIL">
              <input className="h-[38px] w-[240px] rounded-[10px] border bg-white px-3 font-mono text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@company.com" />
            </L>
            <L label="TEMP PASSWORD">
              <input className="h-[38px] w-[180px] rounded-[10px] border bg-white px-3 font-mono text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min 8 chars" />
            </L>
            <L label="ROLE">
              <select className="h-[38px] rounded-[10px] border bg-white px-3 text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.roleSlug} onChange={(e) => setForm({ ...form, roleSlug: e.target.value })}>
                {ROLES.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
              </select>
            </L>
            <button disabled={!form.email || form.password.length < 8 || create.isPending} onClick={() => create.mutate()} className="h-[38px] rounded-[10px] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>
              {create.isPending ? 'Saving…' : 'Create'}
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: C.border }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#fafbfc' }}>
                {['Email', 'Role', 'Status', 'Added', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-medium tracking-[.4px]" style={{ color: C.fainter }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: C.fainter }}>Loading…</td></tr>
              ) : users.map((u) => {
                const isSelf = u.id === principal?.userId;
                return (
                <tr key={u.id} style={{ borderBottom: `1px solid #f0f1f5`, opacity: u.isActive ? 1 : 0.55 }}>
                  <td className="px-4 py-3 font-mono text-[13px]">
                    {u.email}
                    {isSelf ? <span className="ml-2 font-mono text-[10px]" style={{ color: C.fainter }}>you</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    {canWrite && !isSelf ? (
                      <select
                        value={u.role?.slug ?? 'customer-member'}
                        onChange={(e) => patchRole.mutate({ id: u.id, roleSlug: e.target.value })}
                        className="h-[30px] rounded-[8px] border bg-white px-2 text-[12.5px]"
                        style={{ borderColor: C.borderStrong }}
                      >
                        {ROLES.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                      </select>
                    ) : (
                      <span className="font-mono text-[12.5px]" style={{ color: C.muted }}>{u.role?.name ?? '—'}</span>
                    )}
                  </td>
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
