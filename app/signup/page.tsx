'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, ApiError, apiBase, setToken, useAuthProviders } from '@/app/lib/api';
import { C, GoogleMark } from '@/components/ui';

const SSO_ERRORS: Record<string, string> = {
  org_name_required: 'Enter an organization name before signing up with Google.',
  signup_disabled: 'Self-serve signup is turned off on this deployment.',
  email_not_verified: 'Google has not verified that email address.',
  access_denied: 'Signup was cancelled.',
};

export default function SignupPage() {
  // useSearchParams() must sit under a Suspense boundary for the App Router build.
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const providers = useAuthProviders();

  useEffect(() => {
    const e = params.get('sso_error');
    if (e) setError(SSO_ERRORS[e] ?? `Signup failed: ${e}`);
  }, [params]);

  // With signup switched off the API 404s both endpoints, so this page is a
  // dead end — bounce. The form still renders while we find out, because a
  // blank screen for the duration of a round trip is worse than a form that
  // occasionally redirects away.
  useEffect(() => {
    if (providers && !providers.signup) router.replace('/login');
  }, [providers, router]);

  const org = orgName.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setExists(false);
    try {
      const res = await api<{ accessToken: string }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ orgName: org, email: email.trim(), password }),
      });
      setToken(res.accessToken);
      router.replace('/runs');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setExists(true);
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many signups from this address. Try again later.');
      } else if (err instanceof ApiError && err.status === 422) {
        setError('Password must be at least 8 characters.');
      } else {
        setError('Could not create the organization.');
      }
    } finally {
      setLoading(false);
    }
  }

  const btn =
    'flex h-12 items-center gap-[13px] rounded-[11px] border bg-white px-[17px] text-[14.5px] font-medium';
  const field =
    'h-[46px] w-full rounded-[11px] border bg-white px-[15px] font-mono text-[13px] outline-none';

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
            Start sending technical drips in minutes.
          </h2>
          <div className="mt-auto flex flex-col gap-[13px] text-[14.5px]">
            {['Your own workspace', 'You become the admin', 'Invite your team after'].map((t) => (
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
            <h1 className="m-0 font-display text-[25px] font-semibold tracking-[-.4px]">Create your organization</h1>
            <div className="mt-[5px] text-[13.5px]" style={{ color: C.faint }}>
              You&apos;ll be its first admin.
            </div>
          </div>

          <div>
            <div className="mb-[7px] font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
              ORGANIZATION NAME
            </div>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Acme Building Services"
              autoComplete="organization"
              className={field}
              style={{ borderColor: '#d6dae3' }}
            />
          </div>

          {providers === null ? (
            // Same 48px button + divider the resolved state occupies, so the
            // fields below do not jump once /auth/providers answers.
            <>
              <div className="h-12 animate-pulse rounded-[11px]" style={{ background: '#eef0f5' }} />
              <div className="my-[5px] h-[17px]" />
            </>
          ) : providers.google ? (
            <>
              {/* Disabled until the name is filled: the API refuses a blank
                  orgName, and a greyed-out button explains that better than a
                  redirect that bounces straight back. */}
              <button
                type="button"
                disabled={!org}
                onClick={() => {
                  window.location.href =
                    `${apiBase()}/api/v1/auth/google/start` +
                    `?mode=signup&orgName=${encodeURIComponent(org)}`;
                }}
                className={`${btn} w-full justify-center disabled:opacity-50`}
                style={{ borderColor: '#d6dae3', color: C.ink }}
              >
                <GoogleMark />
                Sign up with Google
              </button>
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
              className={field}
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
              autoComplete="new-password"
              placeholder="at least 8 characters"
              className={field}
              style={{ borderColor: '#d6dae3' }}
            />
          </div>

          {exists ? (
            <p className="m-0 text-[13px]" style={{ color: C.redInk }}>
              That email already has an account —{' '}
              <a href="/login" style={{ color: C.blue }}>
                sign in instead
              </a>
              .
            </p>
          ) : error ? (
            <p className="m-0 text-[13px]" style={{ color: C.redInk }}>
              {error}
            </p>
          ) : null}

          <button
            disabled={loading || !org || !email.trim() || !password}
            className="h-12 rounded-[11px] text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ background: C.blue, boxShadow: '0 5px 14px rgba(47,95,208,.26)' }}
          >
            {loading ? 'Creating…' : 'Create organization →'}
          </button>

          <p className="m-0 text-center text-[12.5px]" style={{ color: C.faint }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: C.blue }}>
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
