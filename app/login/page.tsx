'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, ApiError, apiBase, setToken } from '@/app/lib/api';
import { C } from '@/components/ui';

// Reasons the API hands back on ?sso_error=, turned into something a person can
// act on. Anything unrecognised falls through to the raw code.
const SSO_ERRORS: Record<string, string> = {
  no_account: 'That Google account has no DripStack user. Ask an admin to invite you first.',
  account_disabled: 'That account has been disabled.',
  email_not_verified: 'Google has not verified that email address.',
  access_denied: 'Sign-in was cancelled.',
};

/** Google's four-colour "G", inlined — the CSP on this app blocks remote images. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ssoBusy, setSsoBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  // Surface a failure handed back by the OIDC/Google callback (?sso_error=...).
  useEffect(() => {
    const e = params.get('sso_error');
    if (e) setError(SSO_ERRORS[e] ?? `Sign-in failed: ${e}`);
  }, [params]);

  // Only offer Google if the deployment actually has credentials — a button
  // that 404s is worse than no button.
  useEffect(() => {
    api<{ google: boolean }>('/api/v1/auth/providers')
      .then((p) => setGoogleEnabled(p.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

  /**
   * SSO is per-organization, but nobody knows their org id — so resolve it from
   * the email domain first, then hand off to the authorization-code flow.
   */
  async function startSso() {
    const addr = email.trim();
    if (!addr.includes('@')) {
      setError('Enter your work email first — SSO is matched on its domain.');
      return;
    }
    setSsoBusy(true);
    setError(null);
    try {
      const { orgId } = await api<{ orgId: string }>('/api/v1/auth/sso/discover', {
        method: 'POST',
        body: JSON.stringify({ email: addr }),
      });
      window.location.href = `${apiBase()}/api/v1/auth/sso/${encodeURIComponent(orgId)}/start`;
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? 'No single sign-on is configured for that email domain.'
          : 'Could not start single sign-on.',
      );
      setSsoBusy(false);
    }
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

          {googleEnabled ? (
            <>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `${apiBase()}/api/v1/auth/google/start`;
                  }}
                  className={`${ssoBtn} w-full justify-center`}
                  style={{ borderColor: '#d6dae3', color: C.ink }}
                >
                  <GoogleMark />
                  Continue with Google
                </button>
              </div>
              <div className="my-[5px] flex items-center gap-3">
                <span className="h-px flex-1" style={{ background: C.border }} />
                <span className="font-mono text-[11px]" style={{ color: '#b6bccb' }}>
                  or
                </span>
                <span className="h-px flex-1" style={{ background: C.border }} />
              </div>
            </>
          ) : null}

          <div>
            <div className="mb-[7px] font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
              WORK EMAIL
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
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
              autoComplete="current-password"
              className="h-[46px] w-full rounded-[11px] border bg-white px-[15px] font-mono text-[13px] outline-none"
              style={{ borderColor: '#d6dae3' }}
            />
          </div>

          {error ? (
            <p className="m-0 text-[13px]" style={{ color: C.redInk }}>
              {error}
            </p>
          ) : null}

          <button
            disabled={loading}
            className="h-12 rounded-[11px] text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ background: C.blue, boxShadow: '0 5px 14px rgba(47,95,208,.26)' }}
          >
            {loading ? 'Signing in…' : 'Continue →'}
          </button>

          {/* Reads the email above rather than asking for an org id — see startSso(). */}
          <button
            type="button"
            onClick={startSso}
            disabled={ssoBusy}
            className="m-0 text-center text-[12.5px] disabled:opacity-60"
            style={{ color: C.blue }}
          >
            {ssoBusy ? 'Redirecting…' : 'Use single sign-on (OIDC) instead'}
          </button>
        </form>
      </div>
    </div>
  );
}
