/**
 * CompactionScene — left-column narration for the LCM compaction section.
 * Does NOT render a right panel; state is communicated to SharedPanel via
 * the onStateChange callback.
 *
 * Structure (top to bottom):
 *   Section 0     Transition ("There's a better way")
 *   Sections 1–8  Compaction narration (80vh each)
 *   Scrub section 220vh; ScrollTrigger scrub drives summary 3 and 4
 *   Sections 9–18 Condensation, bounded context, tools intro, tool demos
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

// ── Narration copy ──────────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'There\'s a better way.',
    body: 'LCM starts the same way — a conversation accumulating messages — but instead of truncating, it compacts them into layered summaries where nothing is ever lost.',
  },
  {
    title: 'Messages Arrive',
    body: 'Each user message and assistant reply appends to the context. Tokens accumulate. Early on there\'s plenty of headroom.',
  },
  {
    title: 'The Budget Fills',
    body: 'As the conversation grows, the budget bar climbs. LCM monitors this continuously.',
  },
  {
    title: 'The Fresh Tail',
    body: 'LCM always protects the most recent raw messages — the "fresh tail." These are never compacted. Everything older is eligible for summarization. In this simplified example the fresh tail is 4 messages; in real-world use it would be much larger.',
  },
  {
    title: 'Incremental Compaction',
    body: 'When raw messages outside the fresh tail exceed 2,000 tokens, LCM automatically fires incremental compaction. This happens asynchronously — your conversation isn\'t interrupted. And because source messages are never lost in LCM, compaction is always safe.',
  },
  {
    title: 'Summary Compaction',
    body: 'The eligible chunk is sent to the model with a structured prompt. A summary replaces the source messages in the conversation, but the references to the source messages are preserved. We\'ll discuss how these source messages are accessed later when we discuss expansion.',
  },
  {
    title: 'The Conversation Continues',
    body: 'New messages arrive. The fresh tail advances. The summary is a compact stand-in — the agent can expand it on demand.',
  },
  {
    title: 'The Cycle Repeats',
    body: 'After more turns, a new cohort of messages accumulates outside the fresh tail. The threshold is crossed and another compaction pass fires automatically.',
  },
  {
    title: 'Second Compaction Pass',
    body: 'A second summary is created. The Summary DAG now has two summary nodes, each a dense slice of conversation history.',
  },
  {
    title: 'Condensation Threshold',
    body: 'When enough summaries accumulate at the same depth — 4 in this case — LCM fires a condensation pass. They are synthesized into a single depth-1 node.',
  },
  {
    title: 'Condensation Pass',
    body: 'The four summaries are sent to the model with a higher-level synthesis prompt. The result is a depth-1 summary: more abstract, more durable, covering the full arc.',
  },
  {
    title: 'A Bounded, Lossless Context',
    body: 'The conversation has grown considerably, yet the context remains tight and compact. Nothing was discarded. Every message lives in the DAG — but how does the model actually access it?',
  },
  {
    title: 'Retrieval Tools',
    body: 'LCM ships with a set of tools that give the agent structured access to the summary DAG. The agent can inspect nodes, search across depths, and expand any summary back to its source messages — all without loading the full history into context.',
  },
  {
    title: 'Tool: lcm_describe',
    body: 'Before searching, the agent can inspect any node directly with lcm_describe. It returns the node\'s token count, time range, depth, and child IDs — a structural map of the DAG before any retrieval begins.',
  },
  {
    title: 'Tool: lcm_grep',
    body: 'lcm_grep performs full-text search across every node in the DAG — raw messages and summaries alike. Results come back ranked with node IDs, depth labels, and matching snippets. The agent pinpoints exactly where a topic lives.',
  },
  {
    title: 'Tool: lcm_expand_query',
    body: 'When a summary isn\'t enough — when the agent needs the original details, not just an abstraction — it calls lcm_expand_query. This is the heart of lossless recall: full-fidelity access to any summarized section, without pulling all those tokens back into the main context.',
  },
  {
    title: 'Bounded Sub-Agent',
    body: 'lcm_expand_query issues a delegation grant: a scoped authorization token with a conversation scope and token cap. It spawns a dedicated sub-agent carrying that grant. The sub-agent\'s context expands for this task. The main agent\'s context is unchanged.',
  },
  {
    title: 'Walking the DAG',
    body: 'The sub-agent walks the summary DAG downward — reading the depth-1 node, expanding into the relevant summary, then fetching the underlying source messages. Only what\'s needed is retrieved, bounded by the grant\'s token cap.',
  },
  {
    title: 'Focused Answer',
    body: 'Full source fidelity with bounded cost. The sub-agent synthesizes a precise answer from the original content and returns it to the main agent. The main context is unchanged — but it now has the exact information it needed from the very first messages of the conversation.',
  },
  {
    title: 'The Cycle Continues',
    body: 'As more turns accumulate, LCM keeps running. Each new cohort outside the fresh tail triggers a leaf pass. Each group of four leaf summaries triggers a depth-1 condensation. The DAG grows deeper.',
  },
  {
    title: 'Depth-1 Condensations',
    body: 'Three more depth-1 condensations have fired — one for each new block of turns. Four depth-1 nodes now cover the full arc. LCM is about to do something it has never done in this conversation before.',
  },
  {
    title: 'Depth-2 Condensation',
    body: 'Four depth-1 nodes at the same depth — the condensation threshold is crossed again. LCM fires a depth-2 pass, synthesizing all four into a single node covering 64 turns. The DAG is now three levels deep.',
  },
  {
    title: 'Depth-Aware Prompts',
    body: 'Each depth runs a different prompt. Leaf summaries capture specifics: decisions, rationale, exact technical details. Depth-1 distills the arc: what evolved, outcomes, current state. Depth-2 produces a durable narrative — decisions still in effect and a milestone timeline — the kind of context that stays useful for weeks.',
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

/** Target state for each narration step. */
function itemsForStep(s) {
  switch (s) {
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
    case 9:  return {
      items: [sumItem(SUMMARY_1),sumItem(SUMMARY_2),sumItem(SUMMARY_3),sumItem(SUMMARY_4), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4],
    };
    case 10: case 11: case 12: case 13: case 14:
    case 15: case 16: case 17: case 18: return {
      items: [sumItem(D1_SUMMARY), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4, D1_SUMMARY],
    };
    // Section C steps: DAG grows; context stays hidden, DAG takes focus.
    case 19: return {
      items: [sumItem(D1_SUMMARY), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4,
                  D1_SUMMARY, D1_SUMMARY_2, D1_SUMMARY_3, D1_SUMMARY_4],
    };
    case 20: case 21: case 22: return {
      items: [sumItem(D1_SUMMARY), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4,
                  D1_SUMMARY, D1_SUMMARY_2, D1_SUMMARY_3, D1_SUMMARY_4, D2_SUMMARY],
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
  const scrubRef       = useRef(null);
  const prevStepRef    = useRef(-1);
  const staggerQueue   = useRef([]);

  // Tool visualization state (steps 13–18)
  const [toolView,       setToolView]       = useState(null);
  const [expandPhase,    setExpandPhase]    = useState(0);

  // Section C DAG focus mode (steps 19–22): keeps context hidden, DAG prominent
  const [sectionCActive,  setSectionCActive]  = useState(false);

  // DAG prompt labels state (steps 21–22)
  const [dagPromptLabels, setDagPromptLabels] = useState(false);


  // Scrub milestone flags
  const sum3Added = useRef(false);
  const sum4Added = useRef(false);

  const usedTokens = sumTokens(items);

  // DAG highlight IDs driven by tool view and expand phase
  const dagHighlightIds = useMemo(() => {
    if (toolView === 'describe') return ['sum_d1_01'];
    if (toolView === 'grep')     return ['sum_d1_01', 'sum_01', 'msgs_sum_01'];
    if (toolView === 'expand') {
      if (expandPhase >= 3) return ['sum_d1_01', 'sum_01', 'msgs_sum_01'];
      if (expandPhase >= 2) return ['sum_d1_01', 'sum_01'];
      if (expandPhase >= 1) return ['sum_d1_01'];
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
      dagPromptLabels,
    });
  }, [step, items, summaries, usedTokens, compacting, fastForward,
      toolView, expandPhase, dagHighlightIds, bannerText,
      sectionCActive,
      dagPromptLabels, onStateChange]);

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

    // Tool view driven by step number (steps 13–18)
    if (s === 13) {
      setToolView('describe'); setExpandPhase(0);
    } else if (s === 14) {
      setToolView('grep');     setExpandPhase(0);
    } else if (s === 15) {
      setToolView('expand');   setExpandPhase(1);
    } else if (s === 16) {
      setToolView('expand');   setExpandPhase(2);
    } else if (s === 17) {
      setToolView('expand');   setExpandPhase(3);
    } else if (s === 18) {
      setToolView('expand');   setExpandPhase(3);
    } else {
      setToolView(null);       setExpandPhase(0);
    }

    // Section C DAG focus mode (steps 19–22)
    setSectionCActive(s >= 19 && s <= 22);

    // DAG prompt labels (steps 21–22)
    if (s >= 21 && s <= 22) {
      setDagPromptLabels(true);
    } else {
      setDagPromptLabels(false);
    }

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

  // ── Scrub section ScrollTrigger ───────────────────────────────────────────
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

  // ── Fast-forward card (sticky inside the scrub section) ────────────────────
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
        style={{ minHeight: '100vh', padding: '0 3.5rem' }}
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
            style={{ minHeight: '80vh', padding: '0 3.5rem' }}
          >
            <Narration title={s.title} body={s.body} step={idx} totalSteps={TOTAL_STEPS} />
          </div>
        );
      })}

      {/* Fast-forward scrub section */}
      <div
        ref={scrubRef}
        style={{ height: '220vh', position: 'relative', padding: '0 3.5rem' }}
      >
        <div style={{ position: 'sticky', top: '38vh' }}>
          <FastForwardCard />
        </div>
      </div>

      {/* Sections 9–18 */}
      {STEPS.slice(9).map((s, i) => {
        const globalIdx = i + 9;
        return (
          <div
            key={globalIdx}
            ref={(el) => { narrationRefs.current[globalIdx] = el; }}
            className="flex items-center"
            style={{ minHeight: '80vh', padding: '0 3.5rem' }}
          >
            <Narration title={s.title} body={s.body} step={globalIdx} totalSteps={TOTAL_STEPS} />
          </div>
        );
      })}

      <div style={{ height: '40vh' }} />
    </>
  );
}
