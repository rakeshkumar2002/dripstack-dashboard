'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, useApiBase } from '@/app/lib/api';
import { Shell } from '@/components/Shell';
import { Badge, Card, PageHeader, fmtDuration, fmtTime } from '@/components/ui';

interface RunDetail {
  run: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    resolutionTimeSeconds: number | null;
    temporalWorkflowId: string;
    sequence: { name: string };
    contact: { email: string; name: string | null };
    event: { type: string; payload: unknown } | null;
    messageLogs: { id: string; stepId: string; channel: string; status: string; createdAt: string; error: string | null; renderedHtml: string | null }[];
    actionClicks: { id: string; action: string; clickedAt: string }[];
  };
}

export default function RunDetailPage() {
  const apiBase = useApiBase();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['run', id],
    queryFn: () => api<RunDetail>(`/api/v1/runs/${id}`),
    refetchInterval: 4000,
  });

  if (isLoading) return <Shell><p className="text-neutral-400">Loading…</p></Shell>;
  if (!data) return <Shell><p className="text-neutral-400">Not found.</p></Shell>;
  const r = data.run;

  type Item = { ts: string; kind: 'message' | 'click'; label: string; status?: string; id: string; html?: string | null };
  const timeline: Item[] = [
    ...r.messageLogs.map((m) => ({ ts: m.createdAt, kind: 'message' as const, label: `${m.channel} · ${m.stepId}`, status: m.status, id: m.id, html: m.renderedHtml })),
    ...r.actionClicks.map((c) => ({ ts: c.clickedAt, kind: 'click' as const, label: `clicked "${c.action}"`, status: c.action, id: c.id })),
  ].sort((a, b) => +new Date(a.ts) - +new Date(b.ts));

  return (
    <Shell>
      <Link href="/runs" className="text-sm text-blue-600 hover:underline">← Runs</Link>
      <PageHeader title={r.sequence.name} subtitle={`${r.contact.email} · workflow ${r.temporalWorkflowId}`} />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card title="Status"><Badge>{r.status}</Badge></Card>
        <Card title="Started"><span className="text-sm">{fmtTime(r.startedAt)}</span></Card>
        <Card title="Ended"><span className="text-sm">{fmtTime(r.endedAt)}</span></Card>
        <Card title="Resolution"><span className="text-sm">{fmtDuration(r.resolutionTimeSeconds)}</span></Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-neutral-500">Timeline</h2>
      <div className="space-y-2">
        {timeline.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <span className={`h-2 w-2 shrink-0 rounded-full ${t.kind === 'click' ? 'bg-green-500' : 'bg-blue-500'}`} />
            <span className="w-40 shrink-0 text-xs text-neutral-500">{fmtTime(t.ts)}</span>
            <span className="flex-1 font-mono text-xs">{t.label}</span>
            {t.status ? <Badge>{t.status}</Badge> : null}
            {t.kind === 'message' && t.html ? (
              <a href={`${apiBase}/dev/emails/${t.id}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">view email →</a>
            ) : null}
          </div>
        ))}
        {timeline.length === 0 ? <p className="text-sm text-neutral-400">No activity yet.</p> : null}
      </div>
    </Shell>
  );
}
