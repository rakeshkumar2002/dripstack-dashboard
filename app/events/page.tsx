'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { Shell } from '@/components/Shell';
import { Badge, PageHeader, fmtTime } from '@/components/ui';

interface EventRow {
  id: string;
  type: string;
  status: string;
  contactEmail: string | null;
  receivedAt: string;
}

export default function EventsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api<{ events: EventRow[] }>('/api/v1/events'),
    refetchInterval: 4000,
  });

  return (
    <Shell>
      <PageHeader title="Events" subtitle="Raw inbound events and whether they matched a sequence." />
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
            <tr>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Contact</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">Loading…</td></tr>
            ) : data?.events.length ? (
              data.events.map((e) => (
                <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-4 py-2.5 font-mono text-xs">{e.type}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{e.contactEmail ?? '—'}</td>
                  <td className="px-4 py-2.5"><Badge>{e.status}</Badge></td>
                  <td className="px-4 py-2.5 text-xs text-neutral-500">{fmtTime(e.receivedAt)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-neutral-400">No events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
