/**
 * Root application component.
 * Renders a hero, the TraditionalScene (showing the problem), then CompactionScene (the LCM solution).
 */
import CompactionScene from './components/CompactionScene';
import TraditionalScene from './components/TraditionalScene';

function Hero() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '100vh', padding: '4rem 2rem' }}
    >
      <p
        style={{ color: 'var(--color-summary-leaf)' }}
        className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
      >
        Lossless Context Management
      </p>
      <h1
        style={{ color: 'var(--color-text)' }}
        className="text-5xl font-bold leading-tight m-0 mb-6 max-w-2xl"
      >
        Context Without Compromise
      </h1>
      <p
        style={{ color: 'var(--color-muted)', lineHeight: '1.7' }}
        className="text-base max-w-xl m-0 mb-10"
      >
        Traditional LLMs silently drop your oldest messages when the context fills up.
        LCM replaces that lossy truncation with hierarchical summarization — every
        message preserved, every detail recoverable on demand.
      </p>
      <div
        style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
        className="flex flex-col items-center gap-1 border rounded-full px-4 py-2 text-xs animate-bounce"
      >
        <span>scroll to explore</span>
        <span>↓</span>
      </div>
    </div>
  );
}

// Divider between the traditional problem section and the LCM solution section
function TransitionDivider() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '60vh', padding: '4rem 2rem' }}
    >
      <div style={{ borderColor: 'var(--color-border)' }} className="w-px h-16 border-l mb-8" />
      <span
        style={{ color: 'var(--color-summary-leaf)', borderColor: 'var(--color-summary-leaf)' }}
        className="rounded border px-3 py-1 text-xs font-bold tracking-widest mb-6"
      >
        ENTER LCM
      </span>
      <h2
        style={{ color: 'var(--color-text)' }}
        className="text-3xl font-bold m-0 mb-4"
      >
        There's a better way.
      </h2>
      <p
        style={{ color: 'var(--color-muted)', lineHeight: '1.7' }}
        className="text-sm max-w-lg m-0"
      >
        LCM starts the same way — a conversation accumulating messages — but instead
        of truncating, it compacts them into a lossless hierarchical summary DAG.
      </p>
      <div style={{ borderColor: 'var(--color-border)' }} className="w-px h-16 border-l mt-8" />
    </div>
  );
}

export default function App() {
  return (
    <main>
      <Hero />
      <TraditionalScene />
      <TransitionDivider />
      <CompactionScene />
    </main>
  );
}
