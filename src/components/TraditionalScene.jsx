/**
 * TraditionalScene — scrollytelling section showing how traditional context
 * management works, before transitioning to LCM.
 *
 * How it actually works:
 *   1. Messages accumulate until the budget approaches a threshold
 *      (leaving room for the model to write a summary response).
 *   2. All messages so far are sent in one big summarization call.
 *   3. Every message is replaced by a single flat summary.
 *      The originals are gone — replaced by an approximation.
 *
 * Three narration steps:
 *   0. Context fills up toward the threshold
 *   1. One summarization call fires — all messages in, one summary out
 *   2. The flat summary replaces everything — lossy, unrecoverable
 */
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MessagePill from './MessagePill';
import TokenBudget from './TokenBudget';

gsap.registerPlugin(ScrollTrigger);

// ── Constants ─────────────────────────────────────────────────────────────────
const TRAD_BUDGET    = 2000;
const TRAD_THRESHOLD = 1600; // ~80% — when this is crossed, summarization fires

// Simulated conversation — total 1,710 tok, crosses the 1,600 threshold
const T_MESSAGES = [
  { id: 'tm1', role: 'user',      tokens: 140, label: 'Turn 1', snippet: 'Help me plan a 3-week solo trip to Japan. My budget is $3,000.' },
  { id: 'tm2', role: 'assistant', tokens: 520, label: 'Turn 1', snippet: 'Great! With $3,000 you can do this comfortably. Here\'s a day-by-day breakdown…' },
  { id: 'tm3', role: 'user',      tokens:  85, label: 'Turn 2', snippet: 'Which cities should I prioritize? I love temples and local food.' },
  { id: 'tm4', role: 'assistant', tokens: 490, label: 'Turn 2', snippet: 'Focus on Kyoto for temples, Tokyo for food, Osaka for both. The JR Pass…' },
  { id: 'tm5', role: 'user',      tokens:  95, label: 'Turn 3', snippet: 'What about accommodation? Should I use hostels or capsule hotels?' },
  { id: 'tm6', role: 'assistant', tokens: 380, label: 'Turn 3', snippet: 'Capsule hotels are ideal for solo travellers. Budget ¥3,000–5,000 per night…' },
];
// 140+520+85+490+95+380 = 1,710 tok — above the 1,600 threshold, below the 2,000 budget

// The flat summary that replaces all messages
const TRAD_SUMMARY = {
  tokens: 340,
  snippet: 'User planning 3-week solo Japan trip with $3,000 budget. Discussed city priorities (Kyoto for temples, Tokyo for food, Osaka for both), JR Pass for transport, and accommodation (capsule hotels preferred at ¥3–5k/night).',
};

// ── Narration steps ───────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Traditional Context Management',
    body: 'A traditional LLM setup holds the conversation in a fixed token budget. Every message consumes space. The budget isn\'t just a hard cap — there needs to be room left over for the model to write a summary when the time comes.',
  },
  {
    title: 'The Threshold',
    body: 'When context usage crosses a threshold — typically around 80% of the budget — the system fires a summarization call. As many messages as possible are sent to the model in one batch for summarization. This call typically takes 1–2 minutes to complete.',
  },
  {
    title: 'One Flat Summary',
    body: 'Everything is replaced by a single summary. Space is reclaimed — but details are lost. A flat summary can\'t hold the full fidelity of a long conversation. The model will confidently misremember specifics, contradict earlier decisions, or ask again for information it was already given. And there\'s no way to go back.',
  },
];

// ── Flat summary card ─────────────────────────────────────────────────────────
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
      {/* Header row */}
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
          {TRAD_SUMMARY.tokens.toLocaleString()} tok
        </span>
      </div>

      {/* Time range */}
      <div className="mb-1.5">
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
          Turns 1–3 · 6 messages · originals discarded
        </span>
      </div>

      {/* Snippet */}
      <p style={{ color: 'var(--color-text)' }} className="m-0 text-[11px] leading-relaxed line-clamp-3">
        {TRAD_SUMMARY.snippet}
      </p>
    </div>
  );
});

