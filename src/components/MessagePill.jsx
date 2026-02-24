/**
 * A single message pill rendered in the context window column.
 * Accepts a forwardRef so GSAP can animate it directly.
 */
import { forwardRef } from 'react';

const ROLE_STYLES = {
  user:      { border: 'var(--color-user)',      label: 'U' },
  assistant: { border: 'var(--color-assistant)', label: 'A' },
  tool:      { border: 'var(--color-tool)',       label: 'T' },
};

const MessagePill = forwardRef(function MessagePill({ message, isFresh, dim }, ref) {
  const { border, label } = ROLE_STYLES[message.role] ?? ROLE_STYLES.user;

  return (
    <div
      ref={ref}
      style={{
        borderColor: border,
        opacity: dim ? 0.35 : 1,
        transition: 'opacity 0.3s',
      }}
      className="flex items-start gap-2 rounded-md border px-3 py-2 text-xs leading-snug"
    >
      {/* Role badge */}
      <span
        style={{ color: border, borderColor: border }}
        className="mt-0.5 shrink-0 rounded border px-1 py-0.5 text-[10px] font-bold tracking-widest"
      >
        {label}
      </span>

      <div className="min-w-0 flex-1">
        {/* Turn label + token count */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span style={{ color: 'var(--color-muted)' }} className="text-[10px]">
            {message.label}
          </span>
          <span style={{ color: 'var(--color-muted)' }} className="text-[10px] tabular-nums">
            {message.tokens.toLocaleString()} tok
          </span>
        </div>
        {/* Content snippet */}
        <p style={{ color: 'var(--color-text)' }} className="m-0 truncate">
          {message.snippet}
        </p>
      </div>

      {/* Fresh tail indicator */}
      {isFresh && (
        <span
          style={{ color: 'var(--color-fresh)', borderColor: 'var(--color-fresh)' }}
          className="mt-0.5 shrink-0 rounded border px-1 py-0.5 text-[9px] font-semibold"
        >
          FRESH TAIL
        </span>
      )}
    </div>
  );
});

export default MessagePill;
