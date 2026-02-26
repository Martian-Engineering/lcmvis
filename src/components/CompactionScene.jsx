/**
 * CompactionScene — left-column narration for the LCM compaction section.
 * Does NOT render a right panel; state is communicated to SharedPanel via
 * the onStateChange callback.
 *
 * Structure (top to bottom):
 *   Section 0      Transition ("There's a better way")
 *   Sections 1–8   Compaction narration (80vh each)
 *   Scrub section   220vh; ScrollTrigger scrub drives summary 3 and 4
 *   Sections 9–10  Condensation threshold + pass (first D1)
 *   Section 11     Depth-aware prompts (DAG shown at full D2 state)
 *   Sections 12–19 Bounded context, tools overview, individual tool demos
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Narration from './Narration';
import {
  MESSAGES as M,
  SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4, D1_SUMMARY,
  SUMMARY_5, SUMMARY_6, SUMMARY_7, SUMMARY_8, D1_SUMMARY_2,
  SUMMARY_9, SUMMARY_10, SUMMARY_11, SUMMARY_12, D1_SUMMARY_3,
  SUMMARY_13, SUMMARY_14, SUMMARY_15, SUMMARY_16, D1_SUMMARY_4,
  D2_SUMMARY,
  FRESH_TAIL_PLACEHOLDER,
} from '../data/conversation';

gsap.registerPlugin(ScrollTrigger);

// ── Full DAG summaries (d2 + 4 d1s + 16 d0s) ──────────────────────────────
// Used by itemsForStep for all steps after DAG is fully grown.
const FULL_DAG_SUMMARIES = [
  SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4,
  SUMMARY_5, SUMMARY_6, SUMMARY_7, SUMMARY_8,
  SUMMARY_9, SUMMARY_10, SUMMARY_11, SUMMARY_12,
  SUMMARY_13, SUMMARY_14, SUMMARY_15, SUMMARY_16,
  D1_SUMMARY, D1_SUMMARY_2, D1_SUMMARY_3, D1_SUMMARY_4,
  D2_SUMMARY,
];

// ── Narration copy ──────────────────────────────────────────────────────────
// Steps 0–10: compaction basics through first condensation
// Step 11:    Depth-aware prompts (full D2 DAG shown)
// Steps 12–13: bounded context + retrieval tools overview
// Steps 14–19: individual tool demos
const STEPS = [
  /* 0 */ {
    title: 'There\'s a better way.',
    body: 'LCM starts the same way — a conversation accumulating messages — but instead of truncating, it compacts them into layered summaries where nothing is ever lost.',
  },
  /* 1 */ {
    title: 'Messages Arrive',
    body: 'Each user message and assistant reply appends to the context. Tokens accumulate. Early on there\'s plenty of headroom.',
  },
  /* 2 */ {
    title: 'The Budget Fills',
    body: 'As the conversation grows, the budget bar climbs. LCM monitors this continuously.',
  },
  /* 3 */ {
    title: 'The Fresh Tail',
    body: 'LCM always protects the most recent raw messages — the "fresh tail." These are never compacted. Everything older is eligible for summarization. In this simplified example the fresh tail is 4 messages; in real-world use it would be much larger.',
  },
  /* 4 */ {
    title: 'Incremental Compaction',
    body: 'When raw messages outside the fresh tail exceed 2,000 tokens, LCM automatically fires incremental compaction. This happens asynchronously — your conversation isn\'t interrupted. And because source messages are never lost in LCM, compaction is always safe.',
  },
  /* 5 */ {
    title: 'Summary Compaction',
    body: 'The eligible chunk is sent to the model with a structured prompt. A summary replaces the source messages in the conversation, but the references to the source messages are preserved. We\'ll discuss how these source messages are accessed later when we discuss expansion.',
  },
  /* 6 */ {
    title: 'The Conversation Continues',
    body: 'New messages arrive. The fresh tail advances. The summary is a compact stand-in — the agent can expand it on demand.',
  },
  /* 7 */ {
    title: 'The Cycle Repeats',
    body: 'After more turns, a new cohort of messages accumulates outside the fresh tail. The threshold is crossed and another compaction pass fires automatically.',
  },
  /* 8 */ {
    title: 'Second Compaction Pass',
    body: 'A second summary is created. The Summary DAG now has two summary nodes, each a dense slice of conversation history.',
  },
  // ── (D0 scrub section sits between 8 and 9) ──
  /* 9 */ {
    title: 'Condensation Threshold',
    body: 'When enough summaries accumulate at the same depth — 4 in this case — LCM fires a condensation pass. They are synthesized into a single depth-1 node.',
  },
  /* 10 */ {
    title: 'Condensation Pass',
    body: 'The four summaries are sent to the model with a higher-level synthesis prompt. The result is a depth-1 summary: more abstract, more durable, covering the full arc. As the conversation keeps growing, this process repeats — depth-1 nodes accumulate, trigger their own condensation, and a depth-2 node forms. The DAG grows deeper with the conversation.',
  },
  // ── (D1 scrub section removed) ──
  /* 11 */ {
    title: 'Depth-Aware Prompts',
    body: 'As the conversation grows, LCM builds a three-level summary tree. Each depth runs a different prompt. Leaf summaries capture specifics: decisions, rationale, exact technical details. Depth-1 distills the arc: what evolved, outcomes, current state. Depth-2 produces a durable narrative — decisions still in effect and a milestone timeline — the kind of context that stays useful for weeks.',
  },
  /* 12 */ {
    title: 'A Bounded, Lossless Context',
    body: 'The conversation has grown considerably, yet the context remains tight and compact. Nothing was discarded. Every message lives in the DAG.',
    epilogue: 'But how does the model actually access the information in the DAG?',
  },
  /* 13 */ {
    title: 'Retrieval Tools',
    body: 'LCM ships with a set of tools that give the agent structured access to the summary DAG. The agent can inspect nodes, search across depths, and expand any summary back to its source messages — all without loading the full history into context.',
  },
  /* 14 */ {
    title: 'Tool: lcm_describe',
    body: 'The agent first calls lcm_describe on the depth-2 node. It returns the subtree token count (descTok), source token count (srcTok), and a child manifest — everything the agent needs to plan its retrieval strategy before spending a single token on expansion.',
  },
  /* 15 */ {
    title: 'Tool: lcm_grep',
    body: 'lcm_grep searches every node in the DAG — raw messages and summaries alike, across all depths. Results come back with depth labels that tell the agent where in the hierarchy a topic lives — whether it\'s still in raw messages, compressed into a leaf summary, or distilled all the way up to the D2 narrative.',
  },
  /* 16 */ {
    title: 'Tool: lcm_expand_query',
    body: 'When a summary isn\'t enough, the agent calls lcm_expand_query. It issues a delegation grant — a scoped authorization with a conversation scope and token budget — then spawns a sub-agent to navigate the DAG strategically.',
  },
  /* 17 */ {
    title: 'Bounded Sub-Agent',
    body: 'The sub-agent receives lcm_describe and lcm_expand as tools plus a 4,000-token budget. Rather than following a prescribed path, it plans its own traversal — inspecting the DAG structure and token costs before committing to any expansion.',
  },
  /* 18 */ {
    title: 'Walking the DAG',
    body: 'The sub-agent calls lcm_describe on the D2 node to read the manifest, identifies sum_d1_01 as the best match, then expands only the relevant leaf summary. It explores a 20k-token subtree but consumes under 800 tokens by being strategic.',
  },
  /* 19 */ {
    title: 'Focused Answer',
    body: 'Full source fidelity with bounded cost. The sub-agent returns its answer to the main agent. The main context is unchanged — but it now has exact details from the very first turns of a 64-turn conversation.',
  },
  /* 20 */ {
    title: 'Lossless Context Management',
    body: 'Hierarchical summarization. Full-fidelity recall. Bounded context, unbounded memory. Read the paper, try the OpenClaw plugin, or use Volt — a coding agent with LCM built in.',
  },
];

