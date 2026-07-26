'use client';

import type { ReactNode } from 'react';

// ── Design tokens (mirror globals.css :root) ─────────────────────────────────
export const C = {
  canvas: '#f4f5f8',
  surface: '#ffffff',
  border: '#e7e9f0',
  borderStrong: '#e2e5ec',
  ink: '#11131a',
  muted: '#5b616e',
  faint: '#8b909c',
  fainter: '#a3a8b4',
  blue: '#2f5fd0',
  blueHover: '#2750b8',
  blueTint: '#eef3ff',
  blueBorder: '#c9d8fb',
  red: '#e5484d',
  redInk: '#cf2f37',
  redTint: '#fdeced',
  redBorder: '#f6cdcf',
  amber: '#cf8a09',
  amberInk: '#a8780a',
  amberTint: '#faf1db',
  green: '#15935b',
  greenTint: '#e3f4ec',
  greenBorder: '#b6e2cc',
} as const;

export type Severity = 'critical' | 'warning' | 'success' | 'info';

export const SEV: Record<Severity, { color: string; tint: string; label: string }> = {
  critical: { color: C.red, tint: C.redTint, label: 'Critical' },
  warning: { color: C.amber, tint: C.amberTint, label: 'Warning' },
  success: { color: C.green, tint: C.greenTint, label: 'Resolved' },
  info: { color: C.blue, tint: C.blueTint, label: 'Active' },
};

/** Derive a presentational severity from a run's status. */
export function severityOf(status: string): Severity {
  if (status === 'escalated' || status === 'failed') return 'critical';
  if (status === 'resolved' || status === 'completed') return 'success';
  return 'info';
}

export type ColumnKey = 'new' | 'step1' | 'step2' | 'escalated' | 'resolved';

export const COLUMNS: { key: ColumnKey; label: string; accent: string }[] = [
  { key: 'new', label: 'New', accent: '#919aa8' },
  { key: 'step1', label: 'Step 1 · Emailed', accent: C.blue },
  { key: 'step2', label: 'Step 2 · Follow-up', accent: C.amber },
  { key: 'escalated', label: 'Escalated', accent: C.red },
  { key: 'resolved', label: 'Resolved', accent: C.green },
];

/** Map a run (status + currentStep) onto a pipeline column. */
export function columnOf(status: string, currentStep: number): ColumnKey {
  if (status === 'resolved' || status === 'completed') return 'resolved';
  if (status === 'escalated' || status === 'failed') return 'escalated';
  if (currentStep >= 1) return 'step2';
  return 'step1';
}

/** Progress dots (3) filled up to `step`. */
export function progressDots(step: number): { color: string }[] {
  return [0, 1, 2].map((i) => ({ color: i <= step ? C.blue : C.borderStrong }));
}

export function statusLabel(status: string): string {
  return (
    {
      running: 'In progress',
      resolved: 'Self-resolved',
      escalated: 'Escalated',
      completed: 'Completed',
      failed: 'Failed',
    }[status] ?? status
  );
}

export function statusColor(status: string): string {
  if (status === 'resolved' || status === 'completed') return C.green;
  if (status === 'escalated' || status === 'failed') return C.redInk;
  return C.faint;
}

// ── Formatters ────────────────────────────────────────────────────────────────
export function fmtTime(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString();
}

export function fmtDuration(sec?: number | null) {
  if (sec == null) return '—';
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

/** Compact relative age, e.g. "2m", "5h", "3d". */
export function fmtAge(s?: string | null) {
  if (!s) return '—';
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Primitives (used by the legacy events/contacts/settings screens) ──────────
const BADGE: Record<string, string> = {
  running: 'background:#eef3ff;color:#2f5fd0',
  resolved: 'background:#e3f4ec;color:#15935b',
  completed: 'background:#eef0f4;color:#5b616e',
  escalated: 'background:#fdeced;color:#cf2f37',
  failed: 'background:#fdeced;color:#cf2f37',
  matched: 'background:#e3f4ec;color:#15935b',
  ignored: 'background:#eef0f4;color:#8b909c',
  received: 'background:#eef3ff;color:#2f5fd0',
  sent: 'background:#eef3ff;color:#2f5fd0',
  opened: 'background:#eef3ff;color:#2f5fd0',
  clicked: 'background:#e3f4ec;color:#15935b',
  queued: 'background:#eef0f4;color:#8b909c',
};

export function Badge({ children }: { children: string }) {
  const style = BADGE[children] ?? 'background:#eef0f4;color:#5b616e';
  const [bg, fg] = style.split(';').map((s) => s.split(':')[1]);
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5" style={{ borderColor: C.border }}>
      {title ? (
        <h3 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-wide" style={{ color: C.fainter }}>
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5" style={{ borderColor: C.border }}>
      <div className="font-mono text-[10px] uppercase tracking-wide" style={{ color: C.fainter }}>
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? (
        <p className="mt-1 font-mono text-[13px]" style={{ color: C.faint }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
