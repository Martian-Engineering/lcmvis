/**
 * DagPanel — SVG-based DAG visualization.
 *
 * Layout adapts to what's present:
 *
 *   Summaries only (no d1):
 *     summary nodes (orange)       ← D0_Y
 *     message groups (blue dashed) ← MSG_Y
 *
 *   Single d1 (3-tier layout):
 *     d1 node (red-pink, wide)     ← D1_Y
 *     summary nodes                ← D0_Y_SHIFTED
 *     message groups               ← MSG_Y_WITH_D1
 *
 *   Multiple d1 nodes (multi-D1 layout):
 *     d1 nodes in columns          ← D1_Y
 *     (D0 and messages not shown)
 *
 *   D2 present (D2 + multi-D1 layout):
 *     d2 node (wide, spanning all d1 columns) ← D2_Y
 *     d1 nodes in columns                     ← D1_Y_BELOW_D2
 *
 * The SVG uses viewBox + width so it scales to fit the panel.
 * New summary nodes animate in via GSAP back.out.
 * The first d1 node triggers a three-phase animation:
 *   1. summary rects pulse (stroke brightens)
 *   2. d1 group scales in
 *   3. edges from d1 → each summary draw in via strokeDashoffset
 * Additional d1 nodes scale in individually (no pulse, no edges).
 * The d2 node triggers a three-phase animation:
 *   1. d1 rects pulse (stroke brightens)
 *   2. d2 group scales in
 *   3. edges from d2 → each d1 draw in via strokeDashoffset
 */
import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

// ── Layout constants ────────────────────────────────────────────────────────
const X_PAD   = 20;
const COL_W   = 200;
const NODE_W  = 172;

// Depth-0 summary node
const D0_H  = 62;
const D0_Y  = 8;   // y when no d1

// Message group
const MSG_W   = 144;
const MSG_H   = 42;
const MSG_Y   = D0_Y + D0_H + 32;  // gap between summary and message group

// d1 node (single-d1 layout — wide, centered)
const D1_W    = 220;
const D1_H    = 64;
const D1_Y    = 8;

// Summary position when single d1 is present (shifted down to make room)
const D0_Y_SHIFTED = D1_Y + D1_H + 32;

// Message group y when single d1 is present (third tier, below shifted summaries)
const MSG_Y_WITH_D1 = D0_Y_SHIFTED + D0_H + 32;

// SVG heights for 2-tier and 3-tier (single-d1) layouts
const SVG_H_NO_D1   = MSG_Y + MSG_H + 12;
const SVG_H_WITH_D1 = MSG_Y_WITH_D1 + MSG_H + 12;

// d2 node (same dimensions as d1 — centered wide node, not full-width banner)
const D2_H = D1_H;  // 64 — matches d1 height for visual parity
const D2_W = D1_W;  // 220 — matches d1 width for visual parity
const D2_Y = 8;

// Multi-d1 layout mirrors single-d1 layout with depth shifted up by one:
//   single-d1:  [d1 centered wide] → [4 d0 columns] → [4 msg groups]
//   multi-d1:   [4 d1 columns] → [4 d0 groups]
//   d2+multi-d1:[d2 centered wide] → [4 d1 columns] → [4 d0 groups]

// D1 row y when d2 present (mirrors D0_Y_SHIFTED)
const D1_Y_BELOW_D2   = D2_Y + D2_H + 32;  // = 104, same as D0_Y_SHIFTED

// D0 group row y (mirrors MSG_Y positions)
const D0_GRP_Y_NO_D2  = D1_Y + D1_H + 32;          // = 104 (mirrors MSG_Y)
const D0_GRP_Y_WITH_D2 = D1_Y_BELOW_D2 + D1_H + 32; // = 200 (mirrors MSG_Y_WITH_D1)

// D0 group box is same size as message group
const D0_GRP_H = MSG_H;  // 42
const D0_GRP_W = MSG_W;  // 144

// SVG heights for multi-d1 layouts (3-tier each)
const SVG_H_MULTI_D1 = D0_GRP_Y_NO_D2  + D0_GRP_H + 12;  // d1 + d0 groups
const SVG_H_D2_D1    = D0_GRP_Y_WITH_D2 + D0_GRP_H + 12;  // d2 + d1 + d0 groups

