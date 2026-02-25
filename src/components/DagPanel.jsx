/**
 * DagPanel — SVG-based DAG visualization.
 *
 * Layout adapts to what's present:
 *
 *   Summaries only (no d1):
 *     summary nodes (orange)       ← D0_Y
 *     message groups (blue dashed) ← MSG_Y
 *
 *   With d1 (3-tier layout):
 *     d1 node (red-pink, wide)     ← D1_Y
 *     summary nodes                ← D0_Y_SHIFTED
 *     message groups               ← MSG_Y_WITH_D1
 *
 * The SVG uses viewBox + width="100%" so it scales to fit the panel.
 * New summary nodes animate in via GSAP back.out.
 * The d1 node triggers a three-phase animation:
 *   1. summary rects pulse (stroke brightens)
 *   2. d1 group scales in
 *   3. edges from d1 → each summary draw in via strokeDashoffset
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

// d1 node
const D1_W    = 220;
const D1_H    = 64;
const D1_Y    = 8;

// Summary position when d1 is present (shifted down to make room)
const D0_Y_SHIFTED = D1_Y + D1_H + 32;

// Message group y when d1 is present (third tier, below shifted summaries)
const MSG_Y_WITH_D1 = D0_Y_SHIFTED + D0_H + 32;

// SVG heights
const SVG_H_NO_D1   = MSG_Y + MSG_H + 12;
const SVG_H_WITH_D1 = MSG_Y_WITH_D1 + MSG_H + 12;

// ── Component ───────────────────────────────────────────────────────────────
export default function DagPanel({ summaries, highlightIds = [] }) {
  const d0Nodes = summaries.filter((s) => s.depth === 0);
  const d1Nodes = summaries.filter((s) => s.depth === 1);
  const hasD1   = d1Nodes.length > 0;

  // Refs for GSAP
  const d0GroupRefs = useRef({});  // summary <g> elements (for scale-in)
  const d0RectRefs  = useRef({});  // summary <rect> elements (for pulse)
  const d1GroupRef  = useRef(null);
  const d1EdgeRefs  = useRef({});  // paths from d1 → each summary

  const prevD0CountRef = useRef(0);
  const prevD1CountRef = useRef(0);

  // ── Animate newly added summary nodes ───────────────────────────────────
  useEffect(() => {
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
  }, [d0Nodes]);

  // ── Animate d1 node appearing (three-phase) ──────────────────────────────
  useLayoutEffect(() => {
    if (d1Nodes.length === 0) {
      prevD1CountRef.current = 0;
      return;
    }
    if (d1Nodes.length <= prevD1CountRef.current) return;
    prevD1CountRef.current = d1Nodes.length;

    // Phase 1: pulse all summary rects
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
      // Phase 2: d1 node scales in
      .fromTo(
        d1GroupRef.current,
        { opacity: 0, scale: 0.6, transformOrigin: '50% 0%' },
        { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)' },
        '-=0.1'
      )
      // Phase 3: draw in each edge
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
  }, [d1Nodes, d0Nodes]);

  // ── SVG geometry ──────────────────────────────────────────────────────────
  const d0Y  = hasD1 ? D0_Y_SHIFTED : D0_Y;
  const msgY = hasD1 ? MSG_Y_WITH_D1 : MSG_Y;
  const svgH = hasD1 ? SVG_H_WITH_D1 : SVG_H_NO_D1;
  const svgW = X_PAD * 2 + d0Nodes.length * COL_W;

  // d1 node: centered over all summary columns
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

            {/* ── d1 node ───────────────────────────────────────────────── */}
            {hasD1 && d1Nodes.map((d1) => (
              <g key={d1.id} ref={d1GroupRef} style={{ opacity: 0 }}>
                <rect
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
