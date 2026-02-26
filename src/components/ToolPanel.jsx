/**
 * ToolPanel — simulated lcm_describe, lcm_grep, and lcm_expand_query tool call visualizations.
 *
 * Props:
 *   view        — 'overview' | 'describe' | 'grep' | 'expand'
 *   expandPhase — 1..3 (expand only: 1=grant+spawn+d1read, 2=summary expand, 3=synthesis done)
 */
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useRef } from 'react';

// ── Overview data ───────────────────────────────────────────────────────────────
const TOOL_OVERVIEW = [
  {
    name: 'lcm_describe',
    color: 'var(--color-summary)',
    description: 'Inspect any node in the DAG. Returns token count, time range, depth, child IDs, and a content snippet — a structural map before retrieval begins.',
  },
  {
    name: 'lcm_grep',
    color: 'var(--color-summary)',
    description: 'Full-text search across every node — raw messages and summaries alike. Results ranked with node IDs, depth labels, and matching snippets.',
  },
  {
    name: 'lcm_expand_query',
    color: 'var(--color-summary-d1)',
    description: 'Expand any summary back to its source messages via a bounded sub-agent. Full-fidelity recall without loading the full history into the main context.',
  },
];

// ── Describe simulation data ────────────────────────────────────────────────────
const DESCRIBE_NODE = {
  id:        'sum_d2_01',
  depth:     2,
  tokens:    840,
  descTok:   20480,   // total tokens in subtree
  srcTok:    18200,   // source message tokens below
  timeRange: 'Turns 1–64',
  children:  ['sum_d1_01', 'sum_d1_02', 'sum_d1_03', 'sum_d1_04'],
  manifest: [
    { id: 'sum_d1_01', tokens: 580, descTok: 5240, label: 'Turns 1–16' },
    { id: 'sum_d1_02', tokens: 545, descTok: 5100, label: 'Turns 17–32' },
    { id: 'sum_d1_03', tokens: 560, descTok: 5200, label: 'Turns 33–48' },
    { id: 'sum_d1_04', tokens: 530, descTok: 4940, label: 'Turns 49–64' },
  ],
  snippet: 'Full project arc (64 turns): auth system (OAuth2 + RBAC), containerized and deployed to Kubernetes, observability and performance tuning, full feature set shipped, security hardened and load tested.',
};

// ── Grep simulation data ────────────────────────────────────────────────────────
// lcm_grep searches BOTH raw messages and summaries (scope="both" by default)
const GREP_RESULTS = [
  {
    id: 'm1',
    label: 'MSG',
    color: 'var(--color-user)',
    borderFaint: 'rgba(56,139,253,0.18)',
    timeRange: 'Turn 1',
    snippet: 'Can you help me set up the OAuth2 flow for my app?',
  },
  {
    id: 'm4',
    label: 'MSG',
    color: 'var(--color-user)',
    borderFaint: 'rgba(56,139,253,0.18)',
    timeRange: 'Turn 2',
    snippet: 'That CORS error usually means the redirect URI wasn\'t registered correctly in your OAuth2 provider settings.',
  },
  {
    id: 'sum_01',
    label: 'SUMMARY · DEPTH 0',
    color: 'var(--color-summary)',
    borderFaint: 'rgba(240,136,62,0.2)',
    timeRange: 'Turns 1–4',
    snippet: 'OAuth2 setup: installed client, resolved CORS via redirect URI config, implemented token persistence with localStorage…',
  },
  {
    id: 'sum_d1_01',
    label: 'SUMMARY · DEPTH 1',
    color: 'var(--color-summary-d1)',
    borderFaint: 'rgba(255,123,114,0.2)',
    timeRange: 'Turns 1–16',
    snippet: 'Project arc: OAuth2 + RBAC auth built from scratch, audit logging and rate limiting added, CI/CD pipeline configured…',
  },
];

// ── Expand simulation data ──────────────────────────────────────────────────────
// Main agent actions: shown above the sub-agent box (phase 1+)
const MAIN_AGENT_LINES = [
  { minPhase: 1, accent: true,  text: '✓  Sub-agent spawned' },
  { minPhase: 1, accent: false, text: '   task: expand DAG around "refresh token"' },
];

