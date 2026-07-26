'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C } from '@/components/ui';

interface EmailSettings {
  emailProvider: string;
  fromAddress: string | null;
  defaultTechnicianEmail: string | null;
  liveDelivery: boolean;
}

const PROVIDERS = [
  { v: 'log', label: 'Log preview (no real send)' },
  { v: 'resend', label: 'Resend (real delivery)' },
  { v: 'ses', label: 'AWS SES (real delivery)' },
];

export default function EmailPage() {
  const router = useRouter();
  const { can, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const canWrite = can('email.write');

  const { data } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => api<EmailSettings>('/api/v1/email-settings'),
  });

  const [form, setForm] = useState<EmailSettings | null>(null);
  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  if (!pLoading && !can('technicians.read')) router.replace('/runs');

  const save = useMutation({
    mutationFn: () =>
      api<EmailSettings>('/api/v1/email-settings', {
        method: 'PATCH',
        body: JSON.stringify({
          emailProvider: form?.emailProvider,
          fromAddress: form?.fromAddress,
          defaultTechnicianEmail: form?.defaultTechnicianEmail,
        }),
      }),
    onSuccess: (res) => {
      setForm(res);
      qc.invalidateQueries({ queryKey: ['email-settings'] });
    },
  });

  const f = form;
  const live = f?.emailProvider !== 'log' && !!data?.liveDelivery;

  return (
    <Shell>
      <ScreenHeader title="Email" subtitle="How smart emails are delivered to technicians" />

      <div className="flex-1 overflow-auto px-[26px] pb-[90px] pt-6">
        <div className="max-w-[620px]">
          {/* live-delivery banner */}
          <div
            className="mb-5 flex items-center gap-3 rounded-[13px] p-[14px_16px]"
            style={
              live
                ? { border: `1px solid ${C.greenBorder}`, background: C.greenTint }
                : { border: `1px solid ${C.blueBorder}`, background: C.blueTint }
            }
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: live ? C.green : C.blue }} />
            <div className="text-[13.5px]" style={{ color: live ? '#13603e' : '#1b2336' }}>
              {live ? (
                <>Live delivery is <b>on</b> — technicians receive real email.</>
              ) : (
                <>
                  Preview mode — emails render at <span className="font-mono">/dev/emails</span> and are not actually sent.
                  Choose <b>Resend</b> and set <span className="font-mono">RESEND_API_KEY</span> to go live.
                </>
              )}
            </div>
          </div>

          {!f ? (
            <div className="font-mono text-[13px]" style={{ color: C.fainter }}>Loading…</div>
          ) : (
            <div className="flex flex-col gap-5 rounded-[14px] border bg-white p-5" style={{ borderColor: C.border }}>
              <Row label="PROVIDER">
                <select
                  disabled={!canWrite}
                  value={f.emailProvider}
                  onChange={(e) => setForm({ ...f, emailProvider: e.target.value })}
                  className="h-[42px] w-full rounded-[11px] border bg-white px-3 text-[14px] outline-none disabled:opacity-60"
                  style={{ borderColor: C.borderStrong }}
                >
                  {PROVIDERS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </Row>
              <Row label="FROM ADDRESS">
                <input
                  disabled={!canWrite}
                  value={f.fromAddress ?? ''}
                  onChange={(e) => setForm({ ...f, fromAddress: e.target.value })}
                  className="h-[42px] w-full rounded-[11px] border bg-white px-3 font-mono text-[13px] outline-none disabled:opacity-60"
                  style={{ borderColor: C.borderStrong }}
                  placeholder="Alerts <alerts@yourdomain.com>"
                />
              </Row>
              <Row label="DEFAULT TECHNICIAN EMAIL">
                <input
                  disabled={!canWrite}
                  value={f.defaultTechnicianEmail ?? ''}
                  onChange={(e) => setForm({ ...f, defaultTechnicianEmail: e.target.value })}
                  className="h-[42px] w-full rounded-[11px] border bg-white px-3 font-mono text-[13px] outline-none disabled:opacity-60"
                  style={{ borderColor: C.borderStrong }}
                  placeholder="cyborgrock2@gmail.com"
                />
                <p className="mt-1.5 text-[12.5px]" style={{ color: C.faint }}>
                  Fallback recipient when an inbound event has no technician email.
                </p>
              </Row>
              {canWrite ? (
                <button
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="h-[44px] self-start rounded-[11px] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
                  style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.24)' }}
                >
                  {save.isPending ? 'Saving…' : 'Save settings'}
                </button>
              ) : null}
            </div>
          )}
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
