'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C } from '@/components/ui';

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorLabel: string | null;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  'auth.login': C.green,
  'auth.sso_login': C.green,
  'auth.login_failed': C.redInk,
  'user.delete': C.redInk,
};

export default function SecurityPage() {
  const router = useRouter();
  const { can, isLoading: pLoading } = usePrincipal();

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api<{ auditLogs: AuditEntry[] }>('/api/v1/audit-logs?limit=200'),
  });

  if (!pLoading && !can('users.read')) router.replace('/runs');

  const rows = data?.auditLogs ?? [];

  return (
    <Shell>
      <ScreenHeader title="Audit log" subtitle="Security-relevant actions across your workspace" />

      <div className="flex-1 overflow-auto px-[26px] pb-[90px] pt-6">
        {isLoading ? (
          <div className="font-mono text-[13px]" style={{ color: C.fainter }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="font-mono text-[13px]" style={{ color: C.fainter }}>No audit entries yet.</div>
        ) : (
          <div className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: C.border }}>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ background: '#f7f8fb' }}>
                  {['When', 'Action', 'Actor', 'Target', 'Detail'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-mono text-[10px] tracking-[.5px]" style={{ color: C.faint, borderBottom: `1px solid ${C.border}` }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[12px]" style={{ color: C.muted }}>
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[12px] font-semibold" style={{ color: ACTION_COLOR[r.action] ?? C.ink }}>
                        {r.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[13px]" style={{ color: C.ink }}>
                      {r.actorLabel ?? r.actorId ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11.5px]" style={{ color: C.faint }}>
                      {r.target ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11.5px]" style={{ color: C.faint }}>
                      {Object.keys(r.meta ?? {}).length ? JSON.stringify(r.meta) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
