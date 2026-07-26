'use client';

import type { ReactNode } from 'react';
import { C } from './ui';

/** The white screen header bar shared by Pipeline / Sequences / Analytics / Integrations. */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-5 bg-white px-[26px] py-[18px]"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <div>
        <h1 className="m-0 font-display text-[23px] font-semibold tracking-[-.5px]">{title}</h1>
        <div className="mt-[3px] font-mono text-[13px]" style={{ color: C.faint }}>
          {subtitle}
        </div>
      </div>
      {right ? <div className="ml-auto flex items-center gap-[10px]">{right}</div> : null}
    </div>
  );
}
