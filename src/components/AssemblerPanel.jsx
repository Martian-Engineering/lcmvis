/**
 * AssemblerPanel — shows how the LCM assembler constructs the model's
 * message array before each turn: an evictable summary prefix and a
 * guaranteed fresh tail.
 *
 * Props:
 *   phase — 0..3
 *     0: intro  — assembled items visible, simple budget bar
 *     1: zones  — split budget bar + zone labels appear
 *     2: xml    — summary item expands to show its XML wire format
 *     3: output — clean final view (same as 2, narration wraps it up)
 */
import { D1_SUMMARY, FRESH_TAIL_PLACEHOLDER, TOTAL_BUDGET } from '../data/conversation';

const SUMMARY_TOKENS = D1_SUMMARY.tokens;              // 580
const FRESH_TOKENS   = FRESH_TAIL_PLACEHOLDER.tokens;  // 480

// XML snippet shown at phase 2 — matches the architecture.md format exactly
const XML_LINES = [
  { text: '<summary',                                            color: 'var(--color-summary-d1)' },
  { text: '  id="sum_d1_01" kind="condensed" depth="1"',        color: 'var(--color-summary)' },
  { text: '  descendant_count="32"',                            color: 'var(--color-summary)' },
  { text: '  earliest_at="..." latest_at="...">',               color: 'var(--color-summary)' },
  { text: '  <parents>',                                        color: 'var(--color-summary-d1)' },
  { text: '    <summary_ref id="sum_01" />',                    color: 'var(--color-muted)' },
  { text: '    <summary_ref id="sum_02" />  …',                 color: 'var(--color-muted)' },
  { text: '  </parents>',                                       color: 'var(--color-summary-d1)' },
  { text: '  <content>',                                        color: 'var(--color-summary-d1)' },
  { text: '    Project arc: OAuth2 + RBAC…',                    color: 'var(--color-text)' },
  { text: '    Expand for details about:',                      color: 'var(--color-fresh)' },
  { text: '      exact token flows, middleware config…',        color: 'var(--color-fresh)' },
  { text: '  </content>',                                       color: 'var(--color-summary-d1)' },
  { text: '</summary>',                                         color: 'var(--color-summary-d1)' },
];

export default function AssemblerPanel({ phase }) {
  const summaryPct = (SUMMARY_TOKENS / TOTAL_BUDGET) * 100;
  const freshPct   = (FRESH_TOKENS   / TOTAL_BUDGET) * 100;

  const showZones = phase >= 1;
  const showXml   = phase >= 2;

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
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">

        {/* Evictable prefix label */}
        <div style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest shrink-0">
          EVICTABLE PREFIX
        </div>

        {/* D1 summary — collapses to XML view at phase 2 */}
        <div
          style={{
            background: 'rgba(0,0,0,0.15)',
            border: '1px solid rgba(240,136,62,0.28)',
            borderLeft: '2px solid var(--color-summary)',
          }}
          className="rounded px-2.5 py-2 flex flex-col gap-1 shrink-0"
        >
          {/* Collapsed header — always visible */}
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

          {/* Summary descriptor — shown when XML is hidden */}
          <div style={{
            color: 'var(--color-muted)',
            opacity: showXml ? 0 : 1,
            maxHeight: showXml ? 0 : '20px',
            overflow: 'hidden',
            transition: 'opacity 0.25s ease, max-height 0.3s ease',
          }} className="text-[9px] font-mono">
            {D1_SUMMARY.timeRange}
          </div>

          {/* XML wire format — expands at phase 2 */}
          <div style={{
            opacity: showXml ? 1 : 0,
            maxHeight: showXml ? '200px' : 0,
            overflow: 'hidden',
            transition: 'opacity 0.35s ease 0.1s, max-height 0.4s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div
              style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 4, marginTop: 4 }}
              className="px-2 py-1.5 flex flex-col"
            >
              {XML_LINES.map((line, i) => (
                <span key={i} style={{ color: line.color }} className="text-[8px] font-mono leading-relaxed whitespace-pre">
                  {line.text}
                </span>
              ))}
            </div>
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
            verbatim · reconstructed from parts
          </div>
        </div>
      </div>
    </div>
  );
}