// ── Prompt label descriptions by depth ──────────────────────────────────────
const PROMPT_LABELS = {
  2: { color: 'var(--color-summary-d2)', text: 'Durable narrative: decisions in effect, completed work, milestone timeline' },
  1: { color: 'var(--color-summary-d1)', text: 'Arc distillation: outcomes, what evolved, current state' },
  0: { color: 'var(--color-summary)',    text: 'Leaf summary: exact decisions, rationale, technical details' },
};

// ── Component ───────────────────────────────────────────────────────────────
export default function DagPanel({ summaries, highlightIds = [], showPromptLabels = false }) {
  const d0Nodes = summaries.filter((s) => s.depth === 0);
  const d1Nodes = summaries.filter((s) => s.depth === 1);
  const d2Nodes = summaries.filter((s) => s.depth === 2);
  const hasD1   = d1Nodes.length > 0;
  const hasD2   = d2Nodes.length > 0;

  // Multi-D1 layout: more than one d1 OR d2 present
  const multiD1 = d1Nodes.length > 1 || hasD2;

  // Refs for GSAP — D0
  const d0GroupRefs = useRef({});  // summary <g> elements (for scale-in)
  const d0RectRefs  = useRef({});  // summary <rect> elements (for pulse)

  // Refs for GSAP — D1
  const d1GroupRefs = useRef({});  // d1 <g> elements, keyed by d1.id
  const d1RectRefs  = useRef({});  // d1 <rect> elements, keyed by d1.id (for pulse when d2 fires)
  const d1EdgeRefs  = useRef({});  // paths d1 → each d0, keyed by d0.id (single-d1 compat case)

  // Refs for GSAP — D2
  const d2GroupRef  = useRef(null);
  const d2EdgeRefs  = useRef({});  // paths d2 → each d1, keyed by d1.id

  const prevD0CountRef  = useRef(0);
  const prevD1CountRef  = useRef(0);
  const prevD2CountRef  = useRef(0);
  // Track layout mode so we can reset counters when switching between layouts
  const prevMultiD1Ref  = useRef(multiD1);

  // ── Animate newly added D0 summary nodes ────────────────────────────────
  useEffect(() => {
    // Layout switch or count decrease — elements were remounted at opacity:0.
    // Reset counter so all nodes animate in fresh.
    if (multiD1 !== prevMultiD1Ref.current || d0Nodes.length < prevD0CountRef.current) {
      prevMultiD1Ref.current = multiD1;
      prevD0CountRef.current = 0;
    }
    const incoming = d0Nodes.slice(prevD0CountRef.current);
    prevD0CountRef.current = d0Nodes.length;

    incoming.forEach((s, idx) => {
      const el = d0GroupRefs.current[s.id];
      if (!el) return;
      gsap.fromTo(
        el,
        { opacity: 0, scale: 0.75, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, duration: 0.5, delay: idx * 0.1, ease: 'back.out(1.4)' }
      );
    });
  }, [d0Nodes, multiD1]);

  // ── Animate d1 nodes appearing ──────────────────────────────────────────
  useLayoutEffect(() => {
    if (d1Nodes.length === 0) {
      prevD1CountRef.current = 0;
      return;
    }
    // Layout switch or count decrease — reset so all nodes animate in fresh.
    if (multiD1 !== prevMultiD1Ref.current || d1Nodes.length < prevD1CountRef.current) {
      prevD1CountRef.current = 0;
    }
    if (d1Nodes.length <= prevD1CountRef.current) return;

    const newD1s = d1Nodes.slice(prevD1CountRef.current);
    prevD1CountRef.current = d1Nodes.length;

    if (d1Nodes.length === 1) {
      // First D1: three-phase animation (pulse D0 rects → D1 scales in → edges)
      const d0Rects = d0Nodes
        .map((s) => d0RectRefs.current[s.id])
        .filter(Boolean);

      gsap.timeline()
        .to(d0Rects, {
          attr: { stroke: '#ffffff', strokeWidth: 2.5 },
          duration: 0.18,
          stagger: 0.04,
          ease: 'power2.out',
        })
        .to(d0Rects, {
          attr: { stroke: 'var(--color-summary)', strokeWidth: 1 },
          duration: 0.18,
          stagger: 0.04,
          ease: 'power2.in',
        })
        // Phase 2: D1 node scales in
        .fromTo(
          d1GroupRefs.current[d1Nodes[0].id],
          { opacity: 0, scale: 0.6, transformOrigin: '50% 0%' },
          { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)' },
          '-=0.1'
        )
        // Phase 3: draw in each d1→d0 edge
        .add(() => {
          d0Nodes.forEach((node, i) => {
            const path = d1EdgeRefs.current[node.id];
            if (!path) return;
            const len = path.getTotalLength();
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
            gsap.to(path, {
              strokeDashoffset: 0,
              duration: 0.35,
              delay: i * 0.07,
              ease: 'power2.out',
            });
          });
        }, '-=0.15');
    } else {
      // Additional D1 nodes: scale each in individually, no pulse or edges
      newD1s.forEach((d1, idx) => {
        const el = d1GroupRefs.current[d1.id];
        if (!el) return;
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.75, transformOrigin: '50% 50%' },
          { opacity: 1, scale: 1, duration: 0.5, delay: idx * 0.1, ease: 'back.out(1.4)' }
        );
      });
    }
  }, [d1Nodes, d0Nodes]);

  // ── Animate D2 node appearing (three-phase) ──────────────────────────────
  useLayoutEffect(() => {
    if (d2Nodes.length === 0) {
      prevD2CountRef.current = 0;
      return;
    }
    // Scrolled back — reset so forward scroll re-animates correctly.
    if (d2Nodes.length < prevD2CountRef.current) {
      prevD2CountRef.current = 0;
    }
    if (d2Nodes.length <= prevD2CountRef.current) return;
    prevD2CountRef.current = d2Nodes.length;

    // Phase 1: pulse all D1 rects
    const d1Rects = d1Nodes
      .map((d1) => d1RectRefs.current[d1.id])
      .filter(Boolean);

    gsap.timeline()
      .to(d1Rects, {
        attr: { stroke: '#ffffff', strokeWidth: 2.5 },
        duration: 0.18,
        stagger: 0.04,
        ease: 'power2.out',
      })
      .to(d1Rects, {
        attr: { stroke: 'var(--color-summary-d1)', strokeWidth: 1 },
        duration: 0.18,
        stagger: 0.04,
        ease: 'power2.in',
      })
      // Phase 2: D2 group scales in
      .fromTo(
        d2GroupRef.current,
        { opacity: 0, scale: 0.6, transformOrigin: '50% 0%' },
        { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)' },
        '-=0.1'
      )
      // Phase 3: draw in each d2→d1 edge
      .add(() => {
        d1Nodes.forEach((d1, i) => {
          const path = d2EdgeRefs.current[d1.id];
          if (!path) return;
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 1 });
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 0.35,
            delay: i * 0.07,
            ease: 'power2.out',
          });
        });
      }, '-=0.15');
  }, [d2Nodes, d1Nodes]);

  // ── SVG geometry ──────────────────────────────────────────────────────────

  // Decide which layout to use
  if (multiD1) {
    // Multi-D1 layout mirrors single-D1 but one level up:
    //   no-D2:   [4 d1 cols] → [4 d0 groups]   (like [4 d0 cols] → [4 msg groups])
    //   with-D2: [d2 centered wide] → [4 d1 cols] → [4 d0 groups]
    const d1RowY    = hasD2 ? D1_Y_BELOW_D2   : D1_Y;
    const d0GrpY    = hasD2 ? D0_GRP_Y_WITH_D2 : D0_GRP_Y_NO_D2;
    const svgW      = X_PAD * 2 + d1Nodes.length * COL_W;
    const svgH      = hasD2 ? SVG_H_D2_D1 : SVG_H_MULTI_D1;

    // D2 node: same width as D1 in single-D1, centered over D1 columns
    const firstD1CX = X_PAD + NODE_W / 2;
    const lastD1CX  = X_PAD + (d1Nodes.length - 1) * COL_W + NODE_W / 2;
    const d2CenterX = (firstD1CX + lastD1CX) / 2;
    const d2X       = d2CenterX - D2_W / 2;

    // Which depths are present (for prompt labels)
    const depthsPresent = new Set(summaries.map((s) => s.depth));

    return (
      <div
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        className="rounded-xl p-4 flex flex-col gap-2 h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-widest m-0">
            Summary DAG
          </h3>
          <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
            {d1Nodes.length} d1 · {d0Nodes.length} d0
            {hasD2 ? ` · ${d2Nodes.length} d2` : ''}
          </span>
        </div>

        {/* SVG */}
        <div className="flex-1 flex items-start overflow-x-auto min-h-0 pt-1">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width={svgW}
            height={svgH}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* ── D2 node (same proportions as D1 in single-D1 layout) ── */}
            {hasD2 && d2Nodes.map((d2) => (
              <g key={d2.id} ref={d2GroupRef} style={{ opacity: 0 }}>
                <rect
                  x={d2X} y={D2_Y}
                  width={D2_W} height={D2_H}
                  rx={7}
                  fill="rgba(255,220,215,0.08)"
                  stroke="var(--color-summary-d2)"
                  strokeWidth={1.5}
                />
                <text x={d2X + 10} y={D2_Y + 16}
                  fill="var(--color-summary-d2)"
                  fontSize={9} fontWeight="bold" fontFamily="monospace"
                >
                  DEPTH 2 · {d2.tokens} tok
                </text>
                <text x={d2X + 10} y={D2_Y + 30}
                  fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                >
                  {d2.id}
                </text>
                <text x={d2X + 10} y={D2_Y + 44}
                  fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                >
                  {d2.timeRange} · ↳ {d2.descendantCount} msgs
                </text>
              </g>
            ))}

            {/* ── D2→D1 edges: fan from D2 center (mirrors D1→D0 in single-D1) ── */}
            {hasD2 && d1Nodes.map((d1, i) => {
              const d1ColX   = X_PAD + i * COL_W;
              const d1NodeCX = d1ColX + NODE_W / 2;
              const path = [
                `M ${d2CenterX} ${D2_Y + D2_H}`,
                `C ${d2CenterX} ${D2_Y + D2_H + 24}`,
                `  ${d1NodeCX} ${d1RowY - 24}`,
                `  ${d1NodeCX} ${d1RowY}`,
              ].join(' ');
              return (
                <path
                  key={`d2edge-${d1.id}`}
                  ref={(el) => { d2EdgeRefs.current[d1.id] = el; }}
                  d={path}
                  stroke="var(--color-summary-d2)"
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0}
                />
              );
            })}

            {/* ── D1 nodes + D0 group boxes (mirrors D0 nodes + msg groups) ── */}
            {d1Nodes.map((d1, i) => {
              const colX    = X_PAD + i * COL_W;
              const nodeCX  = colX + NODE_W / 2;
              const grpX    = colX + (NODE_W - D0_GRP_W) / 2;
              const grpCX   = grpX + D0_GRP_W / 2;

              // D1→D0group edge (dashed, same style as summary→message in single-D1)
              const edgePath = [
                `M ${nodeCX} ${d1RowY + D1_H}`,
                `C ${nodeCX} ${d1RowY + D1_H + 28}`,
                `  ${grpCX}  ${d0GrpY - 28}`,
                `  ${grpCX}  ${d0GrpY}`,
              ].join(' ');

              return (
                <g key={d1.id}>
                  {/* D1→D0group edge */}
                  <path
                    d={edgePath}
                    stroke="var(--color-border)"
                    strokeWidth={1.5}
                    fill="none"
                    strokeDasharray="4 3"
                  />

                  {/* D1 node */}
                  <g
                    ref={(el) => { d1GroupRefs.current[d1.id] = el; }}
                    style={{ opacity: 0 }}
                  >
                    <rect
                      ref={(el) => { d1RectRefs.current[d1.id] = el; }}
                      x={colX} y={d1RowY}
                      width={NODE_W} height={D1_H}
                      rx={6}
                      fill="rgba(255,123,114,0.10)"
                      stroke="var(--color-summary-d1)"
                      strokeWidth={1}
                    />
                    <text x={colX + 9} y={d1RowY + 15}
                      fill="var(--color-summary-d1)"
                      fontSize={9} fontWeight="bold" fontFamily="monospace"
                    >
                      DEPTH 1 · {d1.tokens} tok
                    </text>
                    <text x={colX + 9} y={d1RowY + 29}
                      fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                    >
                      {d1.id}
                    </text>
                    <text x={colX + 9} y={d1RowY + 43}
                      fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                    >
                      {d1.timeRange}
                    </text>
                    <text x={colX + 9} y={d1RowY + 57}
                      fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                    >
                      ↳ {d1.descendantCount} msgs
                    </text>
                  </g>

                  {/* D0 group box (same style as message group in single-D1) */}
                  <rect
                    x={grpX} y={d0GrpY}
                    width={D0_GRP_W} height={D0_GRP_H}
                    rx={6}
                    fill="rgba(240,136,62,0.07)"
                    stroke="var(--color-summary)"
                    strokeWidth={1}
                    strokeDasharray="3 2"
                  />
                  <text x={grpX + 9} y={d0GrpY + 16}
                    fill="var(--color-summary)"
                    fontSize={9} fontWeight="bold" fontFamily="monospace"
                  >
                    4 summaries
                  </text>
                  <text x={grpX + 9} y={d0GrpY + 30}
                    fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                  >
                    {d1.timeRange}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Prompt labels (shown below SVG when showPromptLabels is true) */}
        {[2, 1, 0].map((depth) => {
          const label = PROMPT_LABELS[depth];
          const present = depthsPresent.has(depth);
          return (
            <div
              key={depth}
              style={{
                opacity: showPromptLabels && present ? 1 : 0,
                transition: 'opacity 0.45s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                pointerEvents: 'none',
              }}
            >
              <span style={{ color: label.color, fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold', whiteSpace: 'nowrap', paddingTop: '1px' }}>
                D{depth}
              </span>
              <span style={{ color: label.color, fontFamily: 'monospace', fontSize: '9px', lineHeight: '1.4' }}>
                {label.text}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Single-D1 or no-D1 layout (backward compat) ──────────────────────────
  const d0Y  = hasD1 ? D0_Y_SHIFTED : D0_Y;
  const msgY = hasD1 ? MSG_Y_WITH_D1 : MSG_Y;
  const svgH = hasD1 ? SVG_H_WITH_D1 : SVG_H_NO_D1;
  const svgW = X_PAD * 2 + d0Nodes.length * COL_W;

  // Single d1 node: centered over all summary columns
  const firstD0CX = X_PAD + NODE_W / 2;
  const lastD0CX  = X_PAD + (d0Nodes.length - 1) * COL_W + NODE_W / 2;
  const d1CX      = (firstD0CX + lastD0CX) / 2;
  const d1X       = d1CX - D1_W / 2;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      className="rounded-xl p-4 flex flex-col gap-2 h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-widest m-0">
          Summary DAG
        </h3>
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
          {d0Nodes.length} {d0Nodes.length === 1 ? 'summary' : 'summaries'}
          {hasD1 ? ` · ${d1Nodes.length} d1` : ''}
        </span>
      </div>

      {/* Empty state */}
      {d0Nodes.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: 'var(--color-muted)' }} className="text-xs text-center leading-relaxed">
            The DAG is empty.
            <br />Summary nodes appear here as compaction runs.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-start overflow-x-auto min-h-0 pt-1">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            width={svgW}
            height={svgH}
            style={{ display: 'block', overflow: 'visible' }}
          >
            {/* ── Highlight overlays (painted behind nodes) ─────────────── */}
            {/* d1 highlight */}
            {hasD1 && d1Nodes.map((d1) => (
              <rect
                key={`hl-${d1.id}`}
                x={d1X - 3} y={D1_Y - 3}
                width={D1_W + 6} height={D1_H + 6}
                rx={10}
                fill="rgba(255,123,114,0.08)"
                stroke="var(--color-summary-d1)"
                strokeWidth={2}
                style={{
                  opacity: highlightIds.includes(d1.id) ? 1 : 0,
                  transition: 'opacity 0.45s ease',
                  pointerEvents: 'none',
                }}
              />
            ))}
            {/* Summary highlights */}
            {d0Nodes.map((s, i) => {
              const colX = X_PAD + i * COL_W;
              return (
                <rect
                  key={`hl-${s.id}`}
                  x={colX - 3} y={d0Y - 3}
                  width={NODE_W + 6} height={D0_H + 6}
                  rx={9}
                  fill="rgba(240,136,62,0.08)"
                  stroke="var(--color-summary)"
                  strokeWidth={2}
                  style={{
                    opacity: highlightIds.includes(s.id) ? 1 : 0,
                    transition: 'opacity 0.45s ease',
                    pointerEvents: 'none',
                  }}
                />
              );
            })}
            {/* Message group highlights */}
            {d0Nodes.map((s, i) => {
              const colX = X_PAD + i * COL_W;
              const msgX = colX + (NODE_W - MSG_W) / 2;
              return (
                <rect
                  key={`hl-msgs-${s.id}`}
                  x={msgX - 3} y={msgY - 3}
                  width={MSG_W + 6} height={MSG_H + 6}
                  rx={7}
                  fill="rgba(56,139,253,0.08)"
                  stroke="var(--color-user)"
                  strokeWidth={2}
                  style={{
                    opacity: highlightIds.includes(`msgs_${s.id}`) ? 1 : 0,
                    transition: 'opacity 0.45s ease',
                    pointerEvents: 'none',
                  }}
                />
              );
            })}

            {/* ── Single d1 node ─────────────────────────────────────────── */}
            {hasD1 && d1Nodes.map((d1) => (
              <g key={d1.id} ref={(el) => { d1GroupRefs.current[d1.id] = el; }} style={{ opacity: 0 }}>
                <rect
                  ref={(el) => { d1RectRefs.current[d1.id] = el; }}
                  x={d1X} y={D1_Y}
                  width={D1_W} height={D1_H}
                  rx={7}
                  fill="rgba(255,123,114,0.10)"
                  stroke="var(--color-summary-d1)"
                  strokeWidth={1.5}
                />
                <text x={d1X + 10} y={D1_Y + 16}
                  fill="var(--color-summary-d1)"
                  fontSize={9} fontWeight="bold" fontFamily="monospace"
                >
                  DEPTH 1 · {d1.tokens} tok
                </text>
                <text x={d1X + 10} y={D1_Y + 30}
                  fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                >
                  {d1.id}
                </text>
                <text x={d1X + 10} y={D1_Y + 44}
                  fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                >
                  {d1.timeRange} · ↳ {d1.descendantCount} msgs
                </text>
              </g>
            ))}

            {/* ── Summary nodes + edges ──────────────────────────────────── */}
            {d0Nodes.map((s, i) => {
              const colX  = X_PAD + i * COL_W;
              const nodeCX = colX + NODE_W / 2;
              const msgX  = colX + (NODE_W - MSG_W) / 2;
              const msgCX = msgX + MSG_W / 2;

              // Edge: summary → message group (Bézier curves with generous control offsets)
              const summaryToMsg = [
                `M ${nodeCX} ${d0Y + D0_H}`,
                `C ${nodeCX} ${d0Y + D0_H + 28}`,
                `  ${msgCX}  ${msgY - 28}`,
                `  ${msgCX}  ${msgY}`,
              ].join(' ');

              // Edge: d1 → this summary (drawn via strokeDashoffset animation)
              const d1ToSummary = [
                `M ${d1CX} ${D1_Y + D1_H}`,
                `C ${d1CX} ${D1_Y + D1_H + 24}`,
                `  ${nodeCX} ${d0Y - 24}`,
                `  ${nodeCX} ${d0Y}`,
              ].join(' ');

              return (
                <g key={s.id}>
                  {/* d1 → summary edge (animated in, starts invisible) */}
                  {hasD1 && (
                    <path
                      ref={(el) => { d1EdgeRefs.current[s.id] = el; }}
                      d={d1ToSummary}
                      stroke="var(--color-summary-d1)"
                      strokeWidth={1.5}
                      fill="none"
                      opacity={0}
                    />
                  )}

                  {/* Summary node group */}
                  <g
                    ref={(el) => { d0GroupRefs.current[s.id] = el; }}
                    style={{ opacity: 0 }}
                  >
                    <rect
                      ref={(el) => { d0RectRefs.current[s.id] = el; }}
                      x={colX} y={d0Y}
                      width={NODE_W} height={D0_H}
                      rx={6}
                      fill="rgba(240,136,62,0.10)"
                      stroke="var(--color-summary)"
                      strokeWidth={1}
                    />
                    <text x={colX + 9} y={d0Y + 15}
                      fill="var(--color-summary)"
                      fontSize={9} fontWeight="bold" fontFamily="monospace"
                    >
                      SUMMARY · {s.tokens} tok
                    </text>
                    <text x={colX + 9} y={d0Y + 29}
                      fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                    >
                      {s.id}
                    </text>
                    <text x={colX + 9} y={d0Y + 43}
                      fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                    >
                      {s.timeRange}
                    </text>
                    <text x={colX + 9} y={d0Y + 57}
                      fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                    >
                      ↳ {s.descendantCount} msgs
                    </text>

                    {/* summary → message group edge */}
                    <path
                      d={summaryToMsg}
                      stroke="var(--color-border)"
                      strokeWidth={1.5}
                      fill="none"
                      strokeDasharray="4 3"
                    />

                    {/* Message group node */}
                    <rect
                      x={msgX} y={msgY}
                      width={MSG_W} height={MSG_H}
                      rx={6}
                      fill="rgba(56,139,253,0.07)"
                      stroke="var(--color-user)"
                      strokeWidth={1}
                      strokeDasharray="3 2"
                    />
                    <text x={msgX + 9} y={msgY + 16}
                      fill="var(--color-user)"
                      fontSize={9} fontWeight="bold" fontFamily="monospace"
                    >
                      {s.descendantCount} raw messages
                    </text>
                    <text x={msgX + 9} y={msgY + 30}
                      fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                    >
                      {s.timeRange}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
