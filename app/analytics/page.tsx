'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/app/lib/api';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C, fmtDuration } from '@/components/ui';

interface Analytics {
  totalRuns: number;
  byStatus: Record<string, number>;
  resolutionRate: number;
  escalationRate: number;
  avgResolutionSeconds: number | null;
  messageStatus: Record<string, number>;
  runsOverTime: { date: string; count: number }[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

const cardStyle = {
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 2px rgba(16,18,26,.04)',
};

function Kpi({ label, value, sub, subColor, accent }: { label: string; value: React.ReactNode; sub: string; subColor?: string; accent?: boolean }) {
  return (
    <div className="rounded-[14px] bg-white p-[16px_17px]" style={cardStyle}>
      <div className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>
        {label}
      </div>
      <div className="mt-[7px] font-display text-[34px] font-semibold tracking-[-1px]" style={{ color: accent ? C.blue : C.ink }}>
        {value}
      </div>
      <div className="mt-[3px] text-[12.5px]" style={{ color: subColor ?? C.faint }}>
        {sub}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api<Analytics>('/api/v1/analytics'),
    refetchInterval: 5000,
  });

  if (isLoading || !data) {
    return (
      <Shell>
        <ScreenHeader title="Analytics" subtitle="Support load absorbed by automation" />
        <div className="p-[26px] font-mono text-[13px]" style={{ color: C.fainter }}>
          Loading…
        </div>
      </Shell>
    );
  }

  const resolved = data.byStatus.resolved ?? 0;
  const escalated = data.byStatus.escalated ?? 0;
  const msg = data.messageStatus;
  const msgTotal = Object.values(msg).reduce((a, b) => a + b, 0) || 1;
  const openRate = ((msg.opened ?? 0) + (msg.clicked ?? 0)) / msgTotal;
  const clickRate = (msg.clicked ?? 0) / msgTotal;
  const resPct = Math.round(data.resolutionRate * 100);
  const maxDay = Math.max(1, ...data.runsOverTime.map((d) => d.count));
  const absorbedHrs = Math.round(((data.avgResolutionSeconds ?? 0) * resolved) / 3600);

  const statusEntries = Object.entries(data.byStatus).sort((a, b) => b[1] - a[1]);
  const maxStatus = Math.max(1, ...statusEntries.map(([, n]) => n));

  return (
    <Shell>
      <ScreenHeader
        title="Analytics"
        subtitle="Support load absorbed by automation"
        right={
          <div
            className="flex h-[38px] cursor-pointer items-center gap-[9px] rounded-[10px] border bg-white px-[14px] text-[13.5px] font-medium"
            style={{ borderColor: C.borderStrong }}
          >
            All time <span style={{ color: C.fainter }}>▾</span>
          </div>
        }
      />

      <div className="flex flex-1 flex-col gap-4 overflow-auto px-[26px] pb-[90px] pt-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-[14px] md:grid-cols-4">
          <Kpi label="RESOLUTION RATE" value={pct(data.resolutionRate)} sub="self-served by techs" subColor={C.green} accent />
          <Kpi label="NEEDED A HUMAN" value={pct(data.escalationRate)} sub="escalated to ops" subColor={C.redInk} />
          <Kpi
            label="AVG TIME-TO-RESOLVE"
            value={data.avgResolutionSeconds != null ? <>{fmtDuration(data.avgResolutionSeconds)}</> : '—'}
            sub="across resolved runs"
          />
          <Kpi label="EMAIL OPEN / CLICK" value={pct(openRate)} sub={`click-through ${pct(clickRate)}`} />
        </div>

        {/* charts */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[380px] flex-[2] rounded-[14px] bg-white p-[18px_20px]" style={cardStyle}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-[15.5px] font-semibold">Runs over time</span>
              <span className="font-mono text-[11px]" style={{ color: C.fainter }}>
                by day
              </span>
            </div>
            <div className="flex h-[178px] items-end gap-[10px]">
              {data.runsOverTime.length ? (
                data.runsOverTime.map((d) => (
                  <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${d.date}: ${d.count}`}>
                    <div
                      className="rounded-t-[5px]"
                      style={{ background: C.blue, height: `${Math.max(6, (d.count / maxDay) * 100)}%` }}
                    />
                  </div>
                ))
              ) : (
                <div className="font-mono text-[12px]" style={{ color: C.fainter }}>
                  No runs yet.
                </div>
              )}
            </div>
            <div className="mt-3.5 flex gap-[18px] font-mono text-[11px]" style={{ color: C.muted }}>
              <span className="flex items-center gap-1.5">
                <span className="h-[11px] w-[11px] rounded-[3px]" style={{ background: C.blue }} />
                runs started
              </span>
            </div>
          </div>

          <div className="flex min-w-[240px] flex-1 flex-col rounded-[14px] bg-white p-[18px_20px]" style={cardStyle}>
            <span className="font-display text-[15.5px] font-semibold">Outcome split</span>
            <div
              className="flex h-[152px] w-[152px] items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${C.blue} 0 ${resPct}%, ${C.red} ${resPct}% 100%)`, margin: '14px auto 12px' }}
            >
              <div className="flex h-[98px] w-[98px] flex-col items-center justify-center rounded-full bg-white">
                <span className="font-display text-[26px] font-semibold tracking-[-.5px]">{pct(data.resolutionRate)}</span>
                <span className="text-[11px]" style={{ color: C.faint }}>
                  self-served
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: C.blue }} />
                Self-resolved
                <span className="ml-auto font-mono" style={{ color: C.muted }}>
                  {resolved}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: C.red }} />
                Escalated
                <span className="ml-auto font-mono" style={{ color: C.muted }}>
                  {escalated}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* bottom row */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[340px] flex-[1.4] rounded-[14px] bg-white p-[18px_20px]" style={cardStyle}>
            <span className="font-display text-[15.5px] font-semibold">Runs by status</span>
            <div className="mt-[15px] flex flex-col gap-[13px]">
              {statusEntries.length ? (
                statusEntries.map(([status, n]) => (
                  <div key={status}>
                    <div className="mb-1.5 flex justify-between font-mono text-[12px]">
                      <span>{status}</span>
                      <span style={{ color: C.faint }}>{n}</span>
                    </div>
                    <div className="h-[9px] overflow-hidden rounded-[5px]" style={{ background: '#eef0f4' }}>
                      <div
                        className="h-full rounded-[5px]"
                        style={{
                          width: `${(n / maxStatus) * 100}%`,
                          background: status === 'escalated' || status === 'failed' ? C.red : C.blue,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="font-mono text-[12px]" style={{ color: C.fainter }}>
                  No runs yet.
                </div>
              )}
            </div>
          </div>

          <div
            className="flex min-w-[240px] flex-1 flex-col justify-center rounded-[14px] p-[18px_20px]"
            style={{ border: `1px solid #d7e1fb`, background: 'linear-gradient(180deg,#f7f9ff,#eef3ff)', boxShadow: cardStyle.boxShadow }}
          >
            <div className="font-mono text-[10px] tracking-[.5px]" style={{ color: C.blue }}>
              TIME ABSORBED
            </div>
            <div className="mt-1.5 font-display text-[44px] font-semibold tracking-[-1.5px]">
              ~{absorbedHrs}
              <span className="text-[22px]" style={{ color: C.muted }}>
                {' '}
                hrs
              </span>
            </div>
            <div className="mt-1.5 text-[13.5px] leading-[1.5]" style={{ color: C.muted }}>
              of support effort handled without a human picking up.
            </div>
            <div className="mt-2.5 font-mono text-[11px]" style={{ color: C.faint }}>
              {data.totalRuns} total runs
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
