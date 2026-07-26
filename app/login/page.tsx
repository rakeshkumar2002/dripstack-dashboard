'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, apiBase, setToken } from '@/app/lib/api';
import { C } from '@/components/ui';

export default function LoginPage() {
  // useSearchParams() must sit under a Suspense boundary for the App Router build.
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('demo@dripstack.dev');
  const [password, setPassword] = useState('DripStackDemo!23');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoOpen, setSsoOpen] = useState(false);
  const [ssoOrg, setSsoOrg] = useState('');

  // Surface an SSO failure handed back by the callback (?sso_error=...).
  useEffect(() => {
    const e = params.get('sso_error');
    if (e) setError(`SSO sign-in failed: ${e}`);
  }, [params]);

  function startSso() {
    const org = ssoOrg.trim();
    if (!org) {
      setError('Enter your organization ID to continue with SSO.');
      return;
    }
    window.location.href = `${apiBase()}/api/v1/auth/sso/${encodeURIComponent(org)}/start`;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accessToken: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.accessToken);
      router.replace('/runs');
    } catch {
      setError('Invalid credentials. Did you run the seed?');
    } finally {
      setLoading(false);
    }
  }

  const ssoBtn =
    'flex h-12 items-center gap-[13px] rounded-[11px] border bg-white px-[17px] text-[14.5px] font-medium';

  return (
    <div className="flex min-h-screen items-center justify-center p-[30px_20px]">
      <div
        className="flex min-h-[520px] w-full max-w-[880px] overflow-hidden rounded-[20px] bg-white"
        style={{ border: `1px solid ${C.border}`, boxShadow: '0 24px 70px rgba(16,18,26,.14)' }}
      >
        {/* BRAND */}
        <div
          className="flex w-[340px] shrink-0 flex-col p-[38px_34px] text-white"
          style={{
            background: C.blue,
            backgroundImage: 'radial-gradient(rgba(255,255,255,.14) 1px,transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          <div className="flex items-center gap-[11px]">
            <div
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
              style={{ background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.3)' }}
            >
              <div className="h-3.5 w-3.5 rounded-[5px]" style={{ border: '2.4px solid #fff' }} />
            </div>
            <span className="font-display text-[21px] font-semibold tracking-[-.3px]">DripStack</span>
          </div>
          <h2 className="mt-[34px] font-display text-[28px] font-semibold leading-[1.25] tracking-[-.6px]">
            An automated concierge for technical incidents.
          </h2>
          <div className="mt-auto flex flex-col gap-[13px] text-[14.5px]">
            {['Errors become smart emails', 'Branching drip sequences', 'Escalate only when needed'].map((t) => (
              <div key={t} className="flex items-center gap-[11px]">
                <span className="h-[7px] w-[7px] rounded-full bg-white opacity-90" />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={submit} className="flex flex-1 flex-col justify-center gap-[15px] p-[46px_44px]">
          <div>
            <h1 className="m-0 font-display text-[25px] font-semibold tracking-[-.4px]">Sign in to your workspace</h1>
            <div className="mt-[5px] text-[13.5px]" style={{ color: C.faint }}>
              Support &amp; ops teams only — technicians never sign in.
            </div>
          </div>

          <div className="mt-1 flex flex-col gap-[11px]">
            {[
              { k: 'G', label: 'Continue with Google' },
              { k: '⊞', label: 'Continue with Microsoft' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setNote('SSO is not configured in this demo — use the work email below.')}
                className={ssoBtn}
                style={{ borderColor: '#d6dae3', color: C.ink }}
              >
                <span
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] font-mono text-[12px]"
                  style={{ border: '1px solid #d6dae3', color: C.muted }}
                >
                  {p.k}
                </span>
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSsoOpen((v) => !v)}
              className={ssoBtn}
              style={{ borderColor: C.blueBorder, background: C.blueTint, color: C.blue, fontWeight: 600 }}
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-[12px]" style={{ border: `1px solid ${C.blueBorder}` }}>
                ⚷
              </span>
              Single sign-on (OIDC)
            </button>
            {ssoOpen ? (
              <div className="flex gap-2">
                <input
                  value={ssoOrg}
                  onChange={(e) => setSsoOrg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startSso()}
                  placeholder="Organization ID"
                  className="h-11 flex-1 rounded-[11px] border bg-white px-[15px] font-mono text-[12px] outline-none"
                  style={{ borderColor: '#d6dae3' }}
                />
                <button
                  type="button"
                  onClick={startSso}
                  className="h-11 rounded-[11px] px-4 text-[13px] font-semibold text-white"
                  style={{ background: C.blue }}
                >
                  Go →
                </button>
              </div>
            ) : null}
          </div>

          <div className="my-[5px] flex items-center gap-3">
            <span className="h-px flex-1" style={{ background: C.border }} />
            <span className="font-mono text-[11px]" style={{ color: '#b6bccb' }}>
              or
            </span>
            <span className="h-px flex-1" style={{ background: C.border }} />
          </div>

          <div>
            <div className="mb-[7px] font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
              WORK EMAIL
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="h-[46px] w-full rounded-[11px] border bg-white px-[15px] font-mono text-[13px] outline-none"
              style={{ borderColor: '#d6dae3' }}
            />
          </div>
          <div>
            <div className="mb-[7px] font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
              PASSWORD
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="h-[46px] w-full rounded-[11px] border bg-white px-[15px] font-mono text-[13px] outline-none"
              style={{ borderColor: '#d6dae3' }}
            />
          </div>

          {error ? (
            <p className="m-0 text-[13px]" style={{ color: C.redInk }}>
              {error}
            </p>
          ) : note ? (
            <p className="m-0 text-[13px]" style={{ color: C.faint }}>
              {note}
            </p>
          ) : null}

          <button
            disabled={loading}
            className="h-12 rounded-[11px] text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ background: C.blue, boxShadow: '0 5px 14px rgba(47,95,208,.26)' }}
          >
            {loading ? 'Signing in…' : 'Continue →'}
          </button>
          <p className="m-0 text-center font-mono text-[11px]" style={{ color: '#b6bccb' }}>
            Demo credentials are prefilled.
          </p>
        </form>
      </div>
    </div>
  );
}
