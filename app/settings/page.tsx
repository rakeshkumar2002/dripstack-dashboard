'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, useApiBase } from '@/app/lib/api';
import { Shell } from '@/components/Shell';
import { Card, PageHeader, fmtTime } from '@/components/ui';

interface Settings {
  organization: { id: string; name: string; settings: Record<string, unknown> } | null;
}
interface EventSource { id: string; name: string; type: string; contactEmailPath: string }
interface ApiKey { id: string; name: string; lastUsedAt: string | null; createdAt: string }

export default function SettingsPage() {
  const apiBase = useApiBase();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => api<Settings>('/api/v1/settings') });
  const { data: sources } = useQuery({ queryKey: ['sources'], queryFn: () => api<{ eventSources: EventSource[] }>('/api/v1/event-sources') });
  const { data: keys } = useQuery({ queryKey: ['keys'], queryFn: () => api<{ apiKeys: ApiKey[] }>('/api/v1/api-keys') });
  const [newKey, setNewKey] = useState<string | null>(null);

  const org = settings?.organization;
  const s = (org?.settings ?? {}) as Record<string, unknown>;

  async function createKey() {
    const name = prompt('API key name?') ?? '';
    if (!name) return;
    const res = await api<{ key: string }>('/api/v1/api-keys', { method: 'POST', body: JSON.stringify({ name }) });
    setNewKey(res.key);
    qc.invalidateQueries({ queryKey: ['keys'] });
  }

  return (
    <Shell>
      <PageHeader title="Settings" subtitle="Organization configuration." />
      <div className="grid gap-6">
        <Card title="Organization">
          <div className="text-sm">
            <div className="mb-1"><span className="text-neutral-500">Name:</span> {org?.name ?? '—'}</div>
            <div><span className="text-neutral-500">Org ID:</span> <span className="font-mono text-xs">{org?.id ?? '—'}</span></div>
          </div>
        </Card>

        <Card title="Email (ESP)">
          <div className="text-sm">
            <div><span className="text-neutral-500">Provider:</span> {(s.emailProvider as string) ?? 'log (default)'}</div>
            <div><span className="text-neutral-500">From:</span> {(s.fromAddress as string) ?? '—'}</div>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950">{`# Required DNS for a custom from-domain
SPF   TXT  @            "v=spf1 include:_spf.resend.com ~all"
DKIM  CNAME resend._domainkey  resend._domainkey.resend.com
DMARC TXT  _dmarc       "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain"`}</pre>
        </Card>

        <Card title="AI doc context (RAG-lite)">
          <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
            {(s.productDocContext as string) ?? 'No product documentation context set.'}
          </p>
        </Card>

        <Card title="Event sources">
          {sources?.eventSources.map((es) => (
            <div key={es.id} className="mb-3 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
              <div className="font-medium">{es.name} <span className="text-xs text-neutral-500">({es.type})</span></div>
              <div className="mt-1 font-mono text-xs text-neutral-500">POST {apiBase}/api/v1/ingest/{es.id}</div>
              <div className="font-mono text-xs text-neutral-500">contactEmailPath: {es.contactEmailPath}</div>
            </div>
          )) ?? <p className="text-sm text-neutral-400">—</p>}
        </Card>

        <Card title="API keys">
          {newKey ? (
            <div className="mb-3 rounded-lg border border-green-300 bg-green-50 p-3 text-sm dark:border-green-900 dark:bg-green-950">
              Copy now (shown once): <span className="font-mono text-xs">{newKey}</span>
            </div>
          ) : null}
          <div className="space-y-2">
            {keys?.apiKeys.map((k) => (
              <div key={k.id} className="flex justify-between text-sm">
                <span>{k.name}</span>
                <span className="text-xs text-neutral-500">last used {fmtTime(k.lastUsedAt)}</span>
              </div>
            )) ?? null}
          </div>
          <button onClick={createKey} className="mt-3 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900">
            Create API key
          </button>
        </Card>
      </div>
    </Shell>
  );
}
