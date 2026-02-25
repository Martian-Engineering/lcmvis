/**
 * LifecyclePanel — full DAG lifecycle visualization for Section C.
 *
 * Shows the three-depth hierarchy (D0 → D1 → D2) and the depth-aware
 * summarization prompts used at each level.
 *
 * Props:
 *   phase — 0..1
 *     0: all three tiers visible (D2, D1, D0 groups)
 *     1: depth-aware prompt labels fade in on each tier
 */

// D2 covers all 64 turns
const D2 = { id: 'sum_d2_01', timeRange: 'T1–64', tokens: 840, descendantCount: 128 };

// Four D1 nodes, each covering 16 turns
const D1_NODES = [
  { id: 'sum_d1_01', timeRange: 'T1–16',  tokens: 580 },
  { id: 'sum_d1_02', timeRange: 'T17–32', tokens: 545 },
  { id: 'sum_d1_03', timeRange: 'T33–48', tokens: 560 },
  { id: 'sum_d1_04', timeRange: 'T49–64', tokens: 530 },
];

// Four D0 groups, each representing 4 leaf summaries
const D0_GROUPS = [
  { timeRange: 'T1–16',  count: 4 },
  { timeRange: 'T17–32', count: 4 },
  { timeRange: 'T33–48', count: 4 },
  { timeRange: 'T49–64', count: 4 },
];

// Prompt focus descriptions sourced from actual depth-specific prompts
const DEPTH_PROMPTS = {
  d0: 'Preserve specifics: decisions, rationale, technical details, file operations',
  d1: 'Distill the arc: outcomes, current state, what evolved and why',
  d2: 'Durable narrative: decisions still in effect, completed work, milestone timeline',
};

// Small 2×2 dot grid representing 4 leaf summaries in a group
function LeafDots({ color }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 6, height: 6,
            borderRadius: 2,
            background: color,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

// Fade-in prompt label chip
function PromptLabel({ text, color, visible }) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.45s ease 0.1s',
      color,
      fontSize: 8,
      fontFamily: 'monospace',
      lineHeight: 1.5,
      paddingTop: 4,
    }}>
      {text}
    </div>
  );
}

// Connector row — evenly spaced vertical tick marks between tiers
function Connector({ count, topColor, bottomColor }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-around',
      padding: '0 2px',
      height: 14,
      alignItems: 'center',
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: 1,
          height: 14,
          background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})`,
          opacity: 0.5,
        }} />
      ))}
    </div>
  );
}

export default function LifecyclePanel({ phase }) {
  const showPrompts = phase >= 1;

  return (
    <div
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      className="rounded-xl p-3 flex flex-col gap-0 h-full overflow-hidden"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0 mb-2.5">
        <span
          style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
          className="rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest shrink-0"
        >
          FULL LIFECYCLE
        </span>
        <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
          summary DAG · 3 depths · 64 turns
        </span>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

        {/* ── DEPTH 2 tier ─────────────────────────────────────────────────── */}
        <div style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest mb-1.5 shrink-0">
          DEPTH 2
        </div>
        <div
          style={{
            background: 'rgba(255,123,114,0.08)',
            border: '1px solid var(--color-budget-over)',
            borderLeft: '2px solid var(--color-budget-over)',
          }}
          className="rounded px-2.5 py-2 flex flex-col gap-0.5 shrink-0"
        >
          <div className="flex items-center gap-1.5">
            <span
              style={{ color: 'var(--color-budget-over)', borderColor: 'var(--color-budget-over)' }}
              className="rounded border px-1 py-0 text-[8px] font-bold"
            >
              D2
            </span>
            <span style={{ color: 'var(--color-budget-over)' }} className="text-[9px] font-mono">
              {D2.id}
            </span>
            <span style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono ml-auto tabular-nums">
              {D2.timeRange} · {D2.tokens} tok · {D2.descendantCount} msgs
            </span>
          </div>
          <PromptLabel text={DEPTH_PROMPTS.d2} color="var(--color-budget-over)" visible={showPrompts} />
        </div>

        {/* Connector D2 → D1 */}
        <Connector count={4} topColor="var(--color-budget-over)" bottomColor="var(--color-summary-d1)" />

        {/* ── DEPTH 1 tier ─────────────────────────────────────────────────── */}
        <div style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest mb-1.5 shrink-0">
          DEPTH 1
        </div>
        <div className="flex gap-1.5 shrink-0">
          {D1_NODES.map((n) => (
            <div
              key={n.id}
              style={{
                flex: '1 1 0',
                background: 'rgba(255,123,114,0.06)',
                border: '1px solid var(--color-summary-d1)',
              }}
              className="rounded px-1.5 py-1.5 flex flex-col gap-0.5"
            >
              <span style={{ color: 'var(--color-summary-d1)' }} className="text-[8px] font-mono font-bold">
                {n.id}
              </span>
              <span style={{ color: 'var(--color-muted)' }} className="text-[7px] font-mono">
                {n.timeRange}
              </span>
              <span style={{ color: 'var(--color-muted)' }} className="text-[7px] font-mono tabular-nums">
                {n.tokens} tok
              </span>
            </div>
          ))}
        </div>
        <PromptLabel text={DEPTH_PROMPTS.d1} color="var(--color-summary-d1)" visible={showPrompts} />

        {/* Connector D1 → D0 */}
        <Connector count={16} topColor="var(--color-summary-d1)" bottomColor="var(--color-summary)" />

        {/* ── DEPTH 0 tier ─────────────────────────────────────────────────── */}
        <div style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest mb-1.5 shrink-0">
          DEPTH 0 · LEAF
        </div>
        <div className="flex gap-1.5 shrink-0">
          {D0_GROUPS.map((g, i) => (
            <div
              key={i}
              style={{
                flex: '1 1 0',
                background: 'rgba(240,136,62,0.06)',
                border: '1px solid rgba(240,136,62,0.3)',
              }}
              className="rounded px-1.5 py-1.5 flex flex-col gap-1.5 items-center"
            >
              <LeafDots color="var(--color-summary)" />
              <span style={{ color: 'var(--color-muted)' }} className="text-[7px] font-mono text-center">
                {g.count} summaries
              </span>
              <span style={{ color: 'var(--color-muted)' }} className="text-[7px] font-mono text-center">
                {g.timeRange}
              </span>
            </div>
          ))}
        </div>
        <PromptLabel text={DEPTH_PROMPTS.d0} color="var(--color-summary)" visible={showPrompts} />

      </div>
    </div>
  );
}
