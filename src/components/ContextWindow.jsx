/**
 * ContextWindow — the sticky right panel showing the ordered list of context
 * items (messages, summaries, fresh-tail placeholder) that the model sees.
 *
 * Props:
 *   items       — ordered array of { type, data } context items
 *   usedTokens  — current token total (for the budget bar)
 *   fastForward — when true, shows a ⏩ badge in the header
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import MessagePill from './MessagePill';
import SummaryPill from './SummaryPill';
import FreshTailPlaceholder from './FreshTailPlaceholder';
import TokenBudget from './TokenBudget';
import { TOTAL_BUDGET, FRESH_TAIL_COUNT } from '../data/conversation';

const ContextWindow = forwardRef(function ContextWindow({ items, usedTokens, fastForward }, ref) {
  const itemRefs  = useRef({});
  const scrollRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getItemEl: (id) => itemRefs.current[id],
  }));

  // Scroll to bottom whenever items change so new arrivals are always visible
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [items]);

  // Fresh tail: last FRESH_TAIL_COUNT raw messages
  const rawIds = items.filter((i) => i.type === 'message').map((i) => i.data.id);
  const freshIds = new Set(rawIds.slice(-FRESH_TAIL_COUNT));

  return (
    <div
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      className="rounded-xl p-4 flex flex-col gap-3 h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-widest m-0">
            Context Window
          </h3>
          {fastForward && (
            <span
              style={{ color: 'var(--color-summary-leaf)', borderColor: 'var(--color-summary-leaf)' }}
              className="rounded border px-1 py-0.5 text-[9px] font-bold tracking-widest"
            >
              ⏩ FF
            </span>
          )}
        </div>
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Token budget */}
      <div className="shrink-0">
        <TokenBudget used={usedTokens} total={TOTAL_BUDGET} />
      </div>

      <div style={{ borderColor: 'var(--color-border)' }} className="border-t shrink-0" />

      {/* Items list — oldest at top, newest at bottom */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
        {items.length === 0 && (
          <p style={{ color: 'var(--color-muted)' }} className="text-xs text-center mt-8">
            Waiting for messages…
          </p>
        )}
        {items.map((item) => {
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

      {/* Legend */}
      <div
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
        className="border-t pt-2 shrink-0 text-[10px] flex items-center gap-1.5"
      >
        <span style={{ color: 'var(--color-fresh)' }}>●</span>
        Last {FRESH_TAIL_COUNT} messages protected from compaction (fresh tail)
      </div>
    </div>
  );
});

export default ContextWindow;
