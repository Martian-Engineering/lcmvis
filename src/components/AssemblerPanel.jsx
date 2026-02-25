/**
 * AssemblerPanel — shows how the LCM assembler constructs the model's
 * message array before each turn: an evictable summary prefix and a
 * guaranteed fresh tail.
 *
 * Props:
 *   phase — 0..3
 *     0: intro    — assembled items visible, simple budget bar
 *     1: zones    — split budget bar + zone labels appear
 *     2: eviction — oldest item annotated with eviction note
 *     3: output   — clean final view (same as 2, narration wraps it up)
 */
import { D1_SUMMARY, FRESH_TAIL_PLACEHOLDER, TOTAL_BUDGET } from '../data/conversation';

const SUMMARY_TOKENS = D1_SUMMARY.tokens;              // 580
const FRESH_TOKENS   = FRESH_TAIL_PLACEHOLDER.tokens;  // 480

export default function AssemblerPanel({ phase }) {
  const summaryPct   = (SUMMARY_TOKENS / TOTAL_BUDGET) * 100;
  const freshPct     = (FRESH_TOKENS   / TOTAL_BUDGET) * 100;

  const showZones    = phase >= 1;
  const showEviction = phase >= 2;

  return (
    <div
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      className="rounded-xl p-3 flex flex-col gap-2.5 h-full overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
          className="rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest shrink-0"
        >
          ASSEMBLER
        </span>
        <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
          context → model API
        </span>
      </div>

      {/* ── Two-zone budget bar ──────────────────────────────────────────────── */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span style={{ color: 'var(--color-muted)' }} className="text-[9px] uppercase tracking-widest">
            Token Budget
          </span>
          <span style={{ color: 'var(--color-muted)' }} className="text-[9px] tabular-nums">
            {(SUMMARY_TOKENS + FRESH_TOKENS).toLocaleString()} / {TOTAL_BUDGET.toLocaleString()} tok
          </span>
        </div>

        {/* Track — summary fill left, fresh tail anchored right */}
        <div
          style={{ background: 'var(--color-border)', position: 'relative' }}
          className="h-2 w-full rounded-full overflow-hidden"
        >
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${summaryPct}%`,
            background: 'var(--color-summary)',
          }} />
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: `${freshPct}%`,
            background: 'var(--color-fresh)',
            opacity: showZones ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }} />
        </div>

        {/* Zone labels — appear at phase 1 */}
        <div style={{
          opacity: showZones ? 1 : 0,
          transition: 'opacity 0.4s ease 0.15s',
          pointerEvents: 'none',
        }} className="flex justify-between mt-1">
          <span style={{ color: 'var(--color-summary)' }} className="text-[8px] font-mono">
            ← summaries · {SUMMARY_TOKENS} tok
          </span>
          <span style={{ color: 'var(--color-fresh)' }} className="text-[8px] font-mono">
            fresh tail · {FRESH_TOKENS} tok →
          </span>
        </div>
      </div>

      {/* ── Assembled items ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">

        {/* Evictable prefix label */}
        <div style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest shrink-0">
          EVICTABLE PREFIX
        </div>

        {/* D1 summary — annotated with eviction note at phase 2 */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: showEviction
              ? '1px solid rgba(255,123,114,0.45)'
              : '1px solid rgba(240,136,62,0.28)',
            borderLeft: showEviction
              ? '2px solid var(--color-summary-d1)'
              : '2px solid var(--color-summary)',
            transition: 'border-color 0.4s ease',
          }}
          className="rounded px-2.5 py-2 flex flex-col gap-1 shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <span
              style={{ color: 'var(--color-summary-d1)', borderColor: 'var(--color-summary-d1)' }}
              className="rounded border px-1 py-0 text-[8px] font-bold"
            >
              DEPTH 1
            </span>
            <span style={{ color: 'var(--color-summary-d1)' }} className="text-[9px] font-mono">
              {D1_SUMMARY.id}
            </span>
            <span style={{ color: 'var(--color-muted)' }} className="text-[9px] ml-auto tabular-nums">
              {SUMMARY_TOKENS} tok
            </span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
            {D1_SUMMARY.timeRange}
          </div>
          {/* Eviction annotation — appears at phase 2 */}
          <div style={{
            color: 'var(--color-summary-d1)',
            opacity: showEviction ? 1 : 0,
            maxHeight: showEviction ? '20px' : 0,
            overflow: 'hidden',
            transition: 'opacity 0.35s ease, max-height 0.35s ease',
          }} className="text-[8px] font-mono">
            ↑ oldest — dropped first if budget exceeded · still in DAG
          </div>
        </div>

        {/* Fresh tail label */}
        <div style={{
          color: 'var(--color-fresh)',
          opacity: showZones ? 1 : 0.35,
          transition: 'opacity 0.4s ease',
        }} className="text-[8px] font-mono tracking-widest shrink-0 flex items-center gap-2">
          FRESH TAIL
          <span style={{
            color: 'var(--color-fresh)',
            borderColor: 'var(--color-fresh)',
            opacity: showZones ? 1 : 0,
            transition: 'opacity 0.35s ease 0.1s',
          }} className="rounded border px-1 py-0 text-[8px] font-bold">
            ALWAYS INCLUDED
          </span>
        </div>

        {/* Fresh tail item */}
        <div
          style={{
            background: 'rgba(86,211,100,0.04)',
            border: '1px dashed rgba(86,211,100,0.3)',
            borderLeft: '2px solid var(--color-fresh)',
          }}
          className="rounded px-2.5 py-2 flex flex-col gap-1 shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--color-fresh)' }} className="text-[9px] font-mono">
              4 recent messages
            </span>
            <span style={{ color: 'var(--color-muted)' }} className="text-[9px] ml-auto tabular-nums">
              ~{FRESH_TOKENS} tok
            </span>
          </div>
          <div style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
            verbatim · protected from eviction
          </div>
        </div>
      </div>
    </div>
  );
}
