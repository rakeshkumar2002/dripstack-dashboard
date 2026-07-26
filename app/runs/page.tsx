'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, useApiBase } from '@/app/lib/api';
import { Shell } from '@/components/Shell';
import {
  C,
  COLUMNS,
  columnOf,
  fmtAge,
  fmtDuration,
  progressDots,
  SEV,
  severityOf,
  statusColor,
  statusLabel,
  type ColumnKey,
} from '@/components/ui';

interface RunRow {
  id: string;
  status: string;
  currentStep: number;
  startedAt: string;
  resolutionTimeSeconds: number | null;
  sequence: { name: string };
  contact: { email: string; name: string | null };
  _count: { messageLogs: number; actionClicks: number };
}

interface RunDetail {
  run: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    resolutionTimeSeconds: number | null;
    temporalWorkflowId: string;
    sequence: { name: string; steps: unknown };
    contact: { email: string; name: string | null };
    event: { type: string; payload: Record<string, unknown> } | null;
    messageLogs: { id: string; stepId: string; channel: string; status: string; createdAt: string }[];
    actionClicks: { id: string; action: string; clickedAt: string }[];
  };
}

const headerBtn =
  'flex h-[38px] items-center gap-2 rounded-[10px] border px-[14px] text-[13.5px] font-medium';

