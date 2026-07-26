'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export interface Principal {
  userId: string;
  organizationId: string;
  role: { slug: string | null; scope: string };
  isPlatform: boolean;
  permissions: string[];
  organization: { id: string; name: string } | null;
}

/** The signed-in user's role + permission set, with a `can(key)` gate helper. */
export function usePrincipal() {
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<Principal>('/api/v1/auth/me'),
    staleTime: 60_000,
  });
  const perms = new Set(data?.permissions ?? []);
  return {
    principal: data,
    isLoading,
    isPlatform: !!data?.isPlatform,
    can: (key: string) => perms.has(key),
  };
}
