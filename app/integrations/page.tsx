'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, ApiError, useApiBase } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C } from '@/components/ui';

interface EventSource {
  id: string;
  name: string;
  type: string;
  contactEmailPath: string;
  signingSecret: string;
}
interface OutboundWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
}
interface EmailSettings {
  emailProvider: string;
  fromAddress: string | null;
  liveDelivery: boolean;
}
interface ChannelStatus {
  channel: string;
  connected: boolean;
  enabled: boolean;
  target: string | null;
}

const OUTBOUND_EVENTS = [
  { key: 'run.resolved', label: 'Resolved' },
  { key: 'run.escalated', label: 'Escalated' },
  { key: 'run.completed', label: 'Completed' },
  { key: 'run.failed', label: 'Failed' },
];

const cardStyle = { border: `1px solid ${C.border}`, boxShadow: '0 1px 2px rgba(16,18,26,.04)' };

export default function IntegrationsPage() {
  const router = useRouter();
  const { can, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const canWrite = can('integrations.write');
  const [err, setErr] = useState<string | null>(null);
  const onErr = (e: unknown) => setErr(e instanceof ApiError ? e.message : 'Something went wrong');

  if (!pLoading && !can('integrations.read')) router.replace('/runs');

  const enabled = !pLoading && can('integrations.read');
  const { data: srcData } = useQuery({
    queryKey: ['event-sources'],
    queryFn: () => api<{ eventSources: EventSource[] }>('/api/v1/event-sources'),
    enabled,
  });
  const { data: hookData } = useQuery({
    queryKey: ['outbound-webhooks'],
    queryFn: () => api<{ outboundWebhooks: OutboundWebhook[] }>('/api/v1/outbound-webhooks'),
    enabled,
  });
  const { data: emailData } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => api<EmailSettings>('/api/v1/email-settings'),
    enabled,
  });
  const { data: channelData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api<{ channels: ChannelStatus[] }>('/api/v1/channels'),
    enabled,
  });

  const sources = srcData?.eventSources ?? [];
  const hooks = hookData?.outboundWebhooks ?? [];
  const channels = channelData?.channels ?? [];

  return (
    <Shell>
      <ScreenHeader title="Integrations" subtitle="How errors get in · how messages get out" />

      <div className="flex flex-1 flex-col gap-[22px] overflow-auto px-[26px] pb-[90px] pt-6">
        {err ? (
          <div className="rounded-[12px] p-[10px_14px] text-[13px]" style={{ border: `1px solid ${C.redBorder}`, background: C.redTint, color: C.redInk }}>
            {err}
          </div>
        ) : null}

        <IncomingSection
          sources={sources}
          canWrite={canWrite}
          qc={qc}
          onErr={onErr}
          clearErr={() => setErr(null)}
        />

        <OutgoingSection
          hooks={hooks}
          email={emailData}
          channels={channels}
          canWrite={canWrite}
          qc={qc}
          onErr={onErr}
          clearErr={() => setErr(null)}
        />
      </div>
    </Shell>
  );
}

// ── Incoming ────────────────────────────────────────────────────────────────

