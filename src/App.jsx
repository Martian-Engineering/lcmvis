/**
 * Root application component.
 *
 * Renders a hero, then a unified flex layout where both TraditionalScene and
 * CompactionScene share a single persistent right panel (SharedPanel).
 * The panel transitions smoothly from Traditional to LCM mode as the user
 * scrolls — no jarring panel swap.
 */
import { useCallback, useRef, useState } from 'react';
import TraditionalScene from './components/TraditionalScene';
import CompactionScene from './components/CompactionScene';
import SharedPanel from './components/SharedPanel';
import { AgentationOverlay } from './components/AgentationOverlay';

function Hero() {
  return (
    <div
      className="flex min-h-[56vh] flex-col items-center justify-center px-4 py-12 text-center sm:px-6 md:min-h-screen md:px-8 md:py-16"
    >
      <p
        style={{ color: 'var(--color-summary)' }}
        className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] md:mb-4 md:text-xs"
      >
        Lossless Context Management
      </p>
      <h1
        style={{ color: 'var(--color-text)' }}
        className="m-0 mb-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:mb-6 md:text-5xl"
      >
        Don't Lose Your Context
      </h1>
      <p
        style={{ color: 'var(--color-muted)', lineHeight: '1.7' }}
        className="m-0 mb-8 max-w-xl text-sm md:mb-10 md:text-base"
      >
        Traditional agents use compaction systems that replace your conversation with lossy summaries when context fills up.
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

export default function App() {
  const panelRef = useRef(null);

  // Mode: which scene is active ('traditional' or 'lcm').
  // Only switched by ScrollTrigger activation — never by state-change effects.
  const [mode, setMode] = useState('traditional');

  // Stable mode activators — called from ScrollTrigger handlers only.
  // activateLcm clears tradState so stale Traditional content (e.g. the
  // flat summary card) doesn't linger into the LCM section.
  const activateTrad = useCallback(() => setMode('traditional'), []);
  const activateLcm  = useCallback(() => { setMode('lcm'); setTradState(null); }, []);

  // State blobs from each scene, passed through to SharedPanel
  const [tradState, setTradState] = useState(null);
  const [lcmState,  setLcmState]  = useState(null);

  // State handlers — report data only, don't switch mode
  const handleTradState = useCallback((state) => {
    setTradState(state);
  }, []);

  const handleLcmState = useCallback((state) => {
    setLcmState(state);
  }, []);

  return (
    <main>
      <Hero />

      {/* Unified flex layout — single right panel spans both scenes */}
      <div className="relative flex min-h-screen flex-col md:flex-row">
        {/* Right column on desktop, sticky header on mobile */}
        <div
          className="order-1 w-full bg-[var(--color-bg)] md:order-2 md:w-[55%]"
          style={{
            position: 'sticky',
            top: 0,
            height: 'var(--panel-sticky-height)',
            zIndex: 10,
            overflow: 'visible',
          }}
        >
          <SharedPanel
            ref={panelRef}
            mode={mode}
            tradState={tradState}
            lcmState={lcmState}
          />
          {/* Gradient fade at bottom edge — softens the panel/narration boundary on mobile */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-full md:hidden"
            style={{
              height: '2rem',
              background: 'linear-gradient(to bottom, var(--color-bg), transparent)',
            }}
          />
        </div>

        {/* Left column: both scenes' narration stacked vertically */}
        <div className="order-2 flex w-full flex-col md:order-1 md:w-[45%]">
          <TraditionalScene
            onStateChange={handleTradState}
            onActivate={activateTrad}
            panelRef={panelRef}
          />
          <CompactionScene
            onStateChange={handleLcmState}
            onActivate={activateLcm}
            panelRef={panelRef}
          />
        </div>
      </div>

      <AgentationOverlay />
    </main>
  );
}