export default function PipelinePage() {
  const [view, setView] = useState<'board' | 'list'>('board');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['runs'],
    queryFn: () => api<{ runs: RunRow[] }>('/api/v1/runs'),
    refetchInterval: 4000,
  });

  const runs = data?.runs ?? [];
  const active = runs.filter((r) => r.status === 'running').length;
  const critical = runs.filter((r) => severityOf(r.status) === 'critical').length;
  const escalated = runs.filter((r) => r.status === 'escalated' || r.status === 'failed').length;
  const resolved = runs.filter((r) => r.status === 'resolved' || r.status === 'completed').length;
  const grouped: Record<ColumnKey, RunRow[]> = { new: [], step1: [], step2: [], escalated: [], resolved: [] };
  for (const r of runs) grouped[columnOf(r.status, r.currentStep)].push(r);

  const stats: { label: string; value: number; color: string; tint: string }[] = [
    { label: 'Active', value: active, color: C.blue, tint: C.blueTint },
    { label: 'Critical', value: critical, color: C.red, tint: C.redTint },
    { label: 'Escalated', value: escalated, color: C.amber, tint: C.amberTint },
    { label: 'Resolved', value: resolved, color: C.green, tint: C.greenTint },
  ];

  return (
    <Shell>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* HEADER */}
        <div
          className="flex items-center gap-5 bg-white px-[26px] py-[18px]"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-[11px]">
              <h1 className="m-0 font-display text-[23px] font-semibold tracking-[-.5px]">Incident pipeline</h1>
              {critical > 0 ? (
                <span
                  className="flex items-center gap-1.5 rounded-[20px] px-2.5 py-0.5 text-[12px] font-semibold"
                  style={{ background: C.redTint, border: `1px solid ${C.redBorder}`, color: C.redInk }}
                >
                  <span
                    className="h-[7px] w-[7px] rounded-full"
                    style={{ background: C.red, boxShadow: '0 0 0 3px #f8d3d5' }}
                  />
                  {critical} critical
                </span>
              ) : null}
            </div>
            <div className="mt-[3px] font-mono text-[13px]" style={{ color: C.faint }}>
              {active} active runs · live
            </div>
          </div>

          <div className="ml-auto flex items-center gap-[10px]">
            <div className="flex gap-[3px] rounded-[10px] p-[3px]" style={{ background: '#f2f4fa', border: `1px solid ${C.border}` }}>
              {(['board', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[13px] font-semibold"
                  style={{ background: view === v ? '#fff' : 'transparent', color: view === v ? C.ink : C.muted }}
                >
                  {v === 'board' ? '▦ Board' : '☰ List'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={headerBtn}
              style={{ borderColor: C.borderStrong, background: '#fff', color: C.ink }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="#565d6b" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {/* FILTERS */}
        {filtersOpen ? (
          <div
            className="flex flex-wrap items-center gap-[9px] px-[26px] py-[13px]"
            style={{ borderBottom: `1px solid #eef0f4`, background: '#fbfcfe' }}
          >
            <span className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
              FILTER
            </span>
            {['Severity: critical', 'Technician ▾', 'Sequence step ▾', 'Error code ▾'].map((f, i) => {
              const on = i === 0;
              return (
                <span
                  key={f}
                  className="flex items-center gap-1.5 rounded-[9px] px-[11px] py-1.5 text-[13px]"
                  style={{
                    background: on ? C.blueTint : '#fff',
                    border: `1px solid ${on ? C.blueBorder : C.borderStrong}`,
                    color: on ? C.blue : C.ink,
                    fontWeight: on ? 500 : 400,
                  }}
                >
                  {f}
                  {on ? <span style={{ opacity: 0.6 }}>✕</span> : null}
                </span>
              );
            })}
            <span className="ml-1.5 cursor-pointer text-[13px] font-medium" style={{ color: C.blue }}>
              Clear all
            </span>
          </div>
        ) : null}

        {/* KPI STRIP */}
        <div className="grid gap-3 px-[26px] pt-[18px]" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))' }}>
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-[13px] border bg-white px-4 py-[13px]"
              style={{ borderColor: C.border, boxShadow: '0 1px 2px rgba(16,18,26,.03)' }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: s.tint }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              </span>
              <div className="leading-none">
                <div className="font-display text-[22px] font-semibold tracking-[-.5px] tabular-nums">{s.value}</div>
                <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[.4px]" style={{ color: C.faint }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto px-[26px] pb-[90px] pt-[18px]">
          {isLoading ? (
            <div className="font-mono text-[13px]" style={{ color: C.fainter }}>
              Loading…
            </div>
          ) : view === 'board' ? (
            // Responsive grid: all five lanes share the available width — no horizontal scroll.
            <div className="grid items-start gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0,1fr))' }}>
              {COLUMNS.map((col, ci) => (
                <div
                  key={col.key}
                  className="flex min-w-0 flex-col rounded-[14px]"
                  style={{
                    background: '#fbfcfe',
                    border: `1px solid ${C.border}`,
                    borderTop: `2.5px solid ${col.accent}`,
                    animation: `ds-col-in .45s ease ${ci * 0.06}s both`,
                  }}
                >
                  <div className="flex items-center gap-[8px] px-3 py-[11px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[.3px]" style={{ color: C.muted }}>
                      {col.label}
                    </span>
                    <span
                      className="ml-auto rounded-[6px] px-[7px] py-px font-mono text-[11px] font-semibold"
                      style={{ color: col.accent, background: '#fff', border: `1px solid ${C.border}` }}
                    >
                      {grouped[col.key].length}
                    </span>
                  </div>
                  <div className="flex min-h-[80px] flex-col gap-[10px] p-2.5">
                    {grouped[col.key].length ? (
                      grouped[col.key].map((r) => <BoardCard key={r.id} run={r} onOpen={() => setOpenId(r.id)} />)
                    ) : (
                      <div className="flex flex-1 items-center justify-center py-5 font-mono text-[11px]" style={{ color: '#c2c8d4' }}>
                        empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ListView runs={runs} onOpen={setOpenId} />
          )}
        </div>
      </div>

      {openId ? <Drawer runId={openId} onClose={() => setOpenId(null)} /> : null}
    </Shell>
  );
}

function BoardCard({ run, onOpen }: { run: RunRow; onOpen: () => void }) {
  const sev = SEV[severityOf(run.status)];
  const dim = run.status === 'resolved' || run.status === 'completed' ? 0.72 : 1;
  const status =
    run.status === 'resolved' && run.resolutionTimeSeconds != null
      ? `Self-resolved · ${fmtDuration(run.resolutionTimeSeconds)}`
      : statusLabel(run.status);
  return (
    <div
      onClick={onOpen}
      className="relative cursor-pointer overflow-hidden rounded-[12px] border bg-white p-[12px_13px_12px_15px] transition-all"
      style={{ borderColor: C.border, boxShadow: '0 1px 2px rgba(16,18,26,.03)', opacity: dim }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 22px rgba(16,18,26,.10)';
        e.currentTarget.style.borderColor = '#cdd5e4';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(16,18,26,.03)';
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* severity accent bar */}
      <span className="absolute bottom-0 left-0 top-0 w-[3.5px]" style={{ background: sev.color }} />
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-.1px]">
          {run.contact.name ?? run.contact.email}
        </span>
        <span className="shrink-0 font-mono text-[10.5px]" style={{ color: C.fainter }}>
          {fmtAge(run.startedAt)}
        </span>
      </div>
      <div className="mt-0.5 truncate text-[12px]" style={{ color: C.faint }}>
        {run.contact.email}
      </div>
      <div
        className="mt-[10px] block max-w-full truncate rounded-[7px] px-[9px] py-1 font-mono text-[11px] font-medium"
        style={{ color: sev.color, background: sev.tint }}
      >
        {run.sequence.name}
      </div>
      <div className="mt-[11px] flex items-center gap-2 border-t pt-[10px]" style={{ borderColor: '#f0f1f5' }}>
        <div className="flex gap-1">
          {progressDots(run.currentStep).map((d, i) => (
            <span key={i} className="h-1 w-[13px] rounded-[3px]" style={{ background: d.color }} />
          ))}
        </div>
        <span className="ml-auto truncate text-[11px] font-medium" style={{ color: statusColor(run.status) }}>
          {status}
        </span>
      </div>
    </div>
  );
}

function ListView({ runs, onOpen }: { runs: RunRow[]; onOpen: (id: string) => void }) {
  const cols = '12px minmax(0,1.6fr) minmax(0,1.4fr) minmax(0,0.85fr) 72px minmax(0,1.05fr) 48px 14px';
  return (
    <div className="flex max-w-[1000px] flex-col">
      <div
        className="grid items-center px-3 pb-[10px] font-mono text-[10px] tracking-[.4px]"
        style={{ gridTemplateColumns: cols, gap: '0 14px', color: C.fainter, borderBottom: `1px solid ${C.border}` }}
      >
        <span />
        <span>TECHNICIAN</span>
        <span>SEQUENCE</span>
        <span>STAGE</span>
        <span>PROGRESS</span>
        <span>STATUS</span>
        <span>AGE</span>
        <span />
      </div>
      {runs.map((r) => {
        const sev = SEV[severityOf(r.status)];
        const col = COLUMNS.find((c) => c.key === columnOf(r.status, r.currentStep))!;
        return (
          <div
            key={r.id}
            onClick={() => onOpen(r.id)}
            className="grid cursor-pointer items-center rounded-[10px] px-3 py-[13px]"
            style={{ gridTemplateColumns: cols, gap: '0 14px', borderBottom: `1px solid #f0f1f5` }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f8fb')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="h-[9px] w-[9px] rounded-full" style={{ background: sev.color }} />
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold">{r.contact.name ?? r.contact.email}</div>
              <div className="text-[12px]" style={{ color: C.faint }}>
                {r.contact.email}
              </div>
            </div>
            <div className="min-w-0">
              <span
                className="inline-flex max-w-full truncate rounded-[7px] px-2 py-[3px] font-mono text-[11.5px] font-medium"
                style={{ color: sev.color, background: sev.tint }}
              >
                {r.sequence.name}
              </span>
            </div>
            <span className="truncate font-mono text-[11px] font-semibold" style={{ color: col.accent }}>
              {col.label.split(' · ')[0]}
            </span>
            <div className="flex gap-1">
              {progressDots(r.currentStep).map((d, i) => (
                <span key={i} className="h-1 w-[14px] rounded-[3px]" style={{ background: d.color }} />
              ))}
            </div>
            <span className="truncate text-[12.5px] font-medium" style={{ color: statusColor(r.status) }}>
              {statusLabel(r.status)}
            </span>
            <span className="font-mono text-[11.5px]" style={{ color: C.fainter }}>
              {fmtAge(r.startedAt)}
            </span>
            <span className="text-[16px]" style={{ color: '#c2c8d4' }}>
              ›
            </span>
          </div>
        );
      })}
    </div>
  );
}

function colorizeJson(value: unknown): string {
  const json = JSON.stringify(value, null, 2) ?? 'null';
  const esc = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let color = '#f4d58a'; // number
      if (/^"/.test(match)) {
        color = /:$/.test(match) ? '#f1a6a6' : '#a9d3a0'; // key : string
      } else if (/true|false|null/.test(match)) {
        color = '#f4d58a';
      }
      return `<span style="color:${color}">${match}</span>`;
    },
  );
}

function Drawer({ runId, onClose }: { runId: string; onClose: () => void }) {
  const apiBase = useApiBase();
  const { data } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api<RunDetail>(`/api/v1/runs/${runId}`),
    refetchInterval: 4000,
  });
  const r = data?.run;
  const sev = r ? SEV[severityOf(r.status)] : SEV.info;
  const payload = r?.event?.payload ?? {};
  const errObj = (payload as Record<string, unknown>).error ?? payload;
  const explanation =
    ((errObj as Record<string, unknown>)?.message as string) ??
    (payload as Record<string, unknown>)?.message ??
    'The full AI explanation was delivered in the technician email.';
  const rawLog = (payload as Record<string, unknown>).rawLog;
  const logLines = typeof rawLog === 'string' ? rawLog.split('\n').slice(0, 3) : [];

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(17,19,26,.34)', backdropFilter: 'blur(2px)', animation: 'ds-bg-in .2s ease both' }}
      />
      <div
        className="fixed bottom-0 right-0 top-0 z-[41] flex w-[452px] max-w-[94vw] flex-col bg-white"
        style={{
          borderLeft: `1px solid ${C.border}`,
          boxShadow: '-24px 0 60px rgba(16,18,26,.18)',
          animation: 'ds-drawer-in .26s cubic-bezier(.2,.8,.2,1) both',
        }}
      >
        {/* header */}
        <div className="flex items-start gap-3 px-[22px] py-5" style={{ borderBottom: `1px solid #eef0f4` }}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-[9px]">
              <span
                className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-[3px] font-mono text-[11px] font-semibold"
                style={{ color: sev.color, background: sev.tint }}
              >
                {sev.label}
              </span>
              <span className="font-mono text-[11.5px]" style={{ color: C.fainter }}>
                run #{runId.slice(-6)}
              </span>
            </div>
            <h2 className="mb-0.5 mt-[9px] font-display text-[20px] font-semibold tracking-[-.3px]">
              {r?.sequence.name ?? 'Incident'}
            </h2>
            <div className="text-[13px]" style={{ color: C.faint }}>
              {r ? `${r.contact.name ?? r.contact.email} · ${r.contact.email}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border bg-white text-[15px]"
            style={{ borderColor: C.border, color: C.faint }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-[18px] overflow-auto px-[22px] py-5">
          {/* AI explanation */}
          <div
            className="relative overflow-hidden rounded-[13px] p-[15px_16px]"
            style={{ border: `1px solid #d7e1fb`, background: 'linear-gradient(180deg,#f5f8ff,#eef3ff)' }}
          >
            <div className="absolute bottom-0 left-0 top-0 w-1" style={{ background: C.blue }} />
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] tracking-[.5px]" style={{ color: C.blue }}>
              ✦ AI EXPLANATION
            </div>
            <div className="text-[15px] leading-[1.5]" style={{ color: '#1b2336' }}>
              {String(explanation)}
            </div>
          </div>

          {/* raw response */}
          <div>
            <div className="mb-2 font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
              RAW RESPONSE
            </div>
            <div
              className="overflow-auto rounded-[11px] p-[14px_15px] font-mono text-[12.5px] leading-[1.75]"
              style={{ background: '#12141b', color: '#e7eaf2' }}
              dangerouslySetInnerHTML={{ __html: colorizeJson(errObj) }}
            />
          </div>

          {/* log */}
          {logLines.length ? (
            <div className="rounded-[11px] p-[13px_14px]" style={{ border: `1px solid ${C.border}`, background: '#fafbfc' }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
                  RELEVANT LOG
                </span>
              </div>
              <div className="font-mono text-[11.5px] leading-[1.85]" style={{ color: C.muted }}>
                {logLines.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          ) : null}

          {/* drip timeline */}
          <div>
            <div className="mb-[10px] font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
              DRIP SEQUENCE · LIVE
            </div>
            <div className="flex flex-col">
              {(r?.messageLogs ?? []).map((m, i) => (
                <div key={m.id} className="flex items-center gap-[11px] py-[7px]">
                  <span
                    className="h-[11px] w-[11px] rounded-full"
                    style={{ background: C.blue, boxShadow: '0 0 0 3px #dbe4fb' }}
                  />
                  <span className="text-[13.5px] font-medium">
                    Step {i + 1} · {m.channel} email
                  </span>
                  <span className="ml-auto font-mono text-[11px]" style={{ color: C.faint }}>
                    {m.status}
                  </span>
                </div>
              ))}
              {(r?.actionClicks ?? []).map((a) => (
                <div key={a.id} className="flex items-center gap-[11px] py-[7px]">
                  <span className="h-[11px] w-[11px] rounded-full" style={{ background: C.green, boxShadow: '0 0 0 3px #cdeedd' }} />
                  <span className="text-[13.5px] font-medium">Technician clicked “{a.action}”</span>
                  <span className="ml-auto font-mono text-[11px]" style={{ color: C.faint }}>
                    {fmtAge(a.clickedAt)}
                  </span>
                </div>
              ))}
              {!r?.messageLogs?.length && !r?.actionClicks?.length ? (
                <div className="text-[13px]" style={{ color: C.fainter }}>
                  No activity yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* footer actions */}
        <div className="flex gap-[10px] bg-white px-[22px] py-[15px]" style={{ borderTop: `1px solid #eef0f4` }}>
          {r?.messageLogs?.length ? (
            <a
              href={`${apiBase}/dev/emails/${r.messageLogs[0].id}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 flex-1 items-center justify-center rounded-[11px] text-[14.5px] font-semibold text-white"
              style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.26)' }}
            >
              View email
            </a>
          ) : null}
          <button
            onClick={onClose}
            className="flex h-11 flex-1 items-center justify-center rounded-[11px] border bg-white text-[14.5px] font-semibold"
            style={{ borderColor: C.borderStrong, color: C.ink }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
