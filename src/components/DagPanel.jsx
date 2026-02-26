/**
 * DagPanel — SVG-based DAG visualization with a unified column layout.
 *
 * Unified model: each D1 node 'owns' a group of D0s (via sourceIds).
 * Each group renders in one of two states:
 *   - Expanded: individual D0 nodes + message groups (when single D1)
 *   - Collapsed: dashed group box (when multiple D1s)
 *
 * Column layout adapts to content:
 *   No D1:     [D0 columns] → [message groups]
 *   Single D1: [D1 wide] → [D0 columns expanded] → [message groups]
 *   Multi D1:  [D1 columns collapsed] → [D0 group boxes]
 *   D2 + D1:   [D2 banner] → [D1 columns] → [D0 group boxes]
 *
 * D1 width scales with owned D0 count (animatable for transitions).
 *
 * Animations (GSAP):
 *   - New D0 nodes: back.out scale-in
 *   - First D1: three-phase (pulse D0 rects → D1 scales in → edges draw)
 *   - Collapse transition (D1_2 appears): msg groups fade → D0 nodes
 *     scale down → D1 width contracts → React re-renders collapsed →
 *     new D1s scale in. Uses visualExpandedD1Id state that lags behind
 *     expandedD1Id to keep expanded DOM alive during the GSAP sequence.
 *   - Additional D1s: individual back.out scale-in
 *   - D2: three-phase (pulse D1 rects → D2 scales in → edges draw)
 */
import { useEffect, useLayoutEffect, useRef, useMemo, useState } from 'react';
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
// D1 node
const D1_H    = 64;
const D1_Y    = 8;

// D2 node (centered wide node spanning D1 columns)
const D2_H = D1_H;   // 64
const D2_W = 220;    // fixed width for D2 banner
const D2_Y = 8;

// D1 row y when D2 present (shifted down below D2)
const D1_Y_BELOW_D2 = D2_Y + D2_H + 32;  // = 104

