'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/app/lib/api';
import { usePrincipal } from '@/app/lib/principal';
import { Shell } from '@/components/Shell';
import { ScreenHeader } from '@/components/ScreenHeader';
import { C } from '@/components/ui';

// ── Types (steps/trigger are the raw camelCase JSON the backend stores) ───────
interface Button { label: string; action: 'resolve' | 'escalate' | 'link'; url?: string }
interface Block {
  type: 'text' | 'json' | 'code' | 'log' | 'ai_explanation' | 'actions';
  markdown?: string;
  source?: 'event_path' | 'static';
  path?: string;
  value?: string;
  language?: string;
  collapsedLines?: number;
  inputPath?: string;
  buttons?: Button[];
}
interface Step {
  id: string;
  order: number;
  channel: 'email' | 'slack' | 'teams';
  delay: { amount: number; unit: 'seconds' | 'minutes' | 'hours' | 'days' };
  waitForAction?: { timeoutHours: number; onTimeout: 'next_step' | 'end' };
  template: { subject?: string; blocks: Block[] };
}
interface Condition { path: string; op: string; value?: unknown }
interface Sequence {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  triggerRule: { eventType: string; conditions: Condition[] };
  steps: Step[];
}

const OPS = ['eq', 'neq', 'gt', 'lt', 'contains', 'exists'];
const BLOCK_TYPES: Block['type'][] = ['text', 'json', 'code', 'log', 'ai_explanation', 'actions'];
const uid = () => `s${Math.random().toString(36).slice(2, 8)}`;

function blankBlock(type: Block['type']): Block {
  switch (type) {
    case 'text': return { type, markdown: 'Your message…' };
    case 'json': return { type, source: 'event_path', path: '$.error' };
    case 'code': return { type, language: 'json', source: 'event_path', value: '$.error' };
    case 'log': return { type, source: 'event_path', path: '$.rawLog', collapsedLines: 12 };
    case 'ai_explanation': return { type, inputPath: '$.error' };
    case 'actions': return { type, buttons: [{ label: 'Mark resolved', action: 'resolve' }, { label: 'I need help', action: 'escalate' }] };
  }
}
function blankSequence(): Sequence {
  return {
    id: '',
    name: 'New sequence',
    status: 'draft',
    triggerRule: { eventType: 'metasys.api_error', conditions: [{ path: '$.error.status', op: 'gt', value: 400 }] },
    steps: [
      {
        id: uid(),
        order: 0,
        channel: 'email',
        delay: { amount: 0, unit: 'seconds' },
        waitForAction: { timeoutHours: 0.05, onTimeout: 'next_step' },
        template: { subject: 'Error {{ $.error.code }}', blocks: [blankBlock('text'), blankBlock('json'), blankBlock('ai_explanation'), blankBlock('actions')] },
      },
    ],
  };
}

const inputCls = 'w-full rounded-[9px] border bg-white px-3 py-2 text-[13px] outline-none';
const lblCls = 'mb-1.5 font-mono text-[10px] tracking-[.5px]';

