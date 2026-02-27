/**
 * Narration panel — shows a title and explanatory text for the current
 * scroll section. Fades in/out as the user scrolls between sections.
 */
import { forwardRef } from 'react';

const Narration = forwardRef(function Narration({ title, body, step, totalSteps }, ref) {
  return (
    <div ref={ref} className="flex flex-col gap-3 md:gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              background: i === step ? 'var(--color-text)' : 'var(--color-border)',
              width: i === step ? 'clamp(14px, 5vw, 20px)' : '6px',
              flexShrink: 0,
            }}
            className="h-1.5 rounded-full transition-all duration-300"
          />
        ))}
      </div>

      {/* Title */}
      <h2
        style={{ color: 'var(--color-text)' }}
        className="m-0 text-xl font-bold leading-tight md:text-2xl"
      >
        {title}
      </h2>

      {/* Body */}
      <p
        style={{ color: 'var(--color-muted)' }}
        className="text-sm m-0 leading-[1.55] md:leading-[1.7]"
      >
        {body}
      </p>
    </div>
  );
});

export default Narration;
