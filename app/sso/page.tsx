'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api, ApiError, useApiBase } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C } from '@/components/ui';

interface SsoConfig {
  configured: boolean;
  provider?: string;
  issuer?: string;
  clientId?: string;
  clientSecretSet?: boolean;
  enabled?: boolean;
  autoProvision?: boolean;
  allowedDomain?: string | null;
  defaultRoleSlug?: string;
}

const EMPTY = {
  issuer: '',
  clientId: '',
  clientSecret: '',
  enabled: true,
  autoProvision: false,
  allowedDomain: '',
  defaultRoleSlug: 'customer-member',
};

export default function SsoPage() {
  const apiBase = useApiBase();
  const router = useRouter();
  const { principal, can, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const canWrite = can('integrations.write');

  const { data } = useQuery({ queryKey: ['sso'], queryFn: () => api<SsoConfig>('/api/v1/sso') });
  const [form, setForm] = useState({ ...EMPTY });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (data?.configured) {
      setForm((f) => ({
        ...f,
        issuer: data.issuer ?? '',
        clientId: data.clientId ?? '',
        clientSecret: '', // never returned; leave blank to keep
        enabled: data.enabled ?? true,
        autoProvision: data.autoProvision ?? false,
        allowedDomain: data.allowedDomain ?? '',
        defaultRoleSlug: data.defaultRoleSlug ?? 'customer-member',
      }));
    }
  }, [data]);

  if (!pLoading && !can('integrations.read')) router.replace('/runs');

  const save = useMutation({
    mutationFn: () =>
      api<SsoConfig>('/api/v1/sso', {
        method: 'PUT',
        body: JSON.stringify({
          issuer: form.issuer,
          clientId: form.clientId,
          ...(form.clientSecret ? { clientSecret: form.clientSecret } : {}),
          enabled: form.enabled,
          autoProvision: form.autoProvision,
          allowedDomain: form.allowedDomain || null,
          defaultRoleSlug: form.defaultRoleSlug,
        }),
      }),
    onSuccess: () => {
      setMsg({ ok: true, text: 'Saved. SSO connection updated.' });
      setForm((f) => ({ ...f, clientSecret: '' }));
      qc.invalidateQueries({ queryKey: ['sso'] });
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Save failed' }),
  });

  const remove = useMutation({
    mutationFn: () => api('/api/v1/sso', { method: 'DELETE' }),
    onSuccess: () => {
      setMsg({ ok: true, text: 'SSO connection removed.' });
      setForm({ ...EMPTY });
      qc.invalidateQueries({ queryKey: ['sso'] });
    },
  });

  const orgId = principal?.organizationId ?? '';
  const callbackUrl = `${apiBase}/api/v1/auth/sso/callback`;

  return (
    <Shell>
      <ScreenHeader title="Single sign-on" subtitle="OpenID Connect (OIDC) for your workspace" />

      <div className="flex-1 overflow-auto px-[26px] pb-[90px] pt-6">
        <div className="max-w-[640px]">
          <div
            className="mb-5 flex items-center gap-3 rounded-[13px] p-[14px_16px]"
            style={
              data?.configured && data.enabled
                ? { border: `1px solid ${C.greenBorder}`, background: C.greenTint }
                : { border: `1px solid ${C.blueBorder}`, background: C.blueTint }
            }
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: data?.configured && data.enabled ? C.green : C.blue }}
            />
            <div className="text-[13.5px]" style={{ color: data?.configured && data.enabled ? '#13603e' : '#1b2336' }}>
              {data?.configured && data.enabled ? (
                <>SSO is <b>active</b>. Members sign in with the organization ID below.</>
              ) : (
                <>Configure your identity provider, then members can sign in with OIDC.</>
              )}
            </div>
          </div>

          <div className="mb-5 rounded-[14px] border bg-white p-5" style={{ borderColor: C.border }}>
            <Row label="ORGANIZATION ID (for sign-in)">
              <code className="block rounded-[9px] border px-3 py-2 font-mono text-[12.5px]" style={{ borderColor: C.border, background: '#f7f8fb' }}>{orgId}</code>
            </Row>
            <div className="h-4" />
            <Row label="REDIRECT URI (register this in your IdP)">
              <code className="block rounded-[9px] border px-3 py-2 font-mono text-[12.5px]" style={{ borderColor: C.border, background: '#f7f8fb' }}>{callbackUrl}</code>
            </Row>
          </div>

          <div className="flex flex-col gap-5 rounded-[14px] border bg-white p-5" style={{ borderColor: C.border }}>
            <Row label="ISSUER URL">
              <input
                disabled={!canWrite}
                value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                placeholder="https://accounts.google.com"
                className="h-[42px] w-full rounded-[11px] border bg-white px-3 font-mono text-[13px] outline-none disabled:opacity-60"
                style={{ borderColor: C.borderStrong }}
              />
            </Row>
            <Row label="CLIENT ID">
              <input
                disabled={!canWrite}
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="h-[42px] w-full rounded-[11px] border bg-white px-3 font-mono text-[13px] outline-none disabled:opacity-60"
                style={{ borderColor: C.borderStrong }}
              />
            </Row>
            <Row label={data?.clientSecretSet ? 'CLIENT SECRET (leave blank to keep current)' : 'CLIENT SECRET'}>
              <input
                disabled={!canWrite}
                type="password"
                value={form.clientSecret}
                onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                placeholder={data?.clientSecretSet ? '•••••••• (stored)' : ''}
                className="h-[42px] w-full rounded-[11px] border bg-white px-3 font-mono text-[13px] outline-none disabled:opacity-60"
                style={{ borderColor: C.borderStrong }}
              />
            </Row>
            <Row label="ALLOWED EMAIL DOMAIN (optional)">
              <input
                disabled={!canWrite}
                value={form.allowedDomain}
                onChange={(e) => setForm({ ...form, allowedDomain: e.target.value })}
                placeholder="acme.com"
                className="h-[42px] w-full rounded-[11px] border bg-white px-3 font-mono text-[13px] outline-none disabled:opacity-60"
                style={{ borderColor: C.borderStrong }}
              />
            </Row>
            <Row label="DEFAULT ROLE (for auto-provisioned users)">
              <select
                disabled={!canWrite}
                value={form.defaultRoleSlug}
                onChange={(e) => setForm({ ...form, defaultRoleSlug: e.target.value })}
                className="h-[42px] w-full rounded-[11px] border bg-white px-3 text-[14px] outline-none disabled:opacity-60"
                style={{ borderColor: C.borderStrong }}
              >
                <option value="customer-member">Customer Member</option>
                <option value="customer-admin">Customer Admin</option>
              </select>
            </Row>
            <label className="flex items-center gap-2.5 text-[13.5px]" style={{ color: C.ink }}>
              <input type="checkbox" disabled={!canWrite} checked={form.autoProvision} onChange={(e) => setForm({ ...form, autoProvision: e.target.checked })} />
              Auto-provision users on first successful SSO login
            </label>
            <label className="flex items-center gap-2.5 text-[13.5px]" style={{ color: C.ink }}>
              <input type="checkbox" disabled={!canWrite} checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              Enabled
            </label>

            {msg ? (
              <p className="m-0 text-[13px]" style={{ color: msg.ok ? C.green : C.redInk }}>{msg.text}</p>
            ) : null}

            {canWrite ? (
              <div className="flex gap-3">
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !form.issuer || !form.clientId}
                  className="h-[44px] rounded-[11px] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
                  style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.24)' }}
                >
                  {save.isPending ? 'Saving…' : 'Save connection'}
                </button>
                {data?.configured ? (
                  <button
                    onClick={() => remove.mutate()}
                    disabled={remove.isPending}
                    className="h-[44px] rounded-[11px] border px-5 text-[14px] font-semibold disabled:opacity-50"
                    style={{ borderColor: C.border, color: C.redInk }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="m-0 text-[13px]" style={{ color: C.faint }}>You have read-only access to integrations.</p>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>{label}</div>
      {children}
    </div>
  );
}