// ── Component ─────────────────────────────────────────────────────────────────
export default function TraditionalScene() {
  const [step,        setStep]        = useState(0);
  const [items,       setItems]       = useState(T_MESSAGES.slice(0, 2));
  const [showSummary, setShowSummary] = useState(false);
  const [summarizing, setSummarizing] = useState(false); // banner state

  const narrationRefs   = useRef([]);
  const itemRefs        = useRef({});
  const summaryRef      = useRef(null);
  const prevItemIdsRef  = useRef(new Set(['tm1', 'tm2']));
  const collapseAnimRef = useRef(null);
  const prevStepRef     = useRef(0);

  // Displayed token count: when all messages visible at step 1, show full 1,710 tok
  const usedTokens = showSummary
    ? TRAD_SUMMARY.tokens
    : items.reduce((a, m) => a + m.tokens, 0);

  // ── Collapse all messages, then swap in the flat summary ─────────────────
  const animateCollapse = useCallback((onComplete) => {
    const els = T_MESSAGES.map((m) => itemRefs.current[m.id]).filter(Boolean);
    if (!els.length) { onComplete(); return; }

    els.forEach((el) => gsap.set(el, { height: el.offsetHeight, overflow: 'hidden' }));
    if (collapseAnimRef.current) collapseAnimRef.current.kill();

    collapseAnimRef.current = gsap.to(els, {
      height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0,
      duration: 0.22,
      stagger: { amount: 0.35, from: 'start' },
      ease: 'power2.in',
      onComplete: () => {
        els.forEach((el) => gsap.set(el, { clearProps: 'all' }));
        collapseAnimRef.current = null;
        onComplete();
      },
    });
  }, []);

  // ── Apply step ──────────────────────────────────────────────────────────────
  const applyStep = useCallback((s) => {
    const prev = prevStepRef.current;
    prevStepRef.current = s;
    setStep(s);

    if (s === 0) {
      setItems(T_MESSAGES.slice(0, 2));
      setShowSummary(false);
      setSummarizing(false);
      return;
    }

    if (s === 1) {
      setItems(T_MESSAGES);
      setShowSummary(false);
      setSummarizing(false);
      return;
    }

    if (s === 2) {
      if (prev < 2) {
        // Forward: show summarizing banner briefly, then collapse all messages
        setSummarizing(true);
        gsap.delayedCall(0.7, () => {
          setSummarizing(false);
          animateCollapse(() => {
            setItems([]);
            setShowSummary(true);
          });
        });
      } else {
        // Backward: instant
        setItems([]);
        setShowSummary(true);
        setSummarizing(false);
      }
    }
  }, [animateCollapse]);

  // ── Stagger new message pills in ────────────────────────────────────────────
  useEffect(() => {
    const currentIds = new Set(items.map((m) => m.id));
    const newIds = [...currentIds].filter((id) => !prevItemIdsRef.current.has(id));
    prevItemIdsRef.current = currentIds;
    if (!newIds.length) return;

    const frame = requestAnimationFrame(() => {
      const els = newIds.map((id) => itemRefs.current[id]).filter(Boolean);
      if (!els.length) return;
      gsap.fromTo(
        els,
        { opacity: 0, y: -12, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.07, ease: 'power2.out' }
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [items]);

  // Animate flat summary card in
  useEffect(() => {
    if (!showSummary || !summaryRef.current) return;
    gsap.fromTo(
      summaryRef.current,
      { opacity: 0, y: -10, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
    );
  }, [showSummary]);

  // ── ScrollTriggers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const triggers = narrationRefs.current.map((el, i) => {
      if (!el) return null;
      return ScrollTrigger.create({
        trigger:     el,
        start:       'top 38%',
        end:         'bottom 38%',
        onEnter:     () => applyStep(i),
        onEnterBack: () => applyStep(i),
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, [applyStep]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex" style={{ minHeight: '100vh' }}>

      {/* ── Left: scrollable narration ─────────────────────────────────── */}
      <div className="flex flex-col" style={{ width: '45%' }}>
        {STEPS.map((s, i) => (
          <div
            key={i}
            ref={(el) => { narrationRefs.current[i] = el; }}
            className="flex items-center"
            style={{ minHeight: i === 0 ? '100vh' : '80vh', padding: '0 3.5rem' }}
          >
            <div className="flex flex-col gap-4">
              <span
                style={{ color: 'var(--color-budget-over)', borderColor: 'var(--color-budget-over)' }}
                className="self-start rounded border px-2 py-0.5 text-[10px] font-bold tracking-widest"
              >
                TRADITIONAL
              </span>
              <h2
                style={{ color: 'var(--color-text)' }}
                className="text-3xl font-bold leading-tight m-0"
              >
                {s.title}
              </h2>
              <p
                style={{ color: 'var(--color-muted)', lineHeight: '1.7' }}
                className="text-sm m-0"
              >
                {s.body}
              </p>
            </div>
          </div>
        ))}
        <div style={{ height: '20vh' }} />
      </div>

      {/* ── Right: sticky panel ────────────────────────────────────────── */}
      <div style={{
        width: '55%', position: 'sticky', top: 0, height: '100vh',
        padding: '1.25rem 2.5rem 1.25rem 1rem',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {/* Threshold / summarizing banner */}
        <div style={{
          background: summarizing ? 'rgba(255,123,114,0.13)' : 'rgba(240,136,62,0.10)',
          border: `1px solid ${summarizing ? 'var(--color-budget-over)' : 'var(--color-budget-warn)'}`,
          color: summarizing ? 'var(--color-budget-over)' : 'var(--color-budget-warn)',
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 0.3s, transform 0.3s, background 0.3s, border-color 0.3s, color 0.3s',
          pointerEvents: 'none',
          flexShrink: 0,
        }} className="rounded-lg px-3 py-2 text-xs font-semibold">
          {summarizing
            ? '⟳ Summarization call in progress — this typically takes 1–2 minutes…'
            : `⚡ Threshold crossed (${T_MESSAGES.reduce((a,m)=>a+m.tokens,0)} / ${TRAD_THRESHOLD} tok) — summarization will fire`}
        </div>

        {/* Context window */}
        <div
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', flex: 1, minHeight: 0 }}
          className="rounded-xl p-4 flex flex-col gap-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between shrink-0">
            <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-widest m-0">
              Context Window
            </h3>
            <span
              style={{ color: 'var(--color-budget-over)', borderColor: 'var(--color-budget-over)' }}
              className="rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest"
            >
              TRADITIONAL
            </span>
          </div>

          {/* Token budget bar */}
          <div className="shrink-0">
            <TokenBudget used={usedTokens} total={TRAD_BUDGET} threshold={TRAD_THRESHOLD / TRAD_BUDGET} />
          </div>

          <div style={{ borderColor: 'var(--color-border)' }} className="border-t shrink-0" />

          {/* Messages / summary */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
            {items.length === 0 && !showSummary && (
              <p style={{ color: 'var(--color-muted)' }} className="text-xs text-center mt-8">
                Waiting for messages…
              </p>
            )}

            {showSummary && <FlatSummaryCard ref={summaryRef} />}

            {items.map((msg) => (
              <MessagePill
                key={msg.id}
                ref={(el) => { itemRefs.current[msg.id] = el; }}
                message={msg}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
