/**
 * Token budget bar — shows current token usage vs total budget.
 * The fill color shifts from blue → orange → red as usage increases.
 */
import { forwardRef } from 'react';

const TokenBudget = forwardRef(function TokenBudget({ used, total, label, threshold }, ref) {
  const pct = Math.min(used / total, 1);
  const pctDisplay = Math.round(pct * 100);

  let fillColor = 'var(--color-budget)';
  if (pct >= 0.9) fillColor = 'var(--color-budget-over)';
  else if (pct >= 0.65) fillColor = 'var(--color-budget-warn)';

  return (
    <div ref={ref} className="w-full">
      {/* Label row */}
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px] uppercase tracking-widest">
          {label ?? 'Token Budget'}
        </span>
        <span style={{ color: fillColor }} className="text-[11px] font-semibold tabular-nums">
          {used.toLocaleString()} / {total.toLocaleString()} ({pctDisplay}%)
        </span>
      </div>

      {/* Track */}
      <div
        style={{ background: 'var(--color-border)' }}
        className="h-1.5 md:h-2 w-full rounded-full overflow-hidden"
      >
        {/* Fill */}
        <div
          style={{
            width: `${pctDisplay}%`,
            background: fillColor,
            transition: 'width 0.4s ease, background 0.4s ease',
          }}
          className="h-full rounded-full"
        />
      </div>

      {/* Threshold marker — only shown when a threshold value is provided */}
      {threshold != null && (
        <div className="relative mt-0.5 h-3">
          <div
            style={{ left: `${Math.round(threshold * 100)}%`, color: 'var(--color-muted)' }}
            className="absolute -translate-x-1/2 text-[9px]"
          >
            ▲ threshold
          </div>
        </div>
      )}
    </div>
  );
});

export default TokenBudget;