// Sub-agent traversal log: shown inside the framed sub-agent box
const SUB_AGENT_LINES = [
  { minPhase: 1, accent: true,  text: '⟶  Reading sum_d1_01  (580 tok)' },
  { minPhase: 2, accent: true,  text: '⟶  Expanding sum_01 · Turns 1–4' },
  { minPhase: 2, accent: false, text: '    Fetching 8 source messages…' },
  { minPhase: 3, accent: true,  text: '✓  Synthesis complete' },
];

const EXPAND_RESPONSE = [
  'The refresh token flow (Turn 4) uses a rotating-token strategy.',
  'Client POSTs to /auth/token; server validates, issues a new access +',
  'refresh pair, and invalidates the old tokens atomically.',
  'Implemented via an axios response interceptor in refreshTokenClient.js.',
];

// ── Component ────────────────────────────────────────────────────────────────────
export default function ToolPanel({ view, expandPhase }) {
  const grepRowRefs     = useRef([]);
  const describeCardRef = useRef(null);
  const overviewCardRefs = useRef([]);

  // Overview: set initial opacity before paint, then stagger in
  useLayoutEffect(() => {
    if (view !== 'overview') return;
    const els = overviewCardRefs.current.filter(Boolean);
    gsap.set(els, { opacity: 0, y: 10 });
  }, [view]);

  useEffect(() => {
    if (view !== 'overview') return;
    const els = overviewCardRefs.current.filter(Boolean);
    if (!els.length) return;
    gsap.to(els, { opacity: 1, y: 0, duration: 0.35, stagger: 0.12, ease: 'power2.out', delay: 0.15 });
  }, [view]);

  // Grep: set initial opacity before paint to avoid React/GSAP style conflict
  useLayoutEffect(() => {
    if (view !== 'grep') return;
    const els = grepRowRefs.current.filter(Boolean);
    gsap.set(els, { opacity: 0, y: 6 });
  }, [view]);

  // Grep: stagger results in after mount
  useEffect(() => {
    if (view !== 'grep') return;
    const els = grepRowRefs.current.filter(Boolean);
    if (!els.length) return;
    gsap.to(els, { opacity: 1, y: 0, duration: 0.32, stagger: 0.1, ease: 'power2.out', delay: 0.2 });
  }, [view]);

  // Describe: fade card in after mount
  useLayoutEffect(() => {
    if (view !== 'describe' || !describeCardRef.current) return;
    gsap.set(describeCardRef.current, { opacity: 0, y: 8 });
  }, [view]);

  useEffect(() => {
    if (view !== 'describe' || !describeCardRef.current) return;
    gsap.to(describeCardRef.current, { opacity: 1, y: 0, duration: 0.38, delay: 0.2, ease: 'power2.out' });
  }, [view]);

  const isOverview = view === 'overview';
  const isDescribe = view === 'describe';
  const isGrep     = view === 'grep';
  const isExpand   = view === 'expand';

  // ── Overview: early return with dedicated layout ─────────────────────────
  if (isOverview) {
    return (
      <div
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        className="rounded-xl p-3 flex flex-col gap-3 h-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            style={{ color: 'var(--color-summary)', borderColor: 'var(--color-summary)' }}
            className="rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest shrink-0"
          >
            LCM TOOLS
          </span>
          <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
            3 retrieval primitives
          </span>
        </div>

        {/* Tool cards — staggered in via GSAP */}
        <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto min-h-0">
          {TOOL_OVERVIEW.map((tool, i) => (
            <div
              key={tool.name}
              ref={(el) => { overviewCardRefs.current[i] = el; }}
              style={{
                background: 'rgba(0,0,0,0.15)',
                border: `1px solid color-mix(in srgb, ${tool.color} 30%, transparent)`,
                borderLeft: `2px solid ${tool.color}`,
              }}
              className="rounded px-3 py-2.5 flex flex-col gap-1.5"
            >
              <span style={{ color: tool.color }} className="text-[11px] font-mono font-semibold">
                {tool.name}
              </span>
              <p style={{ color: 'var(--color-muted)' }} className="m-0 text-[10px] leading-relaxed">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Individual tool views ──────────────────────────────────────────────────
  const toolName = isDescribe ? 'lcm_describe' : isGrep ? 'lcm_grep' : 'lcm_expand_query';

  const command = isDescribe
    ? 'lcm_describe node_id="sum_d2_01"'
    : isGrep
    ? 'lcm_grep query="OAuth2" scope="both"'
    : 'lcm_expand_query(query="refresh token", prompt="How does the refresh token flow work?")';

  return (
    <div
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      className="rounded-xl p-3 flex flex-col gap-2 h-full overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
          className="rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest shrink-0"
        >
          LCM TOOL
        </span>
        <span style={{ color: 'var(--color-text)' }} className="text-[11px] font-semibold font-mono">
          {toolName}
        </span>
      </div>

      {/* ── Command ──────────────────────────────────────────────────────────── */}
      <div
        style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)' }}
        className="rounded px-2 py-1.5 shrink-0"
      >
        <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">{'> '}</span>
        <span
          style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}
          className="text-[9px] font-mono"
        >
          {command}
        </span>
      </div>

      {/* ── Output ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">

        {/* ── Describe output ─────────────────────────────────────────────── */}
        {isDescribe && (
          <>
            <div style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
              ✓ node found
            </div>
            <div
              ref={describeCardRef}
              style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,215,205,0.25)',
                borderLeft: '2px solid var(--color-summary-d2)',
              }}
              className="rounded px-2.5 py-2 flex flex-col gap-1.5"
            >
              {/* Node badge row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  style={{ color: 'var(--color-summary-d2)', borderColor: 'var(--color-summary-d2)' }}
                  className="rounded border px-1 py-0 text-[8px] font-bold shrink-0"
                >
                  SUMMARY · DEPTH 2
                </span>
                <span style={{ color: 'var(--color-summary-d2)' }} className="text-[10px] font-mono font-semibold">
                  {DESCRIBE_NODE.id}
                </span>
                <span style={{ color: 'var(--color-muted)' }} className="text-[9px] ml-auto tabular-nums">
                  {DESCRIBE_NODE.tokens} tok
                </span>
              </div>
              {/* Fields */}
              <div className="flex flex-col gap-1">
                {[
                  ['timeRange', DESCRIBE_NODE.timeRange],
                  ['depth',     String(DESCRIBE_NODE.depth)],
                  ['descTok',   DESCRIBE_NODE.descTok.toLocaleString()],
                  ['srcTok',    DESCRIBE_NODE.srcTok.toLocaleString()],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-1.5">
                    <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono w-16 shrink-0">{k}</span>
                    <span style={{ color: 'var(--color-text)' }} className="text-[9px] font-mono">{v}</span>
                  </div>
                ))}
              </div>
              {/* Manifest — D1 children with token costs */}
              <div className="flex flex-col gap-0.5 mt-0.5">
                <span style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest mb-0.5">
                  MANIFEST
                </span>
                {DESCRIBE_NODE.manifest.map((child) => (
                  <div key={child.id} className="flex items-center gap-1.5">
                    <span style={{ color: 'var(--color-summary-d1)' }} className="text-[9px] font-mono font-semibold">
                      {child.id}
                    </span>
                    <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
                      {child.label}
                    </span>
                    <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono ml-auto tabular-nums">
                      {child.tokens} tok
                    </span>
                  </div>
                ))}
              </div>
              {/* Snippet */}
              <p style={{ color: 'var(--color-muted)' }} className="m-0 text-[9px] font-mono leading-relaxed line-clamp-3">
                {DESCRIBE_NODE.snippet}
              </p>
            </div>
          </>
        )}

        {/* ── Grep results ─────────────────────────────────────────────────── */}
        {isGrep && (
          <>
            <div
              ref={(el) => { grepRowRefs.current[0] = el; }}
              style={{ color: 'var(--color-muted)' }}
              className="text-[9px] font-mono"
            >
              ✓ 4 matches found (2 messages · 2 summaries)
            </div>
            {GREP_RESULTS.map((r, i) => (
              <div
                key={r.id}
                ref={(el) => { grepRowRefs.current[i + 1] = el; }}
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: `1px solid ${r.borderFaint}`,
                  borderLeft: `2px solid ${r.color}`,
                }}
                className="rounded px-2 py-1.5 flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    style={{ color: r.color, borderColor: r.color }}
                    className="rounded border px-1 py-0 text-[8px] font-bold shrink-0"
                  >
                    {r.label}
                  </span>
                  <span style={{ color: r.color }} className="text-[9px] font-mono truncate">
                    {r.id}
                  </span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[9px] ml-auto shrink-0">
                    {r.timeRange}
                  </span>
                </div>
                <p
                  style={{ color: 'var(--color-muted)' }}
                  className="text-[9px] font-mono m-0 line-clamp-2 leading-relaxed"
                >
                  {r.snippet}
                </p>
              </div>
            ))}
          </>
        )}

        {/* ── Expand: main agent → sub-agent nesting ───────────────────────── */}
        {isExpand && (
          <>
            <style>{`
              @keyframes lcm-subagent-pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.25; }
              }
            `}</style>

            {/* Main agent actions */}
            <div className="flex flex-col gap-0.5">
              <div style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest mb-1">
                MAIN AGENT
              </div>
              {MAIN_AGENT_LINES.filter((l) => expandPhase >= l.minPhase).map((l, i) => (
                <div
                  key={i}
                  style={{ color: l.accent ? 'var(--color-summary)' : 'var(--color-muted)' }}
                  className="text-[9px] font-mono leading-snug"
                >
                  {l.text}
                </div>
              ))}
            </div>

            {/* Indented sub-agent region — left border acts as nesting connector */}
            <div style={{
              marginLeft: 8,
              paddingLeft: 10,
              borderLeft: '1px solid rgba(255,123,114,0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {/* Sub-agent box */}
              <div style={{
                border: '1px solid var(--color-summary-d1)',
                borderRadius: 6,
                overflow: 'hidden',
              }}>
                {/* Sub-agent header */}
                <div style={{
                  background: 'rgba(255,123,114,0.08)',
                  borderBottom: '1px solid var(--color-summary-d1)',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <span
                    style={{ color: 'var(--color-summary-d1)', borderColor: 'var(--color-summary-d1)' }}
                    className="rounded border px-1 py-0 text-[8px] font-bold tracking-widest"
                  >
                    SUB-AGENT
                  </span>
                  {/* Activity pulse dot — animates while sub-agent is running, static when done */}
                  {expandPhase >= 1 && (
                    <div style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: 'var(--color-summary-d1)',
                      animation: expandPhase < 3
                        ? 'lcm-subagent-pulse 1.2s ease-in-out infinite'
                        : 'none',
                      opacity: expandPhase >= 3 ? 0.45 : 1,
                    }} />
                  )}
                  <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
                    read-only · bounded scope
                  </span>
                </div>
                {/* Traversal log */}
                <div className="flex flex-col gap-1 p-2.5">
                  {expandPhase < 1 ? (
                    <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
                      Awaiting sub-agent…
                    </span>
                  ) : (
                    SUB_AGENT_LINES.filter((l) => expandPhase >= l.minPhase).map((l, i) => (
                      <div
                        key={i}
                        style={{ color: l.accent ? 'var(--color-summary-d1)' : 'var(--color-muted)' }}
                        className="text-[9px] font-mono leading-snug"
                      >
                        {l.text}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Response card — visible at phase 3 */}
              {expandPhase >= 3 && (
                <div
                  style={{
                    background: 'rgba(255,123,114,0.06)',
                    border: '1px solid var(--color-summary-d1)',
                  }}
                  className="rounded px-2.5 py-2 flex flex-col gap-1"
                >
                  <div style={{ color: 'var(--color-summary-d1)' }} className="text-[9px] font-bold font-mono mb-0.5">
                    Sub-agent response ↓
                  </div>
                  {EXPAND_RESPONSE.map((line, i) => (
                    <span
                      key={i}
                      style={{ color: 'var(--color-text)' }}
                      className="text-[9px] font-mono leading-relaxed"
                    >
                      {line}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
