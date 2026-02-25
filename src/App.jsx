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
      className="flex flex-col items-center justify-center text-center"
      style={{ minHeight: '100vh', padding: '4rem 2rem' }}
    >
      <p
        style={{ color: 'var(--color-summary)' }}
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

export default function App() {
  const panelRef = useRef(null);

  // Mode: which scene is active ('traditional' or 'lcm')
  const [mode, setMode] = useState('traditional');

  // State blobs from each scene, passed through to SharedPanel
  const [tradState, setTradState] = useState(null);
  const [lcmState,  setLcmState]  = useState(null);

  // When TraditionalScene reports state, switch to traditional mode
  const handleTradState = useCallback((state) => {
    setMode('traditional');
    setTradState(state);
  }, []);

  // When CompactionScene reports state, switch to lcm mode
  const handleLcmState = useCallback((state) => {
    setMode('lcm');
    setLcmState(state);
  }, []);

  return (
    <main>
      <Hero />

      {/* Unified flex layout — single right panel spans both scenes */}
      <div className="relative flex" style={{ minHeight: '100vh' }}>

        {/* Left column: both scenes' narration stacked vertically */}
        <div className="flex flex-col" style={{ width: '45%' }}>
          <TraditionalScene
            onStateChange={handleTradState}
            panelRef={panelRef}
          />
          <CompactionScene
            onStateChange={handleLcmState}
            panelRef={panelRef}
          />
        </div>

        {/* Right column: persistent sticky panel */}
        <div style={{
          width: '55%',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}>
          <SharedPanel
            ref={panelRef}
            mode={mode}
            tradState={tradState}
            lcmState={lcmState}
          />
        </div>
      </div>

      <AgentationOverlay />
    </main>
  );
}