export default function SequencesPage() {
  const router = useRouter();
  const { can, isLoading: pLoading } = usePrincipal();
  const qc = useQueryClient();
  const canWrite = can('sequences.write');

  const { data } = useQuery({
    queryKey: ['sequences'],
    queryFn: () => api<{ sequences: Sequence[] }>('/api/v1/sequences'),
  });

  const sequences = useMemo(() => data?.sequences ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Sequence | null>(null);
  const [sel, setSel] = useState<'trigger' | number>(0);
  const [err, setErr] = useState<string | null>(null);

  if (!pLoading && !can('sequences.read')) router.replace('/runs');

  // Load the first sequence (or the chosen one) into an editable draft.
  useEffect(() => {
    if (draft) return;
    if (sequences.length) {
      setSelectedId(sequences[0].id);
      setDraft(structuredClone(sequences[0]));
    }
  }, [sequences, draft]);

  function loadSequence(id: string) {
    if (id === 'new') {
      setSelectedId('new');
      setDraft(blankSequence());
    } else {
      const s = sequences.find((x) => x.id === id);
      if (s) {
        setSelectedId(id);
        setDraft(structuredClone(s));
      }
    }
    setSel(0);
    setErr(null);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const body = { name: draft.name, status: draft.status, triggerRule: draft.triggerRule, steps: draft.steps };
      if (draft.id) return api<{ sequence: Sequence }>(`/api/v1/sequences/${draft.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      return api<{ sequence: Sequence }>('/api/v1/sequences', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: (res) => {
      setErr(null);
      qc.invalidateQueries({ queryKey: ['sequences'] });
      if (res?.sequence) { setSelectedId(res.sequence.id); setDraft(structuredClone(res.sequence)); }
    },
    onError: (e: unknown) => setErr((e as Error).message || 'save failed — check fields'),
  });

  const del = useMutation({
    mutationFn: () => api(`/api/v1/sequences/${draft?.id}`, { method: 'DELETE' }),
    onSuccess: () => { setDraft(null); setSelectedId(null); qc.invalidateQueries({ queryKey: ['sequences'] }); },
  });

  // ── immutable update helpers ────────────────────────────────────────────────
  const patch = (p: Partial<Sequence>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const patchStep = (i: number, p: Partial<Step>) =>
    setDraft((d) => (d ? { ...d, steps: d.steps.map((s, idx) => (idx === i ? { ...s, ...p } : s)) } : d));
  const patchBlocks = (i: number, blocks: Block[]) => patchStep(i, { template: { ...draft!.steps[i].template, blocks } });

  return (
    <Shell>
      <ScreenHeader
        title="Sequences"
        subtitle="Build the drip recipe that runs on matching errors"
        right={
          <div className="flex items-center gap-2.5">
            <select
              value={selectedId ?? ''}
              onChange={(e) => loadSequence(e.target.value)}
              className="h-[38px] rounded-[10px] border bg-white px-3 text-[13px] outline-none"
              style={{ borderColor: C.borderStrong }}
            >
              {sequences.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              {selectedId === 'new' ? <option value="new">New sequence…</option> : null}
            </select>
            {canWrite ? (
              <button onClick={() => loadSequence('new')} className="h-[38px] rounded-[10px] border bg-white px-3.5 text-[13px] font-medium" style={{ borderColor: C.borderStrong }}>
                + New
              </button>
            ) : null}
            {canWrite && draft ? (
              <button onClick={() => save.mutate()} disabled={save.isPending} className="h-[38px] rounded-[10px] px-4 text-[13.5px] font-semibold text-white disabled:opacity-50" style={{ background: C.blue, boxShadow: '0 4px 12px rgba(47,95,208,.28)' }}>
                {save.isPending ? 'Saving…' : draft.id ? 'Save changes' : 'Create sequence'}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-1 justify-center gap-[26px] overflow-auto px-[26px] pb-[90px] pt-7">
        {!draft ? (
          <div className="font-mono text-[13px]" style={{ color: C.fainter }}>
            {sequences.length ? 'Select a sequence…' : 'No sequences yet — click + New.'}
          </div>
        ) : (
          <>
            {/* FLOW */}
            <div className="flex w-full max-w-[480px] flex-col">
              {err ? (
                <div className="mb-3 rounded-[10px] p-[10px_12px] text-[12.5px]" style={{ border: `1px solid ${C.redBorder}`, background: C.redTint, color: C.redInk }}>
                  {err}
                </div>
              ) : null}

              <div className="mb-3 flex items-center gap-2.5">
                <input
                  disabled={!canWrite}
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  className="flex-1 rounded-[10px] border bg-white px-3 py-2 font-display text-[16px] font-semibold outline-none"
                  style={{ borderColor: C.border }}
                />
                <select
                  disabled={!canWrite}
                  value={draft.status}
                  onChange={(e) => patch({ status: e.target.value as Sequence['status'] })}
                  className="rounded-[9px] border bg-white px-2.5 py-2 text-[12.5px] font-medium outline-none"
                  style={{ borderColor: C.borderStrong, color: draft.status === 'active' ? C.green : draft.status === 'paused' ? C.amberInk : C.muted }}
                >
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                </select>
              </div>

              {/* trigger node */}
              <Node active={sel === 'trigger'} onClick={() => setSel('trigger')}>
                <div className="mb-2 font-mono text-[10px] tracking-[.5px]" style={{ color: C.fainter }}>WHEN · TRIGGER</div>
                <div className="flex flex-wrap items-center gap-2">
                  {draft.triggerRule.conditions.map((c, i) => (
                    <span key={i} className="rounded-[7px] px-[9px] py-[5px] font-mono text-[12px]" style={{ border: `1px solid ${C.borderStrong}`, background: '#fafbfc' }}>
                      {c.path.replace('$.', '')} {c.op} {c.value != null ? String(c.value) : ''}
                    </span>
                  ))}
                </div>
              </Node>

              {draft.steps.map((s, i) => {
                const escalate = s.channel !== 'email';
                return (
                  <div key={s.id}>
                    <div className="mx-auto h-[22px] w-0.5" style={{ background: '#d7dbe4' }} />
                    <Node active={sel === i} onClick={() => setSel(i)}>
                      <div className="flex items-center gap-[11px]">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-bold text-white" style={{ background: escalate ? C.red : C.blue }}>{i + 1}</span>
                        <span className="font-display text-[15.5px] font-semibold">{s.template.subject || `${s.channel} step`}</span>
                        <span className="ml-auto font-mono text-[10px]" style={{ color: C.fainter }}>{s.channel}</span>
                      </div>
                      <div className="ml-[39px] mt-1.5 text-[12.5px]" style={{ color: C.faint }}>
                        {s.template.blocks.map((b) => b.type).join(' · ')}
                        {s.waitForAction ? ` · waits ${s.waitForAction.timeoutHours}h` : ''}
                      </div>
                    </Node>
                  </div>
                );
              })}

              {canWrite ? (
                <button
                  onClick={() => { patch({ steps: [...draft.steps, { id: uid(), order: draft.steps.length, channel: 'email', delay: { amount: 0, unit: 'seconds' }, template: { subject: 'Follow-up', blocks: [blankBlock('text'), blankBlock('actions')] } }] }); setSel(draft.steps.length); }}
                  className="mt-[18px] rounded-[12px] p-[12px] text-center text-[14px]"
                  style={{ border: `1.5px dashed #c2c8d4`, color: C.fainter }}
                >
                  + Add step
                </button>
              ) : null}

              {canWrite && draft.id ? (
                <button onClick={() => { if (confirm('Delete this sequence?')) del.mutate(); }} className="mt-3 self-start text-[12.5px] font-medium" style={{ color: C.redInk }}>
                  Delete sequence
                </button>
              ) : null}
            </div>

            {/* EDITOR */}
            <div className="flex w-[340px] shrink-0 flex-col gap-4 self-start rounded-[14px] border bg-white p-[18px]" style={{ borderColor: C.border, boxShadow: '0 1px 2px rgba(16,18,26,.04)', position: 'sticky', top: 0 }}>
              {sel === 'trigger' ? (
                <TriggerEditor draft={draft} patch={patch} disabled={!canWrite} />
              ) : (
                <StepEditor
                  step={draft.steps[sel as number]}
                  idx={sel as number}
                  patchStep={patchStep}
                  patchBlocks={patchBlocks}
                  removeStep={() => { const i = sel as number; patch({ steps: draft.steps.filter((_, x) => x !== i) }); setSel(Math.max(0, i - 1)); }}
                  disabled={!canWrite}
                />
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

function Node({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClick} className="cursor-pointer rounded-[14px] bg-white p-[15px_16px] transition-all" style={{ border: `1.5px solid ${active ? C.blue : C.border}`, boxShadow: active ? '0 0 0 3px #e3ebfd' : '0 1px 2px rgba(16,18,26,.04)' }}>
      {children}
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div className={lblCls} style={{ color: C.fainter }}>{children}</div>;
}

function TriggerEditor({ draft, patch, disabled }: { draft: Sequence; patch: (p: Partial<Sequence>) => void; disabled: boolean }) {
  const tr = draft.triggerRule;
  const setConds = (conditions: Condition[]) => patch({ triggerRule: { ...tr, conditions } });
  return (
    <div className="flex flex-col gap-4">
      <div className="font-display text-[16.5px] font-semibold">Trigger · when to start</div>
      <div>
        <Lbl>EVENT TYPE</Lbl>
        <input disabled={disabled} value={tr.eventType} onChange={(e) => patch({ triggerRule: { ...tr, eventType: e.target.value } })} className={inputCls} style={{ borderColor: C.borderStrong }} />
      </div>
      <div>
        <Lbl>CONDITIONS (ALL MUST MATCH)</Lbl>
        <div className="flex flex-col gap-2">
          {tr.conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input disabled={disabled} value={c.path} onChange={(e) => setConds(tr.conditions.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)))} className="flex-1 rounded-[8px] border bg-white px-2 py-1.5 font-mono text-[12px] outline-none" style={{ borderColor: C.borderStrong }} placeholder="$.error.status" />
              <select disabled={disabled} value={c.op} onChange={(e) => setConds(tr.conditions.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))} className="rounded-[8px] border bg-white px-1.5 py-1.5 text-[12px]" style={{ borderColor: C.borderStrong }}>
                {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              {c.op !== 'exists' ? (
                <input disabled={disabled} value={c.value != null ? String(c.value) : ''} onChange={(e) => { const v: string = e.target.value; const num = Number(v); setConds(tr.conditions.map((x, j) => (j === i ? { ...x, value: v !== '' && !Number.isNaN(num) ? num : v } : x))); }} className="w-[68px] rounded-[8px] border bg-white px-2 py-1.5 font-mono text-[12px] outline-none" style={{ borderColor: C.borderStrong }} placeholder="val" />
              ) : null}
              {!disabled ? <button onClick={() => setConds(tr.conditions.filter((_, j) => j !== i))} style={{ color: C.fainter }}>✕</button> : null}
            </div>
          ))}
          {!disabled ? (
            <button onClick={() => setConds([...tr.conditions, { path: '$.error.code', op: 'eq', value: '' }])} className="self-start text-[13px] font-medium" style={{ color: C.blue }}>+ Add condition</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepEditor({ step, idx, patchStep, patchBlocks, removeStep, disabled }: {
  step: Step; idx: number;
  patchStep: (i: number, p: Partial<Step>) => void;
  patchBlocks: (i: number, blocks: Block[]) => void;
  removeStep: () => void;
  disabled: boolean;
}) {
  const setBlock = (bi: number, p: Partial<Block>) => patchBlocks(idx, step.template.blocks.map((b, j) => (j === bi ? { ...b, ...p } : b)));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-[16.5px] font-semibold">Step {idx + 1}</div>
        {!disabled ? <button onClick={removeStep} className="text-[12px] font-medium" style={{ color: C.redInk }}>Remove</button> : null}
      </div>

      <div>
        <Lbl>CHANNEL</Lbl>
        <select disabled={disabled} value={step.channel} onChange={(e) => patchStep(idx, { channel: e.target.value as Step['channel'] })} className={inputCls} style={{ borderColor: C.borderStrong }}>
          {['email', 'slack', 'teams'].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <Lbl>SUBJECT</Lbl>
        <input disabled={disabled} value={step.template.subject ?? ''} onChange={(e) => patchStep(idx, { template: { ...step.template, subject: e.target.value } })} className={inputCls} style={{ borderColor: C.borderStrong }} placeholder="Use {{ $.error.code }} for interpolation" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Lbl>WAIT (HOURS)</Lbl>
          <input disabled={disabled} type="number" step="0.01" value={step.waitForAction?.timeoutHours ?? ''} onChange={(e) => { const v = e.target.value; patchStep(idx, { waitForAction: v === '' ? undefined : { timeoutHours: Number(v), onTimeout: step.waitForAction?.onTimeout ?? 'next_step' } }); }} className={inputCls} style={{ borderColor: C.borderStrong }} placeholder="none" />
        </div>
        <div className="flex-1">
          <Lbl>ON TIMEOUT</Lbl>
          <select disabled={disabled || !step.waitForAction} value={step.waitForAction?.onTimeout ?? 'next_step'} onChange={(e) => patchStep(idx, { waitForAction: { timeoutHours: step.waitForAction?.timeoutHours ?? 0.05, onTimeout: e.target.value as 'next_step' | 'end' } })} className={inputCls} style={{ borderColor: C.borderStrong }}>
            <option value="next_step">next step</option>
            <option value="end">end (escalate)</option>
          </select>
        </div>
      </div>

      <div>
        <Lbl>CONTENT BLOCKS</Lbl>
        <div className="flex flex-col gap-2.5">
          {step.template.blocks.map((b, bi) => (
            <div key={bi} className="rounded-[10px] border p-2.5" style={{ borderColor: C.border, background: '#fafbfc' }}>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold" style={{ color: C.blue }}>{b.type}</span>
                {!disabled ? <button onClick={() => patchBlocks(idx, step.template.blocks.filter((_, j) => j !== bi))} style={{ color: C.fainter }}>✕</button> : null}
              </div>
              <BlockFields block={b} disabled={disabled} set={(p) => setBlock(bi, p)} />
            </div>
          ))}
          {!disabled ? (
            <div className="flex items-center gap-2">
              <select id={`addblk-${idx}`} className="rounded-[8px] border bg-white px-2 py-1.5 text-[12px]" style={{ borderColor: C.borderStrong }} defaultValue="text">
                {BLOCK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={() => { const el = document.getElementById(`addblk-${idx}`) as HTMLSelectElement; patchBlocks(idx, [...step.template.blocks, blankBlock(el.value as Block['type'])]); }}
                className="text-[13px] font-medium" style={{ color: C.blue }}
              >
                + Add block
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BlockFields({ block, set, disabled }: { block: Block; set: (p: Partial<Block>) => void; disabled: boolean }) {
  const inp = 'w-full rounded-[7px] border bg-white px-2 py-1.5 text-[12px] outline-none';
  if (block.type === 'text') {
    return <textarea disabled={disabled} value={block.markdown ?? ''} onChange={(e) => set({ markdown: e.target.value })} rows={3} className={inp} style={{ borderColor: C.borderStrong, fontFamily: 'inherit' }} />;
  }
  if (block.type === 'ai_explanation') {
    return <input disabled={disabled} value={block.inputPath ?? ''} onChange={(e) => set({ inputPath: e.target.value })} className={`${inp} font-mono`} style={{ borderColor: C.borderStrong }} placeholder="$.error" />;
  }
  if (block.type === 'actions') {
    return (
      <div className="flex flex-col gap-1.5">
        {(block.buttons ?? []).map((btn, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input disabled={disabled} value={btn.label} onChange={(e) => set({ buttons: block.buttons!.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={inp} style={{ borderColor: C.borderStrong }} />
            <select disabled={disabled} value={btn.action} onChange={(e) => set({ buttons: block.buttons!.map((x, j) => (j === i ? { ...x, action: e.target.value as Button['action'] } : x)) })} className="rounded-[7px] border bg-white px-1.5 py-1.5 text-[12px]" style={{ borderColor: C.borderStrong }}>
              {['resolve', 'escalate', 'link'].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            {!disabled ? <button onClick={() => set({ buttons: block.buttons!.filter((_, j) => j !== i) })} style={{ color: C.fainter }}>✕</button> : null}
          </div>
        ))}
        {!disabled ? <button onClick={() => set({ buttons: [...(block.buttons ?? []), { label: 'Button', action: 'resolve' }] })} className="self-start text-[12px] font-medium" style={{ color: C.blue }}>+ Button</button> : null}
      </div>
    );
  }
  // json / code / log → source + path
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <select disabled={disabled} value={block.source ?? 'event_path'} onChange={(e) => set({ source: e.target.value as Block['source'] })} className="rounded-[7px] border bg-white px-1.5 py-1.5 text-[12px]" style={{ borderColor: C.borderStrong }}>
          <option value="event_path">event_path</option>
          <option value="static">static</option>
        </select>
        {block.type === 'code' ? (
          <input disabled={disabled} value={block.language ?? 'json'} onChange={(e) => set({ language: e.target.value })} className={`${inp} font-mono`} style={{ borderColor: C.borderStrong }} placeholder="language" />
        ) : null}
      </div>
      <input disabled={disabled} value={(block.type === 'code' ? block.value : block.path) ?? ''} onChange={(e) => set(block.type === 'code' ? { value: e.target.value } : { path: e.target.value })} className={`${inp} font-mono`} style={{ borderColor: C.borderStrong }} placeholder="$.error" />
      {block.type === 'log' ? (
        <input disabled={disabled} type="number" value={block.collapsedLines ?? 12} onChange={(e) => set({ collapsedLines: Number(e.target.value) })} className={`${inp} font-mono`} style={{ borderColor: C.borderStrong }} placeholder="collapsed lines" />
      ) : null}
    </div>
  );
}
