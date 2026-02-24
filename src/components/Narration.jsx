/**
 * Narration panel — shows a title and explanatory text for the current
 * scroll section. Fades in/out as the user scrolls between sections.
 */
import { forwardRef } from 'react';

const Narration = forwardRef(function Narration({ title, body, step, totalSteps }, ref) {
  return (
    <div ref={ref} className="flex flex-col gap-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              background: i === step ? 'var(--color-text)' : 'var(--color-border)',
              width: i === step ? '20px' : '6px',
            }}
            className="h-1.5 rounded-full transition-all duration-300"
          />
        ))}
      </div>

      {/* Title */}
      <h2
        style={{ color: 'var(--color-text)' }}
        className="text-2xl font-bold leading-tight m-0"
      >
        {title}
      </h2>

      {/* Body */}
      <p
        style={{ color: 'var(--color-muted)', lineHeight: '1.7' }}
        className="text-sm m-0"
      >
        {body}
      </p>
    </div>
  );
});

export default Narration;