const TOTAL_STEPS = STEPS.length;

// ── Helpers ─────────────────────────────────────────────────────────────────
const msgItem = (msg) => ({ type: 'message',           data: msg });
const sumItem = (s)   => ({ type: 'summary',           data: s   });
const ftItem  =          { type: 'fresh-placeholder', data: FRESH_TAIL_PLACEHOLDER };

function sumTokens(items) {
  return items.reduce((acc, i) => acc + (i.data.tokens ?? 0), 0);
}

/**
 * Target state for each narration step.
 * Returns { items, summaries } where items drives the context panel and
 * summaries drives the DAG visualization.
 */
function itemsForStep(s) {
  switch (s) {
    // ── Compaction basics (unchanged) ──
    case 0:  return { items: [], summaries: [] };
    case 1:  return { items: [M[0],M[1],M[2],M[3]].map(msgItem), summaries: [] };
    case 2:  return { items: [M[0],M[1],M[2],M[3],M[4],M[5],M[6],M[7]].map(msgItem), summaries: [] };
    case 3:
    case 4:  return {
      items: [M[0],M[1],M[2],M[3],M[4],M[5],M[6],M[7],M[8],M[9],M[10],M[11]].map(msgItem),
      summaries: [],
    };
    case 5:  return {
      items: [sumItem(SUMMARY_1), msgItem(M[8]),msgItem(M[9]),msgItem(M[10]),msgItem(M[11])],
      summaries: [SUMMARY_1],
    };
    case 6:  return {
      items: [
        sumItem(SUMMARY_1),
        msgItem(M[8]),msgItem(M[9]),msgItem(M[10]),msgItem(M[11]),
        msgItem(M[12]),msgItem(M[13]),msgItem(M[14]),msgItem(M[15]),
      ],
      summaries: [SUMMARY_1],
    };
    case 7:  return {
      items: [
        sumItem(SUMMARY_1),
        msgItem(M[8]),msgItem(M[9]),msgItem(M[10]),msgItem(M[11]),
        msgItem(M[12]),msgItem(M[13]),msgItem(M[14]),msgItem(M[15]),
        msgItem(M[16]),msgItem(M[17]),msgItem(M[18]),msgItem(M[19]),
      ],
      summaries: [SUMMARY_1],
    };
    case 8:  return {
      items: [
        sumItem(SUMMARY_1), sumItem(SUMMARY_2),
        msgItem(M[16]),msgItem(M[17]),msgItem(M[18]),msgItem(M[19]),
      ],
      summaries: [SUMMARY_1, SUMMARY_2],
    };
    // ── (D0 scrub sits here) ──
    case 9:  return {
      items: [sumItem(SUMMARY_1),sumItem(SUMMARY_2),sumItem(SUMMARY_3),sumItem(SUMMARY_4), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4],
    };
    case 10: return {
      items: [sumItem(D1_SUMMARY), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4, D1_SUMMARY],
    };
    // ── Depth-aware prompts: full DAG with D2 shown ──
    case 11: return {
      items: [sumItem(D2_SUMMARY), ftItem],
      summaries: FULL_DAG_SUMMARIES,
    };
    // ── Bounded context + tools: full DAG in summaries, D2 in context ──
    case 12: case 13: case 14: case 15: case 16:
    case 17: case 18: case 19: case 20: return {
      items: [sumItem(D2_SUMMARY), ftItem],
      summaries: FULL_DAG_SUMMARIES,
    };
    default: return { items: [], summaries: [] };
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CompactionScene({ onStateChange, onActivate, panelRef }) {
  const [step,        setStep]        = useState(0);
  const [items,       setItems]       = useState([]);
  const [summaries,   setSummaries]   = useState([]);
  const [compacting,  setCompacting]  = useState(false);
  const [fastForward, setFastForward] = useState(false);

  const narrationRefs  = useRef([]);
  const scrubRef       = useRef(null);   // D0 scrub (between steps 8 and 9)
  const prevStepRef    = useRef(-1);
  const staggerQueue   = useRef([]);

  // Tool visualization state (steps 13–19: overview at 13, individual tools 14–19)
  const [toolView,       setToolView]       = useState(null);
  const [expandPhase,    setExpandPhase]    = useState(0);

  // Section C DAG focus mode (step 11): keeps context hidden, DAG prominent
  const [sectionCActive,  setSectionCActive]  = useState(false);



  // D0 scrub milestone flags
  const sum3Added = useRef(false);
  const sum4Added = useRef(false);

  const usedTokens = sumTokens(items);

  // DAG highlight IDs driven by tool view and expand phase
  const dagHighlightIds = useMemo(() => {
    if (toolView === 'describe') return ['sum_d2_01'];
    if (toolView === 'grep')     return ['sum_d2_01', 'sum_d1_01', 'sum_01', 'msgs_sum_01'];
    if (toolView === 'expand') {
      if (expandPhase >= 3) return ['sum_d2_01', 'sum_d1_01', 'sum_01'];
      if (expandPhase >= 2) return ['sum_d2_01', 'sum_d1_01', 'sum_01'];
      if (expandPhase >= 1) return ['sum_d2_01', 'sum_d1_01'];
    }
    return [];
  }, [toolView, expandPhase]);

  // Banner text for compaction alerts
  const bannerText = step <= 5
    ? '⚡  Compaction triggered — Turns 1–4 (2,485 tok) outside fresh tail exceed the 2,000-token threshold'
    : '⚡  Compaction triggered — Turns 5–8 (2,430 tok) outside fresh tail exceed the 2,000-token threshold';

  // ── Notify parent of state changes ──────────────────────────────────────────
  useEffect(() => {
    onStateChange?.({
      step, items, summaries, usedTokens, compacting, fastForward,
      showFreshTail: step >= 3 || fastForward,
      toolView, expandPhase, dagHighlightIds, bannerText,
      sectionCActive,
    });
  }, [step, items, summaries, usedTokens, compacting, fastForward,
      toolView, expandPhase, dagHighlightIds, bannerText,
      sectionCActive, onStateChange]);

  // ── Collapse animation (delegated to SharedPanel) ─────────────────────────
  const animateCollapse = useCallback((ids, onComplete) => {
    if (panelRef?.current?.animateCollapse) {
      panelRef.current.animateCollapse(ids, onComplete);
    } else {
      onComplete();
    }
  }, [panelRef]);

  // ── Apply step ──────────────────────────────────────────────────────────────
  const applyStep = useCallback((s) => {
    // Cancel any pending staggered additions from a previous step
    staggerQueue.current.forEach((c) => c.kill());
    staggerQueue.current = [];

    const prev = prevStepRef.current;
    prevStepRef.current = s;
    setStep(s);
    setFastForward(false);
    setCompacting(s === 4 || s === 7);

    // Tool view driven by step number (steps 13–19)
    if (s === 13) {
      setToolView('overview'); setExpandPhase(0);
    } else if (s === 14) {
      setToolView('describe'); setExpandPhase(0);
    } else if (s === 15) {
      setToolView('grep');     setExpandPhase(0);
    } else if (s === 16) {
      setToolView('expand');   setExpandPhase(1);
    } else if (s === 17) {
      setToolView('expand');   setExpandPhase(2);
    } else if (s === 18) {
      setToolView('expand');   setExpandPhase(3);
    } else if (s === 19) {
      setToolView('expand');   setExpandPhase(3);
    } else if (s === 20) {
      setToolView(null);       setExpandPhase(0);
    } else {
      setToolView(null);       setExpandPhase(0);
    }

    // Section C DAG focus mode (steps 11–12: depth-aware prompts + bounded context)
    setSectionCActive(s === 11 || s === 12);

    // Compaction collapse animations (forward only)
    if (s === 5 && prev < 5) {
      setCompacting(false);
      animateCollapse(SUMMARY_1.sourceIds, () => {
        const t = itemsForStep(5);
        setItems(t.items); setSummaries(t.summaries);
      });
      return;
    }
    if (s === 8 && prev < 8) {
      setCompacting(false);
      animateCollapse(SUMMARY_2.sourceIds, () => {
        const t = itemsForStep(8);
        setItems(t.items); setSummaries(t.summaries);
      });
      return;
    }

    // Condensation collapse (forward only: 9→10)
    if (s === 10 && prev === 9) {
      animateCollapse(
        [SUMMARY_1.id, SUMMARY_2.id, SUMMARY_3.id, SUMMARY_4.id],
        () => {
          const t = itemsForStep(10);
          setItems(t.items); setSummaries(t.summaries);
        }
      );
      return;
    }

    // Default: set target items, staggering new additions when scrolling forward
    const t = itemsForStep(s);
    setSummaries(t.summaries);

    if (s > prev && prev >= 0) {
      // Forward scroll — diff against previous step to find new items
      const prevT   = itemsForStep(prev);
      const prevIds = new Set(prevT.items.map((i) => i.data.id));
      const keep    = t.items.filter((i) => prevIds.has(i.data.id));
      const added   = t.items.filter((i) => !prevIds.has(i.data.id));

      if (added.length > 1) {
        // Stagger new items in one at a time (appended at end)
        setItems(keep);
        added.forEach((item, i) => {
          staggerQueue.current.push(
            gsap.delayedCall(i * 0.1, () => setItems((p) => [...p, item]))
          );
        });
        return;
      }
    }

    setItems(t.items);
  }, [animateCollapse]);

  // ── ScrollTriggers (narration sections) ───────────────────────────────────
  useEffect(() => {
    const triggers = narrationRefs.current.map((el, i) => {
      if (!el) return null;
      return ScrollTrigger.create({
        trigger:    el,
        start:      'top 55%',
        end:        'bottom 45%',
        onEnter:     () => { onActivate?.(); applyStep(i); },
        onEnterBack: () => { onActivate?.(); applyStep(i); },
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, [applyStep, onActivate]);

  // ── D0 scrub section ScrollTrigger (grows summaries 3 and 4) ──────────────
  useEffect(() => {
    const el = scrubRef.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start:   'top 60%',
      end:     'bottom 60%',
      scrub:   0.6,

      onEnter: () => {
        onActivate?.();
        sum3Added.current = false;
        sum4Added.current = false;
        setFastForward(true);
        setStep(-1);
        setCompacting(false);
        setItems([sumItem(SUMMARY_1), sumItem(SUMMARY_2), ftItem]);
        setSummaries([SUMMARY_1, SUMMARY_2]);
      },

      onLeaveBack: () => {
        onActivate?.();
        sum3Added.current = false;
        sum4Added.current = false;
        setFastForward(false);
        const t = itemsForStep(8);
        setItems(t.items);
        setSummaries(t.summaries);
      },

      onLeave: () => { setFastForward(false); },

      onUpdate: (self) => {
        // Milestone at 40%: summary 3 appears
        if (self.progress >= 0.4 && !sum3Added.current) {
          sum3Added.current = true;
          setSummaries((prev) =>
            prev.some((s) => s.id === SUMMARY_3.id) ? prev : [...prev, SUMMARY_3]
          );
          setItems((prev) => {
            if (prev.some((i) => i.data?.id === SUMMARY_3.id)) return prev;
            const without = prev.filter((i) => i.type !== 'fresh-placeholder');
            return [...without, sumItem(SUMMARY_3), ftItem];
          });
        }
        if (self.progress < 0.4 && sum3Added.current) {
          sum3Added.current = false;
          sum4Added.current = false;
          setSummaries([SUMMARY_1, SUMMARY_2]);
          setItems([sumItem(SUMMARY_1), sumItem(SUMMARY_2), ftItem]);
        }

        // Milestone at 72%: summary 4 appears
        if (self.progress >= 0.72 && !sum4Added.current) {
          sum4Added.current = true;
          setSummaries((prev) =>
            prev.some((s) => s.id === SUMMARY_4.id) ? prev : [...prev, SUMMARY_4]
          );
          setItems((prev) => {
            if (prev.some((i) => i.data?.id === SUMMARY_4.id)) return prev;
            const without = prev.filter((i) => i.type !== 'fresh-placeholder');
            return [...without, sumItem(SUMMARY_4), ftItem];
          });
        }
        if (self.progress < 0.72 && sum4Added.current) {
          sum4Added.current = false;
          setSummaries((prev) => prev.filter((s) => s.id !== SUMMARY_4.id));
          setItems((prev) => prev.filter((i) => i.data?.id !== SUMMARY_4.id));
        }
      },
    });

    return () => trigger.kill();
  }, [onActivate]);

  // ── D0 fast-forward card (sticky inside the D0 scrub section) ─────────────
  function FastForwardCard() {
    const summaryIds = summaries.map((s) => s.id);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--color-border)',
              width: '6px', height: '6px',
            }} className="rounded-full" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span style={{
            color: 'var(--color-summary)',
            borderColor: 'var(--color-summary)',
          }} className="rounded border px-2 py-0.5 text-[10px] font-bold tracking-widest">
            ⏩ FAST FORWARD
          </span>
        </div>
        <h2 style={{ color: 'var(--color-text)' }} className="text-2xl font-bold leading-tight m-0">
          The Conversation Keeps Growing
        </h2>
        <p style={{ color: 'var(--color-muted)', lineHeight: '1.7' }} className="text-sm m-0">
          Each new cohort of messages outside the fresh tail automatically
          triggers another compaction pass. Watch the DAG grow as you scroll.
        </p>
        <div className="flex flex-col gap-1.5">
          {[SUMMARY_3, SUMMARY_4].map((s) => {
            const present = summaryIds.includes(s.id);
            return (
              <div key={s.id} style={{
                color: present ? 'var(--color-summary)' : 'var(--color-border)',
                transition: 'color 0.4s',
              }} className="text-xs flex items-center gap-2">
                <span>{present ? '●' : '○'}</span>
                <span>{s.id} · {s.timeRange}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render (left narration column only) ────────────────────────────────────
  return (
    <>
      {/* Section 0 — transition from Traditional to LCM */}
      <div
        ref={(el) => { narrationRefs.current[0] = el; }}
        className="flex items-center"
        style={{ minHeight: 'var(--scene-first-height)', padding: `0 var(--scene-side-padding)` }}
      >
        <div className="flex flex-col gap-4">
          <span
            style={{ color: 'var(--color-summary)', borderColor: 'var(--color-summary)' }}
            className="self-start rounded border px-2 py-0.5 text-[10px] font-bold tracking-widest"
          >
            ENTER LCM
          </span>
          <Narration title={STEPS[0].title} body={STEPS[0].body} step={0} totalSteps={TOTAL_STEPS} />
        </div>
      </div>

      {/* Sections 1–8 */}
      {STEPS.slice(1, 9).map((s, i) => {
        const idx = i + 1;
        return (
          <div
            key={idx}
            ref={(el) => { narrationRefs.current[idx] = el; }}
            className="flex items-center"
            style={{ minHeight: 'var(--scene-step-height)', padding: `0 var(--scene-side-padding)` }}
          >
            {idx === 5 ? (
              <div className="flex flex-col gap-4">
                <Narration title={s.title} body={s.body} step={idx} totalSteps={TOTAL_STEPS} />
                {/* D0 compaction prompt callout */}
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--color-border)',
                  borderLeft: '2px solid var(--color-summary)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <span style={{ color: 'var(--color-summary)', fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                    COMPACTION PROMPT · DEPTH 0
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {[
                      'Summarize this conversation segment for future turns.',
                      'Preserve decisions, rationale, constraints, active tasks.',
                      'Remove repetition and conversational filler.',
                    ].map((line, i) => (
                      <span key={i} style={{ color: 'var(--color-muted)', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.5 }}>
                        {line}
                      </span>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: 'var(--color-muted)', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.5 }}>
                      End with:
                    </span>
                    <span style={{ color: 'var(--color-summary)', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.5, paddingLeft: 8 }}>
                      "Expand for details about: &lt;what was compressed&gt;"
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <Narration title={s.title} body={s.body} step={idx} totalSteps={TOTAL_STEPS} />
            )}
          </div>
        );
      })}

      {/* D0 fast-forward scrub section (grows summaries 3 and 4) */}
      <div
        ref={scrubRef}
        style={{ height: 'var(--scene-scrub-height)', position: 'relative', padding: `0 var(--scene-side-padding)` }}
      >
        <div style={{ position: 'sticky', top: 'var(--scene-scrub-sticky-top)' }}>
          <FastForwardCard />
        </div>
      </div>

      {/* Sections 9–10 (condensation threshold + pass) */}
      {STEPS.slice(9, 11).map((s, i) => {
        const globalIdx = i + 9;
        return (
          <div
            key={globalIdx}
            ref={(el) => { narrationRefs.current[globalIdx] = el; }}
            className="flex items-center"
            style={{ minHeight: 'var(--scene-step-height)', padding: `0 var(--scene-side-padding)` }}
          >
            {globalIdx === 10 ? (
              <div className="flex flex-col gap-4">
                <Narration title={s.title} body={s.body} step={globalIdx} totalSteps={TOTAL_STEPS} />
                {/* D1 condensation prompt callout */}
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--color-border)',
                  borderLeft: '2px solid var(--color-summary-d1)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <span style={{ color: 'var(--color-summary-d1)', fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.1em' }}>
                    CONDENSATION PROMPT · DEPTH 1
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {[
                      'Input: leaf summaries, not raw messages.',
                      'Preserve decisions, outcomes, blockers, in-progress state.',
                      'Drop: transient states, dead ends, process scaffolding.',
                      'Include a timeline with timestamps for key events.',
                    ].map((line, i) => (
                      <span key={i} style={{ color: 'var(--color-muted)', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.5 }}>
                        {line}
                      </span>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: 'var(--color-muted)', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.5 }}>
                      End with:
                    </span>
                    <span style={{ color: 'var(--color-summary-d1)', fontFamily: 'monospace', fontSize: '10px', lineHeight: 1.5, paddingLeft: 8 }}>
                      "Expand for details about: &lt;what was compressed&gt;"
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <Narration title={s.title} body={s.body} step={globalIdx} totalSteps={TOTAL_STEPS} />
            )}
          </div>
        );
      })}

      {/* Sections 11–19 (depth-aware prompts, bounded context, tools) */}
      {STEPS.slice(11, 20).map((s, i) => {
        const globalIdx = i + 11;
        return (
          <div
            key={globalIdx}
            ref={(el) => { narrationRefs.current[globalIdx] = el; }}
            className="flex items-center"
            style={{ minHeight: 'var(--scene-step-height)', padding: `0 var(--scene-side-padding)` }}
          >
            <div className="flex flex-col gap-4">
              <Narration title={s.title} body={s.body} step={globalIdx} totalSteps={TOTAL_STEPS} />
              {globalIdx === 11 && (
                <div className="flex flex-col gap-2" style={{ marginTop: '4px' }}>
                  {[
                    { depth: 2, color: 'var(--color-summary-d2)', text: 'Durable narrative: decisions in effect, completed work, milestone timeline' },
                    { depth: 1, color: 'var(--color-summary-d1)', text: 'Arc distillation: outcomes, what evolved, current state' },
                    { depth: 0, color: 'var(--color-summary)',    text: 'Leaf summary: exact decisions, rationale, technical details' },
                  ].map(({ depth, color, text }) => (
                    <div key={depth} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span style={{ color, fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        D{depth}
                      </span>
                      <span style={{ color, fontSize: '12px', lineHeight: '1.5' }}>
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {globalIdx === 12 && (
                <>
                  <div className="flex flex-col gap-2" style={{ marginTop: '4px' }}>
                    {[
                      { depth: 0, color: 'var(--color-summary)',    range: 'minutes' },
                      { depth: 1, color: 'var(--color-summary-d1)', range: 'hours'   },
                      { depth: 2, color: 'var(--color-summary-d2)', range: 'days'    },
                      { depth: 3, color: 'var(--color-summary-d3)', range: 'weeks'   },
                      { depth: 4, color: 'var(--color-summary-d4)', range: 'months'  },
                    ].map(({ depth, color, range }) => (
                      <div key={depth} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ color, fontFamily: 'monospace', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          D{depth}
                        </span>
                        <span style={{ color, fontSize: '12px', lineHeight: '1.5' }}>
                          {range}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p style={{ color: 'var(--color-muted)', lineHeight: '1.7', fontSize: '0.875rem', margin: 0 }}>
                    {s.epilogue}
                  </p>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Section 20 — Conclusion with resource links */}
      <div
        ref={(el) => { narrationRefs.current[20] = el; }}
        className="flex items-center"
        style={{ minHeight: 'var(--scene-first-height)', padding: `0 var(--scene-side-padding)` }}
      >
        <div className="flex flex-col gap-6" style={{ maxWidth: 420 }}>
          {/* Badge */}
          <span
            style={{ color: 'var(--color-summary)', borderColor: 'var(--color-summary)' }}
            className="self-start rounded border px-2 py-0.5 text-[10px] font-bold tracking-widest"
          >
            CONCLUSION
          </span>

          <Narration title={STEPS[20].title} body={STEPS[20].body} step={20} totalSteps={TOTAL_STEPS} />

          {/* Resource link cards */}
          <div className="flex flex-col gap-3">
            {[
              {
                label: 'PAPER',
                title: 'Lossless Context Management',
                url: 'https://papers.voltropy.com/LCM',
                color: 'var(--color-summary-d2)',
              },
              {
                label: 'OPENCLAW PLUGIN',
                title: 'lossless-claw',
                url: 'https://github.com/martian-engineering/lossless-claw',
                color: 'var(--color-summary-d1)',
              },
              {
                label: 'CODING AGENT',
                title: 'volt',
                url: 'https://github.com/martian-engineering/volt',
                color: 'var(--color-summary)',
              },
            ].map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: `1px solid color-mix(in srgb, ${link.color} 30%, transparent)`,
                  borderLeft: `2px solid ${link.color}`,
                  textDecoration: 'none',
                }}
                className="rounded-md px-4 py-3 flex flex-col gap-1 transition-all duration-200 hover:brightness-125"
              >
                <span
                  style={{ color: link.color }}
                  className="text-[9px] font-mono font-bold tracking-widest"
                >
                  {link.label}
                </span>
                <span
                  style={{ color: 'var(--color-text)' }}
                  className="text-sm font-semibold"
                >
                  {link.title}
                </span>
                <span
                  style={{ color: 'var(--color-muted)' }}
                  className="text-[11px] font-mono"
                >
                  {link.url}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 'var(--scene-end-spacer)' }} />
    </>
  );
}
