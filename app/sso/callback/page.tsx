'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { setToken } from '@/app/lib/api';
import { C } from '@/components/ui';

/**
 * Lands here after the API's OIDC callback redirects with tokens in the URL
 * fragment (`#accessToken=...&refreshToken=...`). The fragment is never sent to
 * a server, so the tokens stay client-side; we store the access token and move
 * on to the app.
 */
export default function SsoCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const parsed = new URLSearchParams(hash);
    const accessToken = parsed.get('accessToken');
    if (accessToken) {
      setToken(accessToken);
      // Clear the fragment so the tokens don't linger in history.
      window.history.replaceState(null, '', '/sso/callback');
      router.replace('/runs');
    } else {
      setError('No session was returned by the identity provider.');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ color: C.muted }}>
      <div className="text-center">
        {error ? (
          <>
            <p className="text-[15px]" style={{ color: C.redInk }}>
              {error}
            </p>
            <a href="/login" className="text-[13px]" style={{ color: C.blue }}>
              Back to sign in
            </a>
          </>
        ) : (
          <p className="font-mono text-[13px]">Completing single sign-on…</p>
        )}
      </div>
    </div>
  );
}
