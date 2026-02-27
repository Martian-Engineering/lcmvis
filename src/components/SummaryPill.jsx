/**
 * SummaryPill — renders a summary item in the context window.
 * Visual style adapts to depth: depth-0 (orange), depth-1 (red-pink), etc.
 */
import { forwardRef } from 'react';

const DEPTH_META = {
  0: { color: 'var(--color-summary)', bg: 'rgba(240,136,62,0.07)', label: 'SUMMARY · DEPTH 0' },
  1: { color: 'var(--color-summary-d1)',   bg: 'rgba(255,123,114,0.07)', label: 'SUMMARY · DEPTH 1' },
};

const fallbackMeta = { color: 'var(--color-muted)', bg: 'rgba(125,133,144,0.07)', label: 'SUMMARY' };

const SummaryPill = forwardRef(function SummaryPill({ summary }, ref) {
  const { color, bg, label } = DEPTH_META[summary.depth] ?? fallbackMeta;
  const descendantLabel = summary.depth === 0
    ? `↳ ${summary.descendantCount} messages compressed`
    : `↳ ${summary.descendantCount} messages · ${summary.sourceIds?.length ?? 0} summaries`;

  return (
    <div
      ref={ref}
      style={{ borderColor: color, background: bg }}
      className="rounded-md border px-2 md:px-3 py-1.5 md:py-2 text-xs leading-snug"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-0.5 md:mb-1">
        <div className="flex items-center gap-2">
          <span
            style={{ color, borderColor: color }}
            className="rounded border px-1 py-0.5 text-[9px] font-bold tracking-widest"
          >
            {label}
          </span>
          <span style={{ color }} className="text-[10px] font-semibold">
            {summary.id}
          </span>
        </div>
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px] tabular-nums">
          {summary.tokens.toLocaleString()} tok
        </span>
      </div>

      {/* Time range + descendant count */}
      <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-1.5">
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
          {summary.timeRange}
        </span>
        <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
          {descendantLabel}
        </span>
      </div>

      {/* Content */}
      <p style={{ color: 'var(--color-text)' }} className="m-0 text-[11px] leading-relaxed line-clamp-2 hidden md:block">
        {summary.snippet}
      </p>
    </div>
  );
});

export default SummaryPill;
