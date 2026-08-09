'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __DRIPSTACK_CONFIG__?: { apiUrl?: string };
  }
}

// NEXT_PUBLIC_* is substituted at COMPILE time, so relying on it alone bakes one
// API origin into the bundle and makes the Docker image environment-specific.
// The real origin is injected per request by app/layout.tsx as
// window.__DRIPSTACK_CONFIG__; this is only the fallback.
const FALLBACK_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ds_token';

/** Browser-only. Use in fetches and click handlers. */
export function apiBase(): string {
  if (typeof window !== 'undefined' && window.__DRIPSTACK_CONFIG__?.apiUrl) {
    return window.__DRIPSTACK_CONFIG__.apiUrl;
  }
  return FALLBACK_API_URL;
}

/**
 * Use wherever the URL is RENDERED into markup. Renders the fallback on the
 * server and first paint, then swaps to the runtime value — otherwise the
 * server and client HTML disagree and React logs a hydration mismatch.
 */
export function useApiBase(): string {
  const [base, setBase] = useState(FALLBACK_API_URL);
  useEffect(() => setBase(apiBase()), []);
  return base;
}

export type AuthProviders = { google: boolean; signup: boolean };

const PROVIDERS_KEY = 'ds_providers';

/**
 * Which auth options this deployment offers, for the login and signup pages.
 *
 * Returns `null` while unknown so callers can reserve space instead of popping
 * a button in after the round trip. The answer is cached in localStorage and
 * used as the initial value on later visits — it changes only when the server
 * is reconfigured, so a stale read costs one render, and the revalidation below
 * corrects it. Reading storage in an effect rather than during render is
 * deliberate: the server has no localStorage, and seeding state from it
 * directly would be a hydration mismatch.
 */
export function useAuthProviders(): AuthProviders | null {
  const [providers, setProviders] = useState<AuthProviders | null>(null);

  useEffect(() => {
    let live = true;

    try {
      const cached = window.localStorage.getItem(PROVIDERS_KEY);
      if (cached) setProviders(JSON.parse(cached) as AuthProviders);
    } catch {
      /* unparseable or storage blocked — fall through to the fetch */
    }

    api<AuthProviders>('/api/v1/auth/providers')
      .then((p) => {
        if (!live) return;
        const next = { google: !!p.google, signup: !!p.signup };
        setProviders(next);
        try {
          window.localStorage.setItem(PROVIDERS_KEY, JSON.stringify(next));
        } catch {
          /* storage blocked — the fetch still populated state */
        }
      })
      // Unreachable API: offer nothing rather than a button that cannot work.
      .catch(() => live && setProviders({ google: false, signup: false }));

    return () => {
      live = false;
    };
  }, []);

  return providers;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'unauthorized');
  }
  if (!res.ok) {
    // FastAPI returns { detail: "..." }; surface it so the UI can show why.
    let detail = `request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* no JSON body */
    }
    throw new ApiError(res.status, detail);
  }
  // 204 No Content (e.g. DELETE) has no body to parse.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
