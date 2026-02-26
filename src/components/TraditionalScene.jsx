/**
 * TraditionalScene — left-column narration for the "traditional context
 * management" section. Does NOT render a right panel; state is communicated
 * to SharedPanel via the onStateChange callback.
 *
 * Three narration steps:
 *   0. Context fills up toward the threshold
 *   1. One summarization call fires — all messages in, one summary out
 *   2. The flat summary replaces everything — lossy, unrecoverable
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Constants ─────────────────────────────────────────────────────────────────
const T_MESSAGES = [
  { id: 'tm1', role: 'user',      tokens: 140, label: 'Turn 1', snippet: 'Help me plan a 3-week solo trip to Japan. My budget is $3,000.' },
  { id: 'tm2', role: 'assistant', tokens: 520, label: 'Turn 1', snippet: 'Great! With $3,000 you can do this comfortably. Here\'s a day-by-day breakdown…' },
  { id: 'tm3', role: 'user',      tokens:  85, label: 'Turn 2', snippet: 'Which cities should I prioritize? I love temples and local food.' },
  { id: 'tm4', role: 'assistant', tokens: 490, label: 'Turn 2', snippet: 'Focus on Kyoto for temples, Tokyo for food, Osaka for both. The JR Pass…' },
  { id: 'tm5', role: 'user',      tokens:  95, label: 'Turn 3', snippet: 'What about accommodation? Should I use hostels or capsule hotels?' },
  { id: 'tm6', role: 'assistant', tokens: 380, label: 'Turn 3', snippet: 'Capsule hotels are ideal for solo travellers. Budget ¥3,000–5,000 per night…' },
];

const TRAD_SUMMARY_TOKENS = 340;

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

// ── Component ─────────────────────────────────────────────────────────────────
export default function TraditionalScene({ onStateChange, onActivate, panelRef }) {
  const [step,        setStep]        = useState(0);
  const [items,       setItems]       = useState(T_MESSAGES.slice(0, 2));
  const [showSummary, setShowSummary] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const narrationRefs  = useRef([]);
  const prevStepRef    = useRef(0);
  const staggerQueue   = useRef([]);

  // Token count for the budget bar
  const usedTokens = showSummary
    ? TRAD_SUMMARY_TOKENS
    : items.reduce((a, m) => a + m.tokens, 0);

  // ── Notify parent of state changes ──────────────────────────────────────────
  useEffect(() => {
    onStateChange?.({ step, items, showSummary, summarizing, usedTokens });
  }, [step, items, showSummary, summarizing, usedTokens, onStateChange]);

  // ── Apply step ──────────────────────────────────────────────────────────────
  const applyStep = useCallback((s) => {
    // Cancel any pending staggered additions from a previous step
    staggerQueue.current.forEach((c) => c.kill());
    staggerQueue.current = [];

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
      setShowSummary(false);
      setSummarizing(false);
      if (prev < 1) {
        // Forward: stagger the 4 new messages in one at a time
        T_MESSAGES.slice(2).forEach((msg, i) => {
          staggerQueue.current.push(
            gsap.delayedCall(i * 0.1, () => setItems((p) => [...p, msg]))
          );
        });
      } else {
        // Backward: show all messages immediately
        setItems(T_MESSAGES);
      }
      return;
    }

    if (s === 2) {
      if (prev < 2) {
        // Forward: show summarizing banner briefly, then collapse messages
        setSummarizing(true);
        gsap.delayedCall(0.4, () => {
          setSummarizing(false);
          panelRef?.current?.animateCollapse(
            T_MESSAGES.map((m) => m.id),
            () => {
              setItems([]);
              setShowSummary(true);
            }
          );
        });
      } else {
        // Backward from beyond: instant
        setItems([]);
        setShowSummary(true);
        setSummarizing(false);
      }
    }
  }, [panelRef]);

  // ── ScrollTriggers ──────────────────────────────────────────────────────────
  useEffect(() => {
    const triggers = narrationRefs.current.map((el, i) => {
      if (!el) return null;
      return ScrollTrigger.create({
        trigger:     el,
        start:       'top 38%',
        end:         'bottom 38%',
        onEnter:     () => { onActivate?.(); applyStep(i); },
        onEnterBack: () => { onActivate?.(); applyStep(i); },
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, [applyStep, onActivate]);

  // ── Render (left narration column only) ─────────────────────────────────────
  return (
    <>
      {STEPS.map((s, i) => (
        <div
          key={i}
          ref={(el) => { narrationRefs.current[i] = el; }}
          className={`flex ${i === 0 ? 'items-start' : 'items-center'}`}
          style={{
            minHeight: i === 0 ? 'var(--scene-first-height)' : 'var(--scene-step-height)',
            padding: i === 0
              ? 'var(--scene-first-top-padding) var(--scene-side-padding) 0'
              : `0 var(--scene-side-padding)`,
          }}
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
              className="m-0 text-2xl font-bold leading-tight md:text-3xl"
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
      <div style={{ height: 'var(--scene-trad-end-spacer)' }} />
    </>
  );
}
