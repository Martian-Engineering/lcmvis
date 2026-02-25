/**
 * ToolPanel — simulated lcm_describe, lcm_grep, and lcm_expand_query tool call visualizations.
 *
 * Props:
 *   view        — 'describe' | 'grep' | 'expand'
 *   expandPhase — 1..3 (expand only: 1=grant+spawn+d1read, 2=summary expand, 3=synthesis done)
 */
import gsap from 'gsap';
import { useEffect, useLayoutEffect, useRef } from 'react';

// ── Describe simulation data ────────────────────────────────────────────────────
const DESCRIBE_NODE = {
  id:        'sum_d1_01',
  depth:     1,
  tokens:    580,
  timeRange: 'Turns 1–16',
  children:  ['sum_01', 'sum_02', 'sum_03', 'sum_04'],
  snippet:   'Project arc: OAuth2 + RBAC auth built from scratch, audit logging and rate limiting added, CI/CD pipeline configured. N+1 query resolved.',
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
    label: 'SUMMARY',
    color: 'var(--color-summary)',
    borderFaint: 'rgba(240,136,62,0.2)',
    timeRange: 'Turns 1–4',
    snippet: 'OAuth2 setup: installed client, resolved CORS via redirect URI config, implemented token persistence with localStorage…',
  },
  {
    id: 'sum_d1_01',
    label: 'DEPTH 1',
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
  const grepRowRefs    = useRef([]);
  const describeCardRef = useRef(null);

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

  const isDescribe = view === 'describe';
  const isGrep     = view === 'grep';
  const isExpand   = view === 'expand';

  const toolName = isDescribe ? 'lcm_describe' : isGrep ? 'lcm_grep' : 'lcm_expand_query';

  const command = isDescribe
    ? 'lcm_describe node_id="sum_d1_01"'
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
                border: '1px solid rgba(255,123,114,0.25)',
                borderLeft: '2px solid var(--color-summary-d1)',
              }}
              className="rounded px-2.5 py-2 flex flex-col gap-1.5"
            >
              {/* Node badge row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  style={{ color: 'var(--color-summary-d1)', borderColor: 'var(--color-summary-d1)' }}
                  className="rounded border px-1 py-0 text-[8px] font-bold shrink-0"
                >
                  DEPTH 1
                </span>
                <span style={{ color: 'var(--color-summary-d1)' }} className="text-[10px] font-mono font-semibold">
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
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-1.5">
                    <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono w-16 shrink-0">{k}</span>
                    <span style={{ color: 'var(--color-text)' }} className="text-[9px] font-mono">{v}</span>
                  </div>
                ))}
                {/* Children list */}
                <div className="flex gap-1.5">
                  <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono w-16 shrink-0">children</span>
                  <div className="flex flex-col gap-0.5">
                    {DESCRIBE_NODE.children.map((c) => (
                      <span key={c} style={{ color: 'var(--color-summary)' }} className="text-[9px] font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
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

        {/* ── Expand: delegation + sub-agent ───────────────────────────────── */}
        {isExpand && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
