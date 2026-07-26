'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { Shell } from '@/components/Shell';
import { PageHeader, fmtTime } from '@/components/ui';

interface Contact {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
}

export default function ContactsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => api<{ contacts: Contact[] }>('/api/v1/contacts'),
  });

  return (
    <Shell>
      <PageHeader title="Contacts" subtitle="Technicians communicated with. Auto-created from inbound events." />
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
            <tr>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
            ) : data?.contacts.length ? (
              data.contacts.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-2.5 font-mono text-xs">{c.email}</td>
                  <td className="px-4 py-2.5">{c.name ?? '—'}</td>
                  <td className="px-4 py-2.5">{c.phone ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-neutral-500">{fmtTime(c.createdAt)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No contacts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
