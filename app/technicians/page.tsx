'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C, fmtTime } from '@/components/ui';

interface Technician {
  id: string;
  email: string;
  name: string | null;
  title: string | null;
  active: boolean;
  createdAt: string;
}

const input =
  'h-[38px] rounded-[10px] border bg-white px-3 font-mono text-[13px] outline-none';

export default function TechniciansPage() {
  const router = useRouter();
  const { can, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', title: '' });
  const canWrite = can('technicians.write');

  const { data, isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api<{ technicians: Technician[] }>('/api/v1/technicians'),
  });

  if (!pLoading && !can('technicians.read')) {
    router.replace('/runs');
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['technicians'] });

  const create = useMutation({
    mutationFn: () => api('/api/v1/technicians', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      setForm({ email: '', name: '', title: '' });
      setAdding(false);
      invalidate();
    },
  });
  const patch = useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) =>
      api(`/api/v1/technicians/${v.id}`, { method: 'PATCH', body: JSON.stringify(v.body) }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/technicians/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const techs = data?.technicians ?? [];

  return (
    <Shell>
      <ScreenHeader
        title="Technicians"
        subtitle="The people who receive smart emails — configure their addresses"
        right={
          canWrite ? (
            <button
              onClick={() => setAdding((a) => !a)}
              className="flex h-[38px] items-center rounded-[10px] px-4 text-[13.5px] font-semibold text-white"
              style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.28)' }}
            >
              + Add technician
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-auto px-[26px] pb-[90px] pt-6">
        {adding ? (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[14px] border bg-white p-4" style={{ borderColor: C.border }}>
            <Field label="EMAIL">
              <input
                className={input}
                style={{ borderColor: C.borderStrong, width: 260 }}
                placeholder="technician@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="NAME">
              <input
                className={input}
                style={{ borderColor: C.borderStrong, width: 180 }}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="TITLE">
              <input
                className={input}
                style={{ borderColor: C.borderStrong, width: 220 }}
                placeholder="Field Technician"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <button
              disabled={!form.email || create.isPending}
              onClick={() => create.mutate()}
              className="h-[38px] rounded-[10px] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50"
              style={{ background: C.blue }}
            >
              {create.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: C.border }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#fafbfc' }}>
                {['Email', 'Name', 'Title', 'Status', 'Added', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] font-medium tracking-[.4px]" style={{ color: C.fainter }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: C.fainter }}>Loading…</td></tr>
              ) : techs.length ? (
                techs.map((t) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid #f0f1f5` }}>
                    <td className="px-4 py-3 font-mono text-[13px]">{t.email}</td>
                    <td className="px-4 py-3">{t.name ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: C.muted }}>{t.title ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium"
                        style={t.active ? { background: C.greenTint, color: C.green } : { background: '#eef0f4', color: C.faint }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.active ? C.green : C.fainter }} />
                        {t.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: C.faint }}>{fmtTime(t.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {canWrite ? (
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => patch.mutate({ id: t.id, body: { active: !t.active } })}
                            className="text-[12.5px] font-medium"
                            style={{ color: C.blue }}
                          >
                            {t.active ? 'Disable' : 'Enable'}
                          </button>
                          <button onClick={() => remove.mutate(t.id)} className="text-[12.5px] font-medium" style={{ color: C.redInk }}>
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: C.fainter }}>No technicians yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
        {label}
      </span>
      {children}
    </div>
  );
}