function IncomingSection({
  sources, canWrite, qc, onErr, clearErr,
}: {
  sources: EventSource[]; canWrite: boolean; qc: ReturnType<typeof useQueryClient>;
  onErr: (e: unknown) => void; clearErr: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'generic_webhook', contactEmailPath: '$.technician.email' });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['event-sources'] });

  const create = useMutation({
    mutationFn: () => api('/api/v1/event-sources', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => { clearErr(); setForm({ name: '', type: 'generic_webhook', contactEmailPath: '$.technician.email' }); setAdding(false); invalidate(); },
    onError: onErr,
  });

  return (
    <div>
      <div className="mb-[13px] flex items-center gap-2.5">
        <span className="font-mono text-[11px] tracking-[.6px]" style={{ color: C.muted }}>INCOMING</span>
        <span className="text-[12.5px]" style={{ color: C.fainter }}>— where errors arrive</span>
        <span className="h-px flex-1" style={{ background: C.border }} />
        {canWrite ? (
          <button onClick={() => setAdding((a) => !a)} className="h-[32px] rounded-[9px] px-3 text-[12.5px] font-semibold text-white" style={{ background: C.blue }}>
            + Add source
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-3.5 flex flex-wrap items-end gap-3 rounded-[14px] border bg-white p-4" style={{ borderColor: C.border }}>
          <Field label="NAME">
            <input className="h-[38px] w-[200px] rounded-[10px] border bg-white px-3 text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production Sentry" />
          </Field>
          <Field label="TYPE">
            <select className="h-[38px] rounded-[10px] border bg-white px-3 text-[13px] outline-none" style={{ borderColor: C.borderStrong }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="generic_webhook">Generic webhook</option>
              <option value="sentry">Sentry</option>
            </select>
          </Field>
          <Field label="CONTACT EMAIL PATH">
            <input className="h-[38px] w-[200px] rounded-[10px] border bg-white px-3 font-mono text-[12.5px] outline-none" style={{ borderColor: C.borderStrong }} value={form.contactEmailPath} onChange={(e) => setForm({ ...form, contactEmailPath: e.target.value })} />
          </Field>
          <button disabled={!form.name || create.isPending} onClick={() => create.mutate()} className="h-[38px] rounded-[10px] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>
            {create.isPending ? 'Creating…' : 'Create source'}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((s) => <SourceCard key={s.id} source={s} canWrite={canWrite} qc={qc} onErr={onErr} clearErr={clearErr} />)}
        {sources.length === 0 ? (
          <div className="flex min-h-[140px] items-center justify-center rounded-[14px] text-[13px]" style={{ border: `1px dashed #c2c8d4`, background: '#fafbfc', color: C.faint }}>
            No event sources yet — add one to get an ingest endpoint.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SourceCard({
  source, canWrite, qc, onErr, clearErr,
}: {
  source: EventSource; canWrite: boolean; qc: ReturnType<typeof useQueryClient>;
  onErr: (e: unknown) => void; clearErr: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: source.name, contactEmailPath: source.contactEmailPath });
  const apiBase = useApiBase();
  const endpoint = `${apiBase}/api/v1/ingest/${source.id}`;
  const invalidate = () => qc.invalidateQueries({ queryKey: ['event-sources'] });

  const save = useMutation({
    mutationFn: () => api(`/api/v1/event-sources/${source.id}`, { method: 'PATCH', body: JSON.stringify(form) }),
    onSuccess: () => { clearErr(); setEditing(false); invalidate(); },
    onError: onErr,
  });
  const rotate = useMutation({
    mutationFn: () => api(`/api/v1/event-sources/${source.id}/rotate-secret`, { method: 'POST' }),
    onSuccess: () => { clearErr(); invalidate(); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/v1/event-sources/${source.id}`, { method: 'DELETE' }),
    onSuccess: () => { clearErr(); invalidate(); },
    onError: onErr,
  });

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] bg-white p-4" style={cardStyle}>
      <div className="flex items-center justify-between">
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] font-mono text-[15px]" style={{ background: '#f2f4fa', border: `1px solid ${C.border}`, color: C.muted }}>◎</span>
        <span className="font-mono text-[10px] tracking-[.4px]" style={{ color: C.fainter }}>{source.type === 'sentry' ? 'SENTRY' : 'WEBHOOK'}</span>
      </div>

      {editing ? (
        <input className="h-[34px] rounded-[8px] border bg-white px-2.5 text-[14px] outline-none" style={{ borderColor: C.borderStrong }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      ) : (
        <div className="font-display text-[16px] font-semibold">{source.name}</div>
      )}

      <CopyRow label="Ingest URL" value={endpoint} mono />
      <Secret value={source.signingSecret} />

      {editing ? (
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[.4px]" style={{ color: C.fainter }}>CONTACT EMAIL PATH</span>
          <input className="h-[32px] rounded-[8px] border bg-white px-2.5 font-mono text-[12px] outline-none" style={{ borderColor: C.borderStrong }} value={form.contactEmailPath} onChange={(e) => setForm({ ...form, contactEmailPath: e.target.value })} />
        </label>
      ) : (
        <div className="font-mono text-[11px]" style={{ color: C.faint }}>contact: {source.contactEmailPath}</div>
      )}

      {canWrite ? (
        <div className="mt-1 flex items-center gap-3 border-t pt-2.5" style={{ borderColor: '#f0f1f5' }}>
          {editing ? (
            <>
              <button onClick={() => save.mutate()} className="text-[12.5px] font-semibold" style={{ color: C.blue }}>Save</button>
              <button onClick={() => { setForm({ name: source.name, contactEmailPath: source.contactEmailPath }); setEditing(false); }} className="text-[12.5px] font-medium" style={{ color: C.faint }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-[12.5px] font-medium" style={{ color: C.blue }}>Edit</button>
              <button onClick={() => { if (confirm('Rotate the signing secret? The old one stops working immediately.')) rotate.mutate(); }} className="text-[12.5px] font-medium" style={{ color: C.muted }}>Rotate secret</button>
              <button onClick={() => { if (confirm(`Delete source “${source.name}”?`)) remove.mutate(); }} className="ml-auto text-[12.5px] font-medium" style={{ color: C.redInk }}>Delete</button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ── Outgoing ────────────────────────────────────────────────────────────────

function OutgoingSection({
  hooks, email, channels, canWrite, qc, onErr, clearErr,
}: {
  hooks: OutboundWebhook[]; email: EmailSettings | undefined; channels: ChannelStatus[]; canWrite: boolean;
  qc: ReturnType<typeof useQueryClient>; onErr: (e: unknown) => void; clearErr: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ url: string; events: string[] }>({ url: '', events: ['run.resolved'] });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['outbound-webhooks'] });

  const create = useMutation({
    mutationFn: () => api('/api/v1/outbound-webhooks', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => { clearErr(); setForm({ url: '', events: ['run.resolved'] }); setAdding(false); invalidate(); },
    onError: onErr,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/v1/outbound-webhooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { clearErr(); invalidate(); },
    onError: onErr,
  });
  const toggleEvent = (k: string) =>
    setForm((f) => ({ ...f, events: f.events.includes(k) ? f.events.filter((e) => e !== k) : [...f.events, k] }));

  const byChannel = (c: string) => channels.find((x) => x.channel === c);

  return (
    <div>
      <div className="mb-[13px] flex items-center gap-2.5">
        <span className="font-mono text-[11px] tracking-[.6px]" style={{ color: C.muted }}>OUTGOING</span>
        <span className="text-[12.5px]" style={{ color: C.fainter }}>— how you reach people</span>
        <span className="h-px flex-1" style={{ background: C.border }} />
      </div>

      {/* Channel cards */}
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <EmailCard email={email} />
        <ChannelCard channel="slack" name="Slack" icon="⧉" hint="Post incidents to a Slack channel." status={byChannel('slack')} canWrite={canWrite} qc={qc} onErr={onErr} clearErr={clearErr} />
        <ChannelCard channel="teams" name="Microsoft Teams" icon="◳" hint="Post incidents to a Teams channel." status={byChannel('teams')} canWrite={canWrite} qc={qc} onErr={onErr} clearErr={clearErr} />
      </div>

      {/* Webhook endpoints (real generic channel) */}
      <div className="mb-3.5 rounded-[14px] bg-white p-[16px_18px]" style={cardStyle}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="font-display text-[15.5px] font-semibold">Webhook endpoints</div>
            <div className="text-[12.5px]" style={{ color: C.muted }}>Signed POSTs on run events — wire up Slack, Jira, PagerDuty via their incoming webhooks.</div>
          </div>
          {canWrite ? (
            <button onClick={() => setAdding((a) => !a)} className="h-[32px] shrink-0 rounded-[9px] px-3 text-[12.5px] font-semibold text-white" style={{ background: C.blue }}>+ Add webhook</button>
          ) : null}
        </div>

        {adding ? (
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-[12px] p-3.5" style={{ background: '#fafbfc', border: `1px solid ${C.border}` }}>
            <Field label="ENDPOINT URL">
              <input className="h-[38px] w-[320px] rounded-[10px] border bg-white px-3 font-mono text-[12.5px] outline-none" style={{ borderColor: C.borderStrong }} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.example.com/…" />
            </Field>
            <Field label="ON EVENTS">
              <div className="flex h-[38px] items-center gap-3">
                {OUTBOUND_EVENTS.map((ev) => (
                  <label key={ev.key} className="flex cursor-pointer items-center gap-1.5 text-[12.5px]" style={{ color: C.muted }}>
                    <input type="checkbox" checked={form.events.includes(ev.key)} onChange={() => toggleEvent(ev.key)} />
                    {ev.label}
                  </label>
                ))}
              </div>
            </Field>
            <button disabled={!form.url || form.events.length === 0 || create.isPending} onClick={() => create.mutate()} className="h-[38px] rounded-[10px] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>
              {create.isPending ? 'Adding…' : 'Add'}
            </button>
          </div>
        ) : null}

        <div className="flex flex-col gap-2.5">
          {hooks.map((h) => (
            <div key={h.id} className="flex flex-col gap-2 rounded-[11px] p-3" style={{ border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[12.5px]" style={{ color: C.ink }}>{h.url}</span>
                <div className="ml-1 flex flex-wrap gap-1.5">
                  {h.events.map((e) => (
                    <span key={e} className="rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] font-semibold" style={{ background: C.blueTint, color: C.blue }}>
                      {e.replace('run.', '')}
                    </span>
                  ))}
                </div>
                {canWrite ? (
                  <button onClick={() => { if (confirm('Delete this webhook?')) remove.mutate(h.id); }} className="ml-auto text-[12.5px] font-medium" style={{ color: C.redInk }}>Delete</button>
                ) : null}
              </div>
              <Secret value={h.secret} label="Signing secret" />
            </div>
          ))}
          {hooks.length === 0 ? (
            <div className="rounded-[11px] p-3 text-[12.5px]" style={{ border: `1px dashed #c2c8d4`, background: '#fafbfc', color: C.faint }}>
              No webhook endpoints yet.
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[12.5px]" style={{ color: C.faint }}>
        Other tools (PagerDuty, Jira, Discord…) → add a <b style={{ color: C.muted }}>Webhook endpoint</b> above.
      </p>
    </div>
  );
}

// ── Channel cards ─────────────────────────────────────────────────────────────

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span className="flex items-center gap-1.5 rounded-[20px] px-[9px] py-0.5 font-mono text-[10.5px] font-semibold"
      style={connected
        ? { background: C.greenTint, border: `1px solid ${C.greenBorder}`, color: C.green }
        : { background: '#f2f4fa', border: `1px solid ${C.border}`, color: C.muted }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: connected ? C.green : C.fainter }} />
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

function EmailCard({ email }: { email: EmailSettings | undefined }) {
  const router = useRouter();
  const live = !!email?.liveDelivery;
  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-white p-[16px_18px]" style={cardStyle}>
      <div className="flex items-center justify-between">
        <span className="flex h-[40px] w-[40px] items-center justify-center rounded-[11px] text-[18px]" style={{ background: C.blueTint, border: `1px solid ${C.blueBorder}`, color: C.blue }}>✉</span>
        <StatusBadge connected={live} />
      </div>
      <div>
        <div className="font-display text-[16px] font-semibold">Email</div>
        <div className="text-[12.5px]" style={{ color: C.muted }}>
          {live ? `Live delivery · ${email?.emailProvider}` : 'Preview only — renders at /dev/emails'}
        </div>
      </div>
      <button onClick={() => router.push('/email')} className="mt-auto h-[34px] rounded-[9px] text-[13px] font-semibold" style={{ border: `1px solid ${C.blue}`, color: C.blue }}>
        Configure
      </button>
    </div>
  );
}

function ChannelCard({
  channel, name, icon, hint, status, canWrite, qc, onErr, clearErr,
}: {
  channel: string; name: string; icon: string; hint: string; status: ChannelStatus | undefined;
  canWrite: boolean; qc: ReturnType<typeof useQueryClient>; onErr: (e: unknown) => void; clearErr: () => void;
}) {
  const connected = !!status?.connected;
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [testMsg, setTestMsg] = useState<{ ok: boolean; detail: string } | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['channels'] });

  const save = useMutation({
    mutationFn: () => api(`/api/v1/channels/${channel}`, { method: 'PUT', body: JSON.stringify({ webhookUrl: url, enabled: true }) }),
    onSuccess: () => { clearErr(); setUrl(''); setEditing(false); setTestMsg(null); invalidate(); },
    onError: onErr,
  });
  const disconnect = useMutation({
    mutationFn: () => api(`/api/v1/channels/${channel}`, { method: 'DELETE' }),
    onSuccess: () => { clearErr(); setTestMsg(null); invalidate(); },
    onError: onErr,
  });
  const test = useMutation({
    mutationFn: () => api<{ ok: boolean; detail: string }>(`/api/v1/channels/${channel}/test`, { method: 'POST' }),
    onSuccess: (res) => { clearErr(); setTestMsg(res); },
    onError: onErr,
  });

  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-white p-[16px_18px]" style={cardStyle}>
      <div className="flex items-center justify-between">
        <span className="flex h-[40px] w-[40px] items-center justify-center rounded-[11px] text-[18px]" style={{ background: '#f2f4fa', border: `1px solid ${C.border}`, color: C.muted }}>{icon}</span>
        <StatusBadge connected={connected} />
      </div>
      <div>
        <div className="font-display text-[16px] font-semibold">{name}</div>
        <div className="text-[12.5px]" style={{ color: C.muted }}>
          {connected ? <span className="font-mono text-[11.5px]">{status?.target}</span> : hint}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.slack.com/services/…" className="h-[36px] rounded-[9px] border bg-white px-2.5 font-mono text-[12px] outline-none" style={{ borderColor: C.borderStrong }} />
          <div className="flex items-center gap-2">
            <button disabled={!url || save.isPending} onClick={() => save.mutate()} className="h-[32px] rounded-[8px] px-3 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: C.blue }}>
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setUrl(''); }} className="text-[12.5px] font-medium" style={{ color: C.faint }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex items-center gap-3">
          {canWrite ? (
            connected ? (
              <>
                <button onClick={() => test.mutate()} disabled={test.isPending} className="text-[12.5px] font-semibold" style={{ color: C.blue }}>
                  {test.isPending ? 'Sending…' : 'Send test'}
                </button>
                <button onClick={() => setEditing(true)} className="text-[12.5px] font-medium" style={{ color: C.muted }}>Edit</button>
                <button onClick={() => { if (confirm(`Disconnect ${name}?`)) disconnect.mutate(); }} className="ml-auto text-[12.5px] font-medium" style={{ color: C.redInk }}>Disconnect</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="h-[34px] w-full rounded-[9px] text-[13px] font-semibold text-white" style={{ background: C.blue }}>+ Connect</button>
            )
          ) : (
            <span className="text-[12px]" style={{ color: C.faint }}>{connected ? 'Connected' : 'Not connected'}</span>
          )}
        </div>
      )}

      {testMsg ? (
        <div className="rounded-[8px] px-2.5 py-1.5 text-[12px]" style={testMsg.ok ? { background: C.greenTint, color: '#13603e' } : { background: C.redTint, color: C.redInk }}>
          {testMsg.ok ? '✓ ' : '✕ '}{testMsg.detail}
        </div>
      ) : null}
    </div>
  );
}

