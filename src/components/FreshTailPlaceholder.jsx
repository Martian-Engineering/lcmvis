/**
 * FreshTailPlaceholder — shown during fast-forward mode in place of the
 * individual fresh-tail message pills. Represents "N messages currently
 * in the fresh tail" without tracking them turn-by-turn.
 */
import { forwardRef } from 'react';
import { FRESH_TAIL_COUNT } from '../data/conversation';

const FreshTailPlaceholder = forwardRef(function FreshTailPlaceholder(_, ref) {
  return (
    <div
      ref={ref}
      style={{
        borderColor: 'var(--color-fresh)',
        background: 'rgba(86,211,100,0.05)',
      }}
      className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs"
    >
      <span style={{ color: 'var(--color-fresh)', fontSize: 10 }}>●</span>
      <span style={{ color: 'var(--color-muted)' }}>
        {FRESH_TAIL_COUNT} messages · fresh tail · ~480 tok
      </span>
      <span
        style={{ color: 'var(--color-fresh)', borderColor: 'var(--color-fresh)' }}
        className="ml-auto shrink-0 rounded border px-1 py-0.5 text-[9px] font-semibold"
      >
        FRESH
      </span>
    </div>
  );
});

export default FreshTailPlaceholder;
