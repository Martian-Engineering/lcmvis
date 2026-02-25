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
export default function TraditionalScene({ onStateChange, panelRef }) {
  const [step,        setStep]        = useState(0);
  const [items,       setItems]       = useState(T_MESSAGES.slice(0, 2));
  const [showSummary, setShowSummary] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const narrationRefs = useRef([]);
  const prevStepRef   = useRef(0);

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
        // Forward: show summarizing banner briefly, then collapse messages
        setSummarizing(true);
        gsap.delayedCall(0.7, () => {
          setSummarizing(false);
          // Delegate collapse animation to SharedPanel
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
        onEnter:     () => applyStep(i),
        onEnterBack: () => applyStep(i),
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, [applyStep]);

  // ── Render (left narration column only) ─────────────────────────────────────
  return (
    <>
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
    </>
  );
}
