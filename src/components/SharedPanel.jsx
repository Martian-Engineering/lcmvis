/**
 * SharedPanel — persistent right-side panel that spans both Traditional and
 * LCM scenes. Renders a unified context window whose badge, budget, and
 * content adapt to the active mode, plus DAG and tool panels in LCM mode.
 *
 * Exposes animateCollapse(ids, onComplete) via useImperativeHandle so that
 * both TraditionalScene and CompactionScene can trigger collapse animations
 * on items rendered inside this panel.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import gsap from 'gsap';
import MessagePill from './MessagePill';
import SummaryPill from './SummaryPill';
import FreshTailPlaceholder from './FreshTailPlaceholder';
import TokenBudget from './TokenBudget';
import DagPanel from './DagPanel';
import ToolPanel from './ToolPanel';
import { TOTAL_BUDGET, FRESH_TAIL_COUNT } from '../data/conversation';

// ── Traditional-mode constants ──────────────────────────────────────────────
const TRAD_BUDGET    = 2000;
const TRAD_THRESHOLD = 0.8; // fraction (1600/2000)

const TRAD_SUMMARY_DATA = {
  tokens: 340,
  snippet: 'User planning 3-week solo Japan trip with $3,000 budget. Discussed city priorities (Kyoto for temples, Tokyo for food, Osaka for both), JR Pass for transport, and accommodation (capsule hotels preferred at ¥3–5k/night).',
};

// ── Flat summary card (Traditional mode only) ───────────────────────────────
const FlatSummaryCard = forwardRef(function FlatSummaryCard(_, ref) {
  return (
    <div
      ref={ref}
      style={{
        borderColor: 'var(--color-muted)',
        background: 'rgba(125,133,144,0.07)',
      }}
      className="rounded-md border px-3 py-2 text-xs leading-snug"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span
            style={{ color: 'var(--color-muted)', borderColor: 'var(--color-muted)' }}
            className="rounded border px-1 py-0.5 text-[9px] font-bold tracking-widest"
          >
            SUMMARY
          </span>
          <span
            style={{ color: 'var(--color-budget-over)', borderColor: 'var(--color-budget-over)' }}
            className="rounded border px-1 py-0.5 text-[9px] font-bold tracking-widest"
          >
            LOSSY
          </span>
          <span
            style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
            className="rounded border px-1 py-0.5 text-[9px] font-bold tracking-widest"
          >
            ~90 sec
          </span>
        </div>
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px] tabular-nums">
          {TRAD_SUMMARY_DATA.tokens.toLocaleString()} tok
        </span>
      </div>
      <div className="mb-1.5">
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
          Turns 1–3 · 6 messages · originals discarded
        </span>
      </div>
      <p style={{ color: 'var(--color-text)' }} className="m-0 text-[11px] leading-relaxed line-clamp-3">
        {TRAD_SUMMARY_DATA.snippet}
      </p>
    </div>
  );
});

// ── Component ───────────────────────────────────────────────────────────────
const SharedPanel = forwardRef(function SharedPanel({
  mode,         // 'traditional' | 'lcm'
  tradState,    // { step, items, showSummary, summarizing, usedTokens }
  lcmState,     // { step, items, summaries, usedTokens, compacting, fastForward,
                //   showFreshTail, toolView, expandPhase, dagHighlightIds, bannerText }
}, ref) {
  // ── Refs ────────────────────────────────────────────────────────────────────
  const modeRef          = useRef(mode);
  const itemRefs         = useRef({});   // shared map: item id → DOM element
  const summaryCardRef   = useRef(null); // Traditional flat summary card
  const scrollRef        = useRef(null); // scrollable items container
  const collapseAnimRef   = useRef(null);
  const prevItemIdsRef    = useRef(new Set());
  const suppressStaggerRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Imperative API for scenes ───────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    /**
     * Animate context-window items out (fade → collapse → swap).
     * Two sequential phases: content fades to invisible, then the space
     * collapses smoothly. onComplete fires after both phases finish.
     * Stagger-in is suppressed for the next render so the replacement
     * item appears without a flash.
     */
    animateCollapse(ids, onComplete) {
      const els = ids.map((id) => itemRefs.current[id]).filter(Boolean);
      if (!els.length) { onComplete(); return; }

      els.forEach((el) => gsap.set(el, { height: el.offsetHeight, overflow: 'hidden' }));
      if (collapseAnimRef.current) collapseAnimRef.current.kill();

      const tl = gsap.timeline({
        onComplete: () => {
          els.forEach((el) => gsap.set(el, { clearProps: 'all' }));
          collapseAnimRef.current = null;
          // Suppress stagger-in for the next render so the replacement
          // item (summary) appears cleanly without a flash.
          suppressStaggerRef.current = true;
          onComplete();
        },
      });

      // Phase 1: fade content invisible
      tl.to(els, {
        opacity: 0,
        duration: 0.3,
        stagger: 0.03,
        ease: 'power2.in',
      });

      // Phase 2: collapse the empty space
      tl.to(els, {
        height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0,
        duration: 0.25,
        stagger: 0.02,
        ease: 'power2.inOut',
      });

      collapseAnimRef.current = tl;
    },
  }));

  // ── Derived state ───────────────────────────────────────────────────────────
  const isTraditional = mode === 'traditional';
  const isLcm         = mode === 'lcm';

  const tradStep         = tradState?.step ?? 0;
  const tradItems        = tradState?.items ?? [];
  const tradShowSummary  = tradState?.showSummary ?? false;
  const tradSummarizing  = tradState?.summarizing ?? false;
  const tradUsedTokens   = tradState?.usedTokens ?? 0;

  const lcmItems            = lcmState?.items ?? [];
  const lcmSummaries        = lcmState?.summaries ?? [];
  const lcmUsedTokens       = lcmState?.usedTokens ?? 0;
  const lcmCompacting       = lcmState?.compacting ?? false;
  const lcmFastForward      = lcmState?.fastForward ?? false;
  const lcmShowFreshTail    = lcmState?.showFreshTail ?? false;
  const lcmToolView         = lcmState?.toolView ?? null;
  const lcmExpandPhase      = lcmState?.expandPhase ?? 0;
  const lcmDagHighlightIds  = lcmState?.dagHighlightIds ?? [];
  const lcmBannerText       = lcmState?.bannerText ?? '';
  const lcmSectionCActive   = lcmState?.sectionCActive ?? false;
  // Unified display values for the context window
  const usedTokens  = isTraditional ? tradUsedTokens : lcmUsedTokens;
  const budgetTotal = isTraditional ? TRAD_BUDGET : TOTAL_BUDGET;

  // Fresh tail IDs (LCM only — last N raw messages get the FRESH TAIL badge)
  const rawIds  = isLcm ? lcmItems.filter((i) => i.type === 'message').map((i) => i.data.id) : [];
  const freshIds = isLcm && lcmShowFreshTail ? new Set(rawIds.slice(-FRESH_TAIL_COUNT)) : new Set();

  // Badge styling — transitions smoothly between modes
  const badgeText  = isTraditional ? 'TRADITIONAL' : 'LCM';
  const badgeColor = isTraditional ? 'var(--color-budget-over)' : 'var(--color-summary)';

  // Context window collapses during tool demo steps and Section C (DAG focus)
  const ctxCollapsed = isLcm && (lcmToolView || lcmSectionCActive);

  // ── Animate each new item in ─────────────────────────────────────────────────
  // Items arrive one at a time via scene-side stagger, so this typically sees
  // 1 new item per invocation. Falls back to multi-item stagger for fast scrolls.
  // Suppressed for one render after a collapse so replacement items appear clean.
  useEffect(() => {
    let currentIds;
    if (isTraditional) {
      currentIds = new Set(tradShowSummary ? ['trad-summary'] : tradItems.map((m) => m.id));
    } else {
      currentIds = new Set(lcmItems.map((i) => i.data.id));
    }

    const newIds = [...currentIds].filter((id) => !prevItemIdsRef.current.has(id));
    prevItemIdsRef.current = currentIds;
    if (!newIds.length) return;

    // After a collapse, skip the entrance animation so the replacement
    // item (summary pill / flat summary card) appears without a flash.
    if (suppressStaggerRef.current) {
      suppressStaggerRef.current = false;
      return;
    }

    const frame = requestAnimationFrame(() => {
      const els = newIds.map((id) => {
        if (id === 'trad-summary') return summaryCardRef.current;
        return itemRefs.current[id];
      }).filter(Boolean);
      if (!els.length) return;

      gsap.fromTo(els,
        { opacity: 0, y: -12, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.07, ease: 'power2.out' }
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [isTraditional, tradItems, tradShowSummary, lcmItems]);

  // ── Auto-scroll to bottom when items change ─────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [tradItems, tradShowSummary, lcmItems]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: 'var(--shared-panel-padding)',
      display: 'flex', flexDirection: 'column', gap: '10px',
      height: '100%',
    }}>

      {/* ── Traditional banner (threshold / summarizing) ──────────────────── */}
      <div style={{
        background: tradSummarizing ? 'rgba(255,123,114,0.13)' : 'rgba(240,136,62,0.10)',
        border: `1px solid ${tradSummarizing ? 'var(--color-budget-over)' : 'var(--color-budget-warn)'}`,
        color: tradSummarizing ? 'var(--color-budget-over)' : 'var(--color-budget-warn)',
        maxHeight: isTraditional && tradStep >= 1 ? '60px' : 0,
        overflow: 'hidden',
        opacity: isTraditional && tradStep >= 1 ? 1 : 0,
        transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, background 0.3s, border-color 0.3s, color 0.3s',
        pointerEvents: 'none',
        flexShrink: 0,
      }} className="rounded-lg px-3 py-2 text-xs font-semibold">
        {tradSummarizing
          ? '⟳ Summarization call in progress — this typically takes 1–2 minutes…'
          : '⚡ Threshold crossed (1,710 / 1,600 tok) — summarization will fire'}
      </div>

      {/* ── LCM compaction banner ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(240,136,62,0.13)',
        border: '1px solid var(--color-summary)',
        color: 'var(--color-summary)',
        maxHeight: isLcm && lcmCompacting ? '60px' : 0,
        overflow: 'hidden',
        opacity: isLcm && lcmCompacting ? 1 : 0,
        transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        pointerEvents: 'none',
        flexShrink: 0,
      }} className="rounded-lg px-3 py-2 text-xs font-semibold">
        {lcmBannerText}
      </div>

      {/* ── Context window (persistent across both modes) ─────────────────── */}
      <div style={{
        flexShrink: 0,
        flex: ctxCollapsed ? '0 0 auto' : '1 1 auto',
        maxHeight: ctxCollapsed ? 0 : 'var(--shared-context-max-height)',
        minHeight: 0,
        overflow: 'hidden',
        opacity: ctxCollapsed ? 0 : 1,
        transition: 'max-height 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
      }}>
        <div
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          className="flex h-full flex-col gap-2 md:gap-3 rounded-xl p-2.5 md:p-4"
        >
          {/* Header — badge cross-fades between modes */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-widest m-0">
                Context Window
              </h3>
              {isLcm && lcmFastForward && (
                <span
                  style={{ color: 'var(--color-summary)', borderColor: 'var(--color-summary)' }}
                  className="rounded border px-1 py-0.5 text-[9px] font-bold tracking-widest"
                >
                  ⏩ FF
                </span>
              )}
            </div>
            <span
              style={{
                color: badgeColor,
                borderColor: badgeColor,
                transition: 'color 0.4s ease, border-color 0.4s ease',
              }}
              className="rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
            >
              {badgeText}
            </span>
          </div>

          {/* Token budget */}
          <div className="shrink-0">
            <TokenBudget
              used={usedTokens}
              total={budgetTotal}
              threshold={isTraditional ? TRAD_THRESHOLD : undefined}
            />
          </div>

          <div style={{ borderColor: 'var(--color-border)' }} className="border-t shrink-0" />

          {/* Items — oldest at top, newest at bottom */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">

            {/* Empty state */}
            {isTraditional && tradItems.length === 0 && !tradShowSummary && (
              <p style={{ color: 'var(--color-muted)' }} className="text-xs text-center mt-8">
                Waiting for messages…
              </p>
            )}
            {isLcm && lcmItems.length === 0 && (
              <p style={{ color: 'var(--color-muted)' }} className="text-xs text-center mt-8">
                Waiting for messages…
              </p>
            )}

            {/* Traditional: flat summary card */}
            {isTraditional && tradShowSummary && (
              <FlatSummaryCard ref={summaryCardRef} />
            )}

            {/* Traditional: message pills */}
            {isTraditional && tradItems.map((msg) => (
              <MessagePill
                key={msg.id}
                ref={(el) => { itemRefs.current[msg.id] = el; }}
                message={msg}
              />
            ))}

            {/* LCM: context items (messages, summaries, fresh-placeholder) */}
            {isLcm && lcmItems.map((item) => {
              if (item.type === 'message') {
                return (
                  <MessagePill
                    key={item.data.id}
                    ref={(el) => { itemRefs.current[item.data.id] = el; }}
                    message={item.data}
                    isFresh={freshIds.has(item.data.id)}
                  />
                );
              }
              if (item.type === 'summary') {
                return (
                  <SummaryPill
                    key={item.data.id}
                    ref={(el) => { itemRefs.current[item.data.id] = el; }}
                    summary={item.data}
                  />
                );
              }
              if (item.type === 'fresh-placeholder') {
                return (
                  <FreshTailPlaceholder
                    key={item.data.id}
                    ref={(el) => { itemRefs.current[item.data.id] = el; }}
                  />
                );
              }
              return null;
            })}
          </div>

          {/* Fresh tail legend (LCM only, animated) */}
          <div
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-muted)',
              maxHeight: isLcm && lcmShowFreshTail ? '40px' : 0,
              opacity: isLcm && lcmShowFreshTail ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
            }}
            className="border-t pt-2 shrink-0 text-[10px] flex items-center gap-1.5"
          >
            <span style={{ color: 'var(--color-fresh)' }}>●</span>
            Last {FRESH_TAIL_COUNT} messages protected from compaction (fresh tail)
          </div>
        </div>
      </div>

      {/* ── DAG panel (LCM only) ────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        height: isLcm && lcmSummaries.length > 0
          ? (lcmToolView
              ? 'var(--shared-dag-height-with-tool)'
              : lcmSectionCActive
                ? 'var(--shared-dag-height-focus)'
                : 'var(--shared-dag-height)')
          : 0,
        overflow: 'hidden',
        transition: 'height 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {isLcm && lcmSummaries.length > 0 && (
          <DagPanel
            summaries={lcmSummaries}
            highlightIds={lcmDagHighlightIds}
          />
        )}
      </div>

      {/* ── Tool panel (LCM only — slides in for tool demo steps) ─────────── */}
      <div style={{
        flexShrink: 0,
        height: isLcm && lcmToolView ? 'var(--shared-tool-height)' : 0,
        overflow: 'hidden',
        transition: 'height 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {isLcm && lcmToolView && (
          <ToolPanel view={lcmToolView} expandPhase={lcmExpandPhase} />
        )}
      </div>


    </div>
  );
});

export default SharedPanel;
