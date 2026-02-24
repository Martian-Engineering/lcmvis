/**
 * CompactionScene — scrollytelling orchestrator.
 *
 * Structure (left column, top to bottom):
 *   Sections 0–8   Normal narration (80vh each, 100vh for section 0)
 *   Scrub section  220vh tall; sticky inner card; ScrollTrigger scrub drives
 *                  summary 3 and summary 4 appearing as the user scrolls
 *   Sections 9–13  Normal narration: condensation threshold, d1 pass,
 *                  bounded context, and tool stubs (describe/grep, expand)
 *
 * Right column stays sticky at 100vh throughout.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ContextWindow from './ContextWindow';
import DagPanel from './DagPanel';
import ToolPanel from './ToolPanel';
import Narration from './Narration';
import {
  MESSAGES as M,
  SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4, D1_SUMMARY,
  FRESH_TAIL_PLACEHOLDER,
} from '../data/conversation';

gsap.registerPlugin(ScrollTrigger);

// ── Narration copy ──────────────────────────────────────────────────────────
// Indices 0–8 are the compaction act; 9–11 are condensation; 12–16 are tool demos.
const STEPS = [
  {
    title: 'The Context Window',
    body: 'Every model turn, the full conversation must fit inside a fixed token budget. Without management, older messages are silently truncated and lost forever.',
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
    body: 'LCM always protects the most recent raw messages — the "fresh tail." These are never compacted. Everything older is eligible for summarization.',
  },
  {
    title: 'Compaction Triggers',
    body: 'When raw messages outside the fresh tail exceed 2,000 tokens, LCM automatically fires incremental compaction. No manual command needed.',
  },
  {
    title: 'Summary Compaction',
    body: 'The eligible chunk is sent to the model with a structured prompt. A dense, lossless summary comes back. The original messages are replaced — but nothing is lost.',
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
  // Post-scrub: condensation act
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
    body: 'The conversation has grown enormous, yet the context stays bounded. Nothing was discarded. Every message lives in the DAG — but how does the model actually access it?',
  },
  {
    title: 'lcm_describe',
    body: 'Before searching, the agent can inspect any node directly with lcm_describe. It returns the node\'s token count, time range, depth, and child IDs — a structural map of the DAG before any retrieval begins.',
  },
  {
    title: 'lcm_grep',
    body: 'lcm_grep performs full-text search across every node in the DAG — raw messages and summaries alike. Results come back ranked with node IDs, depth labels, and matching snippets. The agent pinpoints exactly where a topic lives.',
  },
  {
    title: 'lcm_expand_query',
    body: 'When a summary hit isn\'t enough — when the agent needs the original details, not just an abstraction — it calls lcm_expand_query. This is the heart of lossless recall: full-fidelity access to any summarized section, without pulling all those tokens back into the main context.',
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
    body: 'The sub-agent synthesizes a precise answer from the original content and returns it to the main agent. Full fidelity. Bounded cost. The main context is unchanged — but it now has the exact information it needed from the very first messages of the conversation.',
  },
];

const TOTAL_STEPS = STEPS.length; // 18

// ── Helpers ─────────────────────────────────────────────────────────────────
const msgItem = (msg) => ({ type: 'message',           data: msg });
const sumItem = (s)   => ({ type: 'summary',           data: s   });
const ftItem  =          { type: 'fresh-placeholder', data: FRESH_TAIL_PLACEHOLDER };

function sumTokens(items) {
  return items.reduce((acc, i) => acc + (i.data.tokens ?? 0), 0);
}

// Target state for each narration step (used for instant transitions and
// as the final state after collapse animations complete).
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
    // Post-scrub states (summaries 3 and 4 already added by the scrub section)
    case 9:  return {
      items: [sumItem(SUMMARY_1),sumItem(SUMMARY_2),sumItem(SUMMARY_3),sumItem(SUMMARY_4), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4],
    };
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
    case 16:
    case 17: return {
      items: [sumItem(D1_SUMMARY), ftItem],
      summaries: [SUMMARY_1, SUMMARY_2, SUMMARY_3, SUMMARY_4, D1_SUMMARY],
    };
    default: return { items: [], summaries: [] };
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function CompactionScene() {
  const [step,        setStep]        = useState(0);
  const [items,       setItems]       = useState([]);
  const [summaries,   setSummaries]   = useState([]);
  const [compacting,  setCompacting]  = useState(false);
  const [fastForward, setFastForward] = useState(false);

  const ctxWindowRef   = useRef(null);
  const narrationRefs  = useRef([]);   // refs for sections 0–8 and 9–13
  const scrubRef       = useRef(null); // the 220vh fast-forward div
  const prevStepRef    = useRef(-1);
  const prevItemIdsRef = useRef(new Set());
  const collapseAnimRef = useRef(null);

  // Tool visualization state (steps 12–17)
  const [toolView,    setToolView]    = useState(null);  // null | 'describe' | 'grep' | 'expand'
  const [expandPhase, setExpandPhase] = useState(0);     // 1..3 (driven by step, not timer)

  // Scrub milestone flags for summary 3 and 4 (reset when leaving scrub section backward)
  const sum3Added = useRef(false);
  const sum4Added = useRef(false);

  const usedTokens = sumTokens(items);

  // DAG nodes to highlight — driven by active tool view and expand phase.
  // describe: highlights the node being inspected (d1).
  // grep: hits span messages + both summary levels.
  // expand: sub-agent walks d1 → summary → message group progressively.
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

  // ── Collapse animation ──────────────────────────────────────────────────
  const animateCollapse = useCallback((ids, onComplete) => {
    const els = ids.map((id) => ctxWindowRef.current?.getItemEl(id)).filter(Boolean);
    if (els.length === 0) { onComplete(); return; }

    els.forEach((el) => gsap.set(el, { height: el.offsetHeight, overflow: 'hidden' }));
    if (collapseAnimRef.current) collapseAnimRef.current.kill();

    collapseAnimRef.current = gsap.to(els, {
      height: 0, opacity: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0,
      duration: 0.28,
      stagger: { amount: 0.3, from: 'end' },
      ease: 'power2.in',
      onComplete: () => {
        els.forEach((el) => gsap.set(el, { clearProps: 'all' }));
        collapseAnimRef.current = null;
        onComplete();
      },
    });
  }, []);

  // ── Apply step (instant for most; animated for compaction and d1 steps) ──
  const applyStep = useCallback((s) => {
    const prev = prevStepRef.current;
    prevStepRef.current = s;
    setStep(s);
    setFastForward(false);
    setCompacting(s === 4 || s === 7);

    // Tool view and expand phase are driven directly by step number — no timers needed.
    if (s === 12) {
      setToolView('describe'); setExpandPhase(0);
    } else if (s === 13) {
      setToolView('grep');     setExpandPhase(0);
    } else if (s === 14) {
      setToolView('expand');   setExpandPhase(1);  // grant issued + sub-agent spawned + d1 read
    } else if (s === 15) {
      setToolView('expand');   setExpandPhase(2);  // summary expanded + source messages fetched
    } else if (s === 16) {
      setToolView('expand');   setExpandPhase(3);  // synthesis complete + answer returned
    } else if (s === 17) {
      setToolView('expand');   setExpandPhase(3);  // same state, extra scroll step for reading
    } else {
      setToolView(null);       setExpandPhase(0);
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

    // Condensation collapse animation (forward only: steps 9→10)
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

    const t = itemsForStep(s);
    setItems(t.items);
    setSummaries(t.summaries);
  }, [animateCollapse]);

  // ── Stagger new items ────────────────────────────────────────────────────
  useEffect(() => {
    const currentIds = new Set(items.map((i) => i.data.id));
    const newIds = [...currentIds].filter((id) => !prevItemIdsRef.current.has(id));
    prevItemIdsRef.current = currentIds;
    if (newIds.length === 0) return;

    const frame = requestAnimationFrame(() => {
      const els = newIds.map((id) => ctxWindowRef.current?.getItemEl(id)).filter(Boolean);
      if (els.length === 0) return;
      gsap.fromTo(els,
        { opacity: 0, y: -14, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.38, stagger: 0.07, ease: 'power2.out' }
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [items]);

  // ── Normal narration ScrollTriggers (sections 0–8 and 9–13) ─────────────
  useEffect(() => {
    const triggers = narrationRefs.current.map((el, i) => {
      if (!el) return null;
      return ScrollTrigger.create({
        trigger:    el,
        start:      'top 55%',
        end:        'bottom 45%',
        onEnter:     () => applyStep(i),
        onEnterBack: () => applyStep(i),
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, [applyStep]);

  // ── Scrub section ScrollTrigger ──────────────────────────────────────────
  useEffect(() => {
    const el = scrubRef.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start:   'top 60%',
      end:     'bottom 60%',
      scrub:   0.6,

      onEnter: () => {
        // Start of fast-forward: reset to end-of-step-8 state + placeholder
        sum3Added.current = false;
        sum4Added.current = false;
        setFastForward(true);
        setStep(-1); // not a numbered narration step
        setCompacting(false);
        setItems([sumItem(SUMMARY_1), sumItem(SUMMARY_2), ftItem]);
        setSummaries([SUMMARY_1, SUMMARY_2]);
      },

      onLeaveBack: () => {
        // Scrolled back above the scrub section — revert to step 8
        sum3Added.current = false;
        sum4Added.current = false;
        setFastForward(false);
        const t = itemsForStep(8);
        setItems(t.items);
        setSummaries(t.summaries);
      },

      onLeave: () => {
        // Finished scrolling through — ensure all 4 leaves present, exit FF
        setFastForward(false);
      },

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
          // Scrolled backward past milestone — remove summary 3 (and 4 if present)
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
  }, []);

  // ── Banner copy ───────────────────────────────────────────────────────────
  const bannerText = step <= 5
    ? '⚡  Compaction triggered — Turns 1–4 (2,485 tok) outside fresh tail exceed the 2,000-token threshold'
    : '⚡  Compaction triggered — Turns 5–8 (2,430 tok) outside fresh tail exceed the 2,000-token threshold';

  // ── Fast-forward card (sticky inside the scrub section) ──────────────────
  function FastForwardCard() {
    const newSummaryIds = [SUMMARY_3.id, SUMMARY_4.id];
    const summaryIds = summaries.map((s) => s.id);
    return (
      <div className="flex flex-col gap-4">
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--color-border)',
              width: '6px', height: '6px',
            }} className="rounded-full" />
          ))}
        </div>
        {/* Badge */}
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
        {/* Summary accumulation tracker */}
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex" style={{ minHeight: '100vh' }}>

      {/* ── Left: scrollable narration ──────────────────────────────────── */}
      <div className="flex flex-col" style={{ width: '45%' }}>

        {/* Sections 0–8 */}
        {STEPS.slice(0, 9).map((s, i) => (
          <div
            key={i}
            ref={(el) => { narrationRefs.current[i] = el; }}
            className="flex items-center"
            style={{ minHeight: i === 0 ? '100vh' : '80vh', padding: '0 3.5rem' }}
          >
            <Narration title={s.title} body={s.body} step={i} totalSteps={TOTAL_STEPS} />
          </div>
        ))}

        {/* Fast-forward scrub section */}
        <div
          ref={scrubRef}
          style={{ height: '220vh', position: 'relative', padding: '0 3.5rem' }}
        >
          <div style={{ position: 'sticky', top: '38vh' }}>
            <FastForwardCard />
          </div>
        </div>

        {/* Sections 9–17 */}
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
      </div>

      {/* ── Right: sticky visualization ─────────────────────────────────── */}
      <div style={{
        width: '55%', position: 'sticky', top: 0, height: '100vh',
        padding: '1.25rem 2.5rem 1.25rem 1rem',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {/*
         * Compaction alert banner — collapses to zero height when not compacting
         * so it doesn't waste layout space during the tool demonstration steps.
         */}
        <div style={{
          background: 'rgba(240,136,62,0.13)',
          border: '1px solid var(--color-summary)',
          color: 'var(--color-summary)',
          maxHeight: compacting ? '60px' : 0,
          overflow: 'hidden',
          opacity: compacting ? 1 : 0,
          transition: 'max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
          pointerEvents: 'none',
          flexShrink: 0,
        }} className="rounded-lg px-3 py-2 text-xs font-semibold">
          {bannerText}
        </div>

        {/*
         * Layout modes — context window always sits at the top of the flex column:
         *
         *   Normal  (steps 0–11): ContextWindow fills remaining space; DAG at 40%
         *   Tool    (steps 12–17): ContextWindow collapses to 0 (slides upward);
         *                          DAG expands to 48%; ToolPanel slides in at 44%
         *
         * Using maxHeight + opacity on the context window for the collapse animation
         * since CSS cannot transition height: auto → height: 0 directly.
         */}

        {/* Context window — always at top, collapses when tool steps are active */}
        <div style={{
          flexShrink: 0,
          flex: toolView ? '0 0 auto' : '1 1 auto',
          maxHeight: toolView ? 0 : '70vh',
          minHeight: 0,
          overflow: 'hidden',
          opacity: toolView ? 0 : 1,
          transition: 'max-height 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
        }}>
          <ContextWindow
            ref={ctxWindowRef}
            items={items}
            usedTokens={usedTokens}
            fastForward={fastForward}
          />
        </div>

        {/* DAG panel — slides in when first summary appears; expands in tool mode */}
        <div style={{
          flexShrink: 0,
          height: summaries.length > 0 ? (toolView ? '48%' : '40%') : 0,
          overflow: 'hidden',
          transition: 'height 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {summaries.length > 0 && <DagPanel summaries={summaries} highlightIds={dagHighlightIds} />}
        </div>

        {/* Tool panel — slides in when a tool step is active (44% gives ample real estate) */}
        <div style={{
          flexShrink: 0,
          height: toolView ? '44%' : 0,
          overflow: 'hidden',
          transition: 'height 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {toolView && <ToolPanel view={toolView} expandPhase={expandPhase} />}
        </div>
      </div>
    </div>
  );
}
