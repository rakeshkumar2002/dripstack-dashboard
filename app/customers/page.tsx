'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C, fmtTime } from '@/components/ui';

interface Customer {
  id: string;
  name: string;
  emailProvider: string;
  fromAddress: string | null;
  counts: { users: number; technicians: number; runs: number };
  createdAt: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const { can, isPlatform, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', adminEmail: '', adminPassword: '' });
  const canWrite = can('customers.write');

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api<{ customers: Customer[] }>('/api/v1/platform/customers'),
    enabled: isPlatform,
  });

  if (!pLoading && !isPlatform) router.replace('/runs');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['customers'] });
  const create = useMutation({
    mutationFn: () => api('/api/v1/platform/customers', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      setCreated(`${form.adminEmail} can now sign in`);
      setForm({ name: '', adminEmail: '', adminPassword: '' });
      setAdding(false);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/platform/customers/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const customers = data?.customers ?? [];

  return (
    <Shell>
      <ScreenHeader
        title="Customers"
        subtitle="Every customer organization on DripStack — and their admin credentials"
        right={
          canWrite ? (
            <button
              onClick={() => setAdding((a) => !a)}
              className="flex h-[38px] items-center rounded-[10px] px-4 text-[13.5px] font-semibold text-white"
              style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.28)' }}
            >
              + New customer
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-auto px-[26px] pb-[90px] pt-6">
        {created ? (
          <div className="mb-4 rounded-[12px] p-[12px_14px] text-[13px]" style={{ border: `1px solid ${C.greenBorder}`, background: C.greenTint, color: '#13603e' }}>
            ✓ Customer created — {created}.
          </div>
        ) : null}

        {adding ? (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[14px] border bg-white p-4" style={{ borderColor: C.border }}>
            <L label="ORGANIZATION NAME">
              <input className="h-[38px] w-[220px] rounded-[10px] border bg-white px-3 text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Buildings" />
            </L>
            <L label="ADMIN EMAIL">
              <input className="h-[38px] w-[230px] rounded-[10px] border bg-white px-3 font-mono text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@acme.com" />
            </L>
            <L label="ADMIN PASSWORD">
              <input className="h-[38px] w-[170px] rounded-[10px] border bg-white px-3 font-mono text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="min 8 chars" />
            </L>
            <button disabled={!form.name || !form.adminEmail || form.adminPassword.length < 8 || create.isPending} onClick={() => create.mutate()} className="h-[38px] rounded-[10px] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>
              {create.isPending ? 'Creating…' : 'Create + issue credentials'}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <div className="font-mono text-[13px]" style={{ color: C.fainter }}>Loading…</div>
          ) : customers.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 rounded-[14px] border bg-white p-[16px_18px]" style={{ borderColor: C.border, boxShadow: '0 1px 2px rgba(16,18,26,.04)' }}>
              <div className="flex items-start justify-between">
                <div className="font-display text-[16.5px] font-semibold">{c.name}</div>
                {canWrite ? (
                  <button onClick={() => remove.mutate(c.id)} className="text-[12px] font-medium" style={{ color: C.redInk }}>Delete</button>
                ) : null}
              </div>
              <div className="flex gap-5">
                <Metric n={c.counts.users} label="USERS" />
                <Metric n={c.counts.technicians} label="TECHNICIANS" />
                <Metric n={c.counts.runs} label="RUNS" />
              </div>
              <div className="mt-1 flex items-center gap-2 border-t pt-3 font-mono text-[11px]" style={{ borderColor: '#f0f1f5', color: C.faint }}>
                <span
                  className="rounded-[6px] px-2 py-0.5"
                  style={{ background: C.blueTint, color: C.blue }}
                >
                  {c.emailProvider}
                </span>
                <span className="ml-auto">{fmtTime(c.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Metric({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <div className="font-display text-[22px] font-semibold tracking-[-.5px]">{n}</div>
      <div className="font-mono text-[10px] tracking-[.4px]" style={{ color: C.fainter }}>{label}</div>
    </div>
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