// ── Small shared bits ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>{label}</span>
      {children}
    </div>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* unavailable */ }
  };
  return (
    <div className="flex items-center overflow-hidden rounded-[9px] bg-white" style={{ border: `1px solid ${C.border}` }}>
      <span className="px-2 font-mono text-[9.5px] tracking-[.4px]" style={{ color: C.fainter }}>{label}</span>
      <span className={`flex-1 truncate py-1.5 ${mono ? 'font-mono' : ''} text-[11.5px]`} style={{ color: C.muted }}>{value}</span>
      <button onClick={copy} className="px-2.5 py-1.5 font-mono text-[10.5px] font-semibold text-white" style={{ background: C.blue }}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}

function Secret({ value, label = 'Signing secret' }: { value: string; label?: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { /* unavailable */ }
  };
  return (
    <div className="flex items-center overflow-hidden rounded-[9px] bg-white" style={{ border: `1px solid ${C.border}` }}>
      <span className="px-2 font-mono text-[9.5px] tracking-[.4px]" style={{ color: C.fainter }}>{label.toUpperCase()}</span>
      <span className="flex-1 truncate py-1.5 font-mono text-[11.5px]" style={{ color: C.muted }}>{shown ? value : '•'.repeat(18)}</span>
      <button onClick={() => setShown((s) => !s)} className="px-2 py-1.5 text-[10.5px] font-semibold" style={{ color: C.blue }}>{shown ? 'Hide' : 'Reveal'}</button>
      <button onClick={copy} className="px-2.5 py-1.5 font-mono text-[10.5px] font-semibold text-white" style={{ background: C.blue }}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}