// Collapsed D0 group box (same size as message group)
const D0_GRP_H = MSG_H;  // 42
const D0_GRP_W = MSG_W;  // 144

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

  // ── D1→D0 grouping ──────────────────────────────────────────────────────
  // Each D1 owns D0s via sourceIds. Build groups: [{d1, d0s}, ...]
  // When no D1 exists, create a virtual group so D0s always render.
  const d1Groups = useMemo(() => {
    if (d1Nodes.length === 0) {
      // No D1 yet — single virtual group holding all D0s
      return [{ d1: null, d0s: d0Nodes }];
    }
    const d0ById = Object.fromEntries(d0Nodes.map((s) => [s.id, s]));
    return d1Nodes.map((d1) => ({
      d1,
      d0s: (d1.sourceIds || []).map((id) => d0ById[id]).filter(Boolean),
    }));
  }, [d0Nodes, d1Nodes]);

  // Which D1's D0s are expanded (show individual nodes + message groups).
  // Null means the virtual no-D1 group. When only one D1, it's expanded.
  // When multiple D1s appear, all collapse.
  const expandedD1Id = d1Nodes.length <= 1 ? (d1Nodes[0]?.id ?? null) : null;

  // Visual expansion state — lags behind expandedD1Id during collapse animation
  // so GSAP can animate the transition before React swaps to collapsed layout.
  const [visualExpandedD1Id, setVisualExpandedD1Id] = useState(expandedD1Id);
  const collapsingRef = useRef(false);  // true while collapse animation is running

  // ── Sync visual expansion state (during render, not in effect) ─────────
  // React-approved "adjusting state based on props" pattern: setState during
  // render triggers a synchronous re-render before commit, no cascading.
  if (expandedD1Id !== null && visualExpandedD1Id !== expandedD1Id) {
    // Expanding or first D1 appearing — sync immediately
    setVisualExpandedD1Id(expandedD1Id);
  } else if (expandedD1Id === null && visualExpandedD1Id !== null && d1Nodes.length === 0) {
    // All D1s removed — sync to null immediately (no animation needed)
    setVisualExpandedD1Id(null);
  } else if (expandedD1Id === null && visualExpandedD1Id !== null && d1Nodes.length > 1) {
    // Multi-D1 collapse: check if the expanded group still exists in data
    const groupStillExists = d1Groups.some((g) => g.d1?.id === visualExpandedD1Id);
    if (!groupStillExists) {
      // Group gone (data changed unexpectedly) — sync immediately
      setVisualExpandedD1Id(null);
    }
  }

  // Refs for GSAP — D0
  const d0GroupRefs  = useRef({});  // summary <g> elements (for scale-in)
  const d0RectRefs   = useRef({});  // summary <rect> elements (for pulse)
  const msgGroupRefs = useRef({});  // message group <g> wrappers (for fade during collapse)

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
  // Track expansion state to reset animation counters on layout change
  const prevExpandedRef = useRef(expandedD1Id);

  // ── Collapse transition animation ─────────────────────────────────────
  // Fires when expandedD1Id flips to null (multi-D1) but visual is still
  // expanded. Runs a GSAP sequence, then sets visualExpandedD1Id = null
  // to trigger React re-render to collapsed layout.
  useLayoutEffect(() => {
    // Only animate when going from expanded → multi-D1 collapsed
    if (expandedD1Id !== null || visualExpandedD1Id === null || d1Nodes.length <= 1) return;

    collapsingRef.current = true;

    // Find the group that's currently visually expanded
    const expandedGroup = d1Groups.find((g) => g.d1?.id === visualExpandedD1Id);
    if (!expandedGroup) {
      collapsingRef.current = false;
      return;  // render-time sync handles the state update
    }

    // Gather animation targets from the expanded group's DOM elements
    const msgEls  = expandedGroup.d0s.map((s) => msgGroupRefs.current[s.id]).filter(Boolean);
    const d0Els   = expandedGroup.d0s.map((s) => d0GroupRefs.current[s.id]).filter(Boolean);
    const edgeEls = expandedGroup.d0s.map((s) => d1EdgeRefs.current[s.id]).filter(Boolean);
    const d1Rect  = d1RectRefs.current[visualExpandedD1Id];

    // Target geometry: after collapse, D1 will be 1 column at colOffset 0
    const targetD1W = NODE_W;
    const targetD1X = X_PAD + (COL_W - NODE_W) / 2;

    const tl = gsap.timeline({
      // GSAP onComplete is async — runs after animation, not in effect body
      onComplete: () => {
        collapsingRef.current = false;
        setVisualExpandedD1Id(null);
      },
    });

    // Phase 1: message groups fade out
    tl.to(msgEls, { opacity: 0, duration: 0.25, ease: 'power2.in' });

    // Phase 2: D0 nodes scale down + fade, D1→D0 edges fade
    tl.to(d0Els, {
      opacity: 0, scale: 0.6, transformOrigin: '50% 50%',
      duration: 0.3, ease: 'power2.in',
    }, '-=0.05');
    tl.to(edgeEls, { opacity: 0, duration: 0.2 }, '<');

    // Phase 3: D1 width contracts from expanded span to column width
    if (d1Rect) {
      tl.to(d1Rect, {
        attr: { width: targetD1W, x: targetD1X },
        duration: 0.35, ease: 'power2.inOut',
      }, '-=0.15');
    }

    // Cleanup: kill timeline if component re-renders before completion
    return () => { tl.kill(); };
  }, [expandedD1Id, visualExpandedD1Id, d1Nodes.length, d1Groups]);

  // ── Animate newly added D0 summary nodes ────────────────────────────────
  useEffect(() => {
    // Expansion state changed or count decrease — reset so nodes animate fresh
    if (expandedD1Id !== prevExpandedRef.current || d0Nodes.length < prevD0CountRef.current) {
      prevExpandedRef.current = expandedD1Id;
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
  }, [d0Nodes, expandedD1Id]);

  // ── Animate d1 nodes appearing ──────────────────────────────────────────
  useLayoutEffect(() => {
    if (d1Nodes.length === 0) {
      prevD1CountRef.current = 0;
      return;
    }
    // Skip during collapse — new D1s will animate after transition completes
    if (collapsingRef.current) return;
    // Expansion state changed or count decrease — reset so nodes animate fresh
    if (expandedD1Id !== prevExpandedRef.current || d1Nodes.length < prevD1CountRef.current) {
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
  }, [d1Nodes, d0Nodes, expandedD1Id]);

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

  // ── Unified column layout ────────────────────────────────────────────────
  // Each d1Group contributes columns: expanded → d0s.length, collapsed → 1.
  // colOffset tracks where each group starts in the overall column grid.
  const columnLayout = useMemo(() => {
    // Build layout with cumulative column offsets using reduce (no mutation).
    // Uses visualExpandedD1Id so layout stays expanded during collapse animation.
    const { layouts } = d1Groups.reduce((acc, group) => {
      const expanded = group.d1 === null
        ? true  // virtual no-D1 group is always expanded
        : group.d1.id === visualExpandedD1Id;
      const numCols = expanded ? Math.max(group.d0s.length, 1) : 1;
      acc.layouts.push({ ...group, expanded, numCols, colOffset: acc.offset });
      acc.offset += numCols;
      return acc;
    }, { layouts: [], offset: 0 });
    return layouts;
  }, [d1Groups, visualExpandedD1Id]);

  const totalCols = columnLayout.reduce((sum, g) => sum + g.numCols, 0);

  // Vertical tier positions
  const d1RowY   = hasD2 ? D1_Y_BELOW_D2 : D1_Y;
  const d0RowY   = hasD1 ? d1RowY + D1_H + 32 : D0_Y;
  const msgRowY  = d0RowY + D0_H + 32;

  // SVG dimensions
  const svgW = X_PAD * 2 + totalCols * COL_W;
  // Height: tallest tier stack present
  const bottomY = hasD1
    ? (columnLayout.some((g) => g.expanded) ? msgRowY + MSG_H : d0RowY + D0_GRP_H)
    : msgRowY + MSG_H;
  const svgH = bottomY + 12;

  // D2 node: centered over all D1 columns
  const firstColCX = X_PAD + NODE_W / 2;
  const lastColCX  = X_PAD + (totalCols - 1) * COL_W + NODE_W / 2;
  const d2CenterX  = (firstColCX + lastColCX) / 2;
  const d2X        = d2CenterX - D2_W / 2;

  // Which depths are present (for prompt labels)
  const depthsPresent = new Set(summaries.map((s) => s.depth));

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
          {hasD2 ? `${d2Nodes.length} d2 · ` : ''}
          {hasD1 ? `${d1Nodes.length} d1 · ` : ''}
          {d0Nodes.length} d0
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
            {/* ── D2 node ──────────────────────────────────────────────── */}
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
                  SUMMARY · DEPTH 2 · {d2.tokens} tok
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

            {/* ── D2→D1 edges ──────────────────────────────────────────── */}
            {hasD2 && columnLayout.map((group) => {
              if (!group.d1) return null;
              const d1NodeCX = X_PAD + group.colOffset * COL_W + (group.numCols * COL_W) / 2;
              const edgePath = [
                `M ${d2CenterX} ${D2_Y + D2_H}`,
                `C ${d2CenterX} ${D2_Y + D2_H + 24}`,
                `  ${d1NodeCX} ${d1RowY - 24}`,
                `  ${d1NodeCX} ${d1RowY}`,
              ].join(' ');
              return (
                <path
                  key={`d2edge-${group.d1.id}`}
                  ref={(el) => { d2EdgeRefs.current[group.d1.id] = el; }}
                  d={edgePath}
                  stroke="var(--color-summary-d2)"
                  strokeWidth={1.5}
                  fill="none"
                  opacity={0}
                />
              );
            })}

            {/* ── D1 groups: each renders D1 node + D0 section ─────────── */}
            {columnLayout.map((group) => {
              // Group's pixel x-origin and width span
              const groupX  = X_PAD + group.colOffset * COL_W;
              const groupPx = group.numCols * COL_W;

              // D1 node geometry: spans full group width with padding
              const d1W  = groupPx - (group.numCols > 1 ? 2 * X_PAD : COL_W - NODE_W);
              const d1X  = groupX + (groupPx - d1W) / 2;
              const d1CX = groupX + groupPx / 2;

              return (
                <g key={group.d1?.id ?? 'virtual'}>
                  {/* ── D1 node ──────────────────────────────────────── */}
                  {group.d1 && (
                    <>
                      {/* D1 highlight overlay */}
                      <rect
                        x={d1X - 3} y={d1RowY - 3}
                        width={d1W + 6} height={D1_H + 6}
                        rx={10}
                        fill="rgba(255,123,114,0.08)"
                        stroke="var(--color-summary-d1)"
                        strokeWidth={2}
                        style={{
                          opacity: highlightIds.includes(group.d1.id) ? 1 : 0,
                          transition: 'opacity 0.45s ease',
                          pointerEvents: 'none',
                        }}
                      />

                      {/* D1 node group (animated in) */}
                      <g
                        ref={(el) => { d1GroupRefs.current[group.d1.id] = el; }}
                        style={{ opacity: 0 }}
                      >
                        <rect
                          ref={(el) => { d1RectRefs.current[group.d1.id] = el; }}
                          x={d1X} y={d1RowY}
                          width={d1W} height={D1_H}
                          rx={7}
                          fill="rgba(255,123,114,0.10)"
                          stroke="var(--color-summary-d1)"
                          strokeWidth={1.5}
                        />
                        <text x={d1X + 10} y={d1RowY + 16}
                          fill="var(--color-summary-d1)"
                          fontSize={9} fontWeight="bold" fontFamily="monospace"
                        >
                          SUMMARY · DEPTH 1 · {group.d1.tokens} tok
                        </text>
                        <text x={d1X + 10} y={d1RowY + 30}
                          fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                        >
                          {group.d1.id}
                        </text>
                        <text x={d1X + 10} y={d1RowY + 44}
                          fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                        >
                          {group.d1.timeRange} · ↳ {group.d1.descendantCount} msgs
                        </text>
                      </g>
                    </>
                  )}

                  {/* ── D0 section: expanded or collapsed ────────────── */}
                  {group.expanded ? (
                    // Expanded: individual D0 nodes + message groups
                    group.d0s.map((s, i) => {
                      const colX   = groupX + i * COL_W;
                      const nodeCX = colX + NODE_W / 2;
                      const msgX   = colX + (NODE_W - MSG_W) / 2;
                      const msgCX  = msgX + MSG_W / 2;

                      // Edge: D0 → message group
                      const summaryToMsg = [
                        `M ${nodeCX} ${d0RowY + D0_H}`,
                        `C ${nodeCX} ${d0RowY + D0_H + 28}`,
                        `  ${msgCX}  ${msgRowY - 28}`,
                        `  ${msgCX}  ${msgRowY}`,
                      ].join(' ');

                      // Edge: D1 → D0 (animated stroke-dashoffset)
                      const d1ToD0 = group.d1 ? [
                        `M ${d1CX} ${d1RowY + D1_H}`,
                        `C ${d1CX} ${d1RowY + D1_H + 24}`,
                        `  ${nodeCX} ${d0RowY - 24}`,
                        `  ${nodeCX} ${d0RowY}`,
                      ].join(' ') : null;

                      return (
                        <g key={s.id}>
                          {/* D1→D0 edge (starts invisible, animated in) */}
                          {d1ToD0 && (
                            <path
                              ref={(el) => { d1EdgeRefs.current[s.id] = el; }}
                              d={d1ToD0}
                              stroke="var(--color-summary-d1)"
                              strokeWidth={1.5}
                              fill="none"
                              opacity={0}
                            />
                          )}

                          {/* D0 highlight overlay */}
                          <rect
                            x={colX - 3} y={d0RowY - 3}
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

                          {/* Message group highlight overlay */}
                          <rect
                            x={msgX - 3} y={msgRowY - 3}
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

                          {/* D0 node group (animated in) */}
                          <g
                            ref={(el) => { d0GroupRefs.current[s.id] = el; }}
                            style={{ opacity: 0 }}
                          >
                            <rect
                              ref={(el) => { d0RectRefs.current[s.id] = el; }}
                              x={colX} y={d0RowY}
                              width={NODE_W} height={D0_H}
                              rx={6}
                              fill="rgba(240,136,62,0.10)"
                              stroke="var(--color-summary)"
                              strokeWidth={1}
                            />
                            <text x={colX + 9} y={d0RowY + 15}
                              fill="var(--color-summary)"
                              fontSize={9} fontWeight="bold" fontFamily="monospace"
                            >
                              SUMMARY · DEPTH 0 · {s.tokens} tok
                            </text>
                            <text x={colX + 9} y={d0RowY + 29}
                              fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                            >
                              {s.id}
                            </text>
                            <text x={colX + 9} y={d0RowY + 43}
                              fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                            >
                              {s.timeRange}
                            </text>
                            <text x={colX + 9} y={d0RowY + 57}
                              fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                            >
                              ↳ {s.descendantCount} msgs
                            </text>

                            {/* Message group wrapper (ref for collapse fade) */}
                            <g ref={(el) => { msgGroupRefs.current[s.id] = el; }}>
                              {/* D0 → message group edge */}
                              <path
                                d={summaryToMsg}
                                stroke="var(--color-border)"
                                strokeWidth={1.5}
                                fill="none"
                                strokeDasharray="4 3"
                              />

                              {/* Message group node */}
                              <rect
                                x={msgX} y={msgRowY}
                                width={MSG_W} height={MSG_H}
                                rx={6}
                                fill="rgba(56,139,253,0.07)"
                                stroke="var(--color-user)"
                                strokeWidth={1}
                                strokeDasharray="3 2"
                              />
                              <text x={msgX + 9} y={msgRowY + 16}
                                fill="var(--color-user)"
                                fontSize={9} fontWeight="bold" fontFamily="monospace"
                              >
                                {s.descendantCount} raw messages
                              </text>
                              <text x={msgX + 9} y={msgRowY + 30}
                                fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                              >
                                {s.timeRange}
                              </text>
                            </g>
                          </g>
                        </g>
                      );
                    })
                  ) : (
                    // Collapsed: dashed group box + edge from D1
                    (() => {
                      const grpW  = D0_GRP_W;
                      const grpX  = groupX + (groupPx - grpW) / 2;
                      const grpCX = grpX + grpW / 2;
                      const edgePath = [
                        `M ${d1CX} ${d1RowY + D1_H}`,
                        `C ${d1CX} ${d1RowY + D1_H + 28}`,
                        `  ${grpCX} ${d0RowY - 28}`,
                        `  ${grpCX} ${d0RowY}`,
                      ].join(' ');
                      return (
                        <g>
                          {/* D1→group edge */}
                          <path
                            d={edgePath}
                            stroke="var(--color-border)"
                            strokeWidth={1.5}
                            fill="none"
                            strokeDasharray="4 3"
                          />
                          {/* D0 group box */}
                          <rect
                            x={grpX} y={d0RowY}
                            width={grpW} height={D0_GRP_H}
                            rx={6}
                            fill="rgba(240,136,62,0.07)"
                            stroke="var(--color-summary)"
                            strokeWidth={1}
                            strokeDasharray="3 2"
                          />
                          <text x={grpX + 9} y={d0RowY + 16}
                            fill="var(--color-summary)"
                            fontSize={9} fontWeight="bold" fontFamily="monospace"
                          >
                            {group.d0s.length} summaries
                          </text>
                          <text x={grpX + 9} y={d0RowY + 30}
                            fill="var(--color-muted)" fontSize={9} fontFamily="monospace"
                          >
                            {group.d1?.timeRange}
                          </text>
                        </g>
                      );
                    })()
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}

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
