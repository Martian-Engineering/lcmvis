/**
 * LargeFilePanel — large file ingestion and retrieval visualization.
 *
 * Props:
 *   phase — 0..3
 *     0: file arrives  — user message with large log file block
 *     1: detection     — threshold exceeded, extraction in progress
 *     2: stub shown    — file replaced by compact reference in-message
 *     3: retrieval     — lcm_describe shows metadata + exploration summary
 */

const LOG_LINES = [
  { level: 'INFO',  time: '14:23:01', text: 'oauth2: token refresh request  user=alice' },
  { level: 'INFO',  time: '14:23:01', text: 'rbac: permission check  user=alice  resource=api/admin' },
  { level: 'ERROR', time: '14:23:02', text: 'db: connection timeout  pool=auth-db  attempt=1/3' },
  { level: 'ERROR', time: '14:23:05', text: 'db: connection timeout  pool=auth-db  attempt=2/3' },
  { level: 'ERROR', time: '14:23:08', text: 'db: connection timeout  pool=auth-db  attempt=3/3' },
  { level: 'WARN',  time: '14:23:08', text: 'oauth2: token refresh failed  reason=db_unavailable' },
  { level: 'INFO',  time: '14:23:09', text: 'oauth2: fallback to cached token  ttl=847s' },
];

const LEVEL_COLOR = {
  INFO:  'var(--color-muted)',
  WARN:  'var(--color-summary)',
  ERROR: 'var(--color-budget-over)',
};

const FILE_ID     = 'file_a1b2c3';
const FILE_NAME   = 'auth-service.log';
const FILE_TOKENS = 28500;
const STUB_TOKENS = 200;
const THRESHOLD   = 25000;

const EXPLORATION = 'Auth service log (2026-02-24). 847 entries: 12 WARN (token expiry, rate limit), 3 ERROR (DB connection timeouts at 14:23, 14:31, 14:38). Main activity: OAuth2 token refresh, RBAC permission checks.';

export default function LargeFilePanel({ phase }) {
  const showDetection = phase >= 1;
  const showStub      = phase >= 2;
  const showDescribe  = phase >= 3;

  return (
    <div
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      className="rounded-xl p-3 flex flex-col gap-2.5 h-full overflow-hidden"
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          style={{ color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}
          className="rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-widest shrink-0"
        >
          FILE INGESTION
        </span>
        <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">
          large file handling
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0">

        {/* ── Detection banner ─────────────────────────────────────────────── */}
        <div style={{
          background: 'rgba(240,136,62,0.1)',
          border: '1px solid var(--color-summary)',
          color: 'var(--color-summary)',
          maxHeight: showDetection ? '72px' : 0,
          overflow: 'hidden',
          opacity: showDetection ? 1 : 0,
          transition: 'max-height 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
        }} className="rounded px-2.5 py-2 text-[9px] font-mono shrink-0">
          ⚡ {FILE_TOKENS.toLocaleString()} tok exceeds threshold ({THRESHOLD.toLocaleString()} tok)
          <div style={{
            color: showStub ? 'var(--color-fresh)' : 'var(--color-muted)',
            marginTop: 3,
            transition: 'color 0.3s ease',
          }}>
            {showStub
              ? `✓ Stored · ${FILE_NAME} → ${FILE_ID}`
              : 'Extracting to external storage…'}
          </div>
        </div>

        {/* ── User message card ─────────────────────────────────────────────── */}
        <div
          style={{
            background: 'rgba(56,139,253,0.06)',
            border: '1px solid rgba(56,139,253,0.2)',
            borderLeft: '2px solid var(--color-user)',
          }}
          className="rounded px-2.5 py-2 flex flex-col gap-1.5 shrink-0"
        >
          {/* Role + message text */}
          <div className="flex items-start gap-1.5">
            <span
              style={{ color: 'var(--color-user)', borderColor: 'var(--color-user)' }}
              className="rounded border px-1 py-0 text-[8px] font-bold shrink-0 mt-px"
            >
              USER
            </span>
            <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono leading-relaxed">
              Here are the service logs from last night. Can you help debug the auth failures?
            </span>
          </div>

          {/* File block — collapses when stub appears */}
          <div style={{
            maxHeight: showStub ? 0 : '170px',
            overflow: 'hidden',
            opacity: showStub ? 0 : 1,
            transition: 'max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
          }}>
            <div
              style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 4, marginTop: 2 }}
              className="px-2 py-1.5 flex flex-col gap-0.5"
            >
              {/* File name + token count */}
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: 'var(--color-text)' }} className="text-[8px] font-mono font-semibold">
                  {FILE_NAME}
                </span>
                <span
                  style={{ color: 'var(--color-budget-over)', borderColor: 'var(--color-budget-over)' }}
                  className="rounded border px-1 py-0 text-[8px] font-bold"
                >
                  {FILE_TOKENS.toLocaleString()} tok
                </span>
              </div>
              {/* Log lines */}
              {LOG_LINES.map((line, i) => (
                <div key={i} className="flex gap-1.5 items-baseline">
                  <span style={{ color: 'var(--color-border)' }} className="text-[7px] font-mono shrink-0">
                    {line.time}
                  </span>
                  <span
                    style={{ color: LEVEL_COLOR[line.level] }}
                    className="text-[7px] font-mono font-bold shrink-0 w-8"
                  >
                    {line.level}
                  </span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[7px] font-mono leading-snug">
                    {line.text}
                  </span>
                </div>
              ))}
              <div style={{ color: 'var(--color-border)' }} className="text-[7px] font-mono mt-0.5">
                … 840 more lines
              </div>
            </div>
          </div>

          {/* Stub reference — slides in after extraction */}
          <div style={{
            maxHeight: showStub ? '80px' : 0,
            overflow: 'hidden',
            opacity: showStub ? 1 : 0,
            transition: 'max-height 0.4s cubic-bezier(0.16,1,0.3,1) 0.1s, opacity 0.3s ease 0.15s',
          }}>
            <div
              style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 4, marginTop: 4 }}
              className="px-2 py-1.5 flex flex-col gap-0.5"
            >
              <span style={{ color: 'var(--color-fresh)' }} className="text-[8px] font-mono">
                [LCM File: {FILE_ID} | {FILE_NAME} | text/plain | 114,000 bytes]
              </span>
              <span style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono mt-0.5">
                Exploration Summary:
              </span>
              <span style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono leading-relaxed line-clamp-2">
                {EXPLORATION}
              </span>
            </div>
          </div>
        </div>

        {/* ── Storage path (phase 2+) ──────────────────────────────────────────── */}
        <div style={{
          opacity: showStub ? 1 : 0,
          maxHeight: showStub ? '24px' : 0,
          overflow: 'hidden',
          transition: 'opacity 0.3s ease 0.25s, max-height 0.3s cubic-bezier(0.16,1,0.3,1) 0.25s',
          color: 'var(--color-border)',
        }} className="text-[8px] font-mono shrink-0">
          ~/.openclaw/lcm-files/conv_xyz/{FILE_ID}.log
        </div>

        {/* ── Filesystem retrieval (phase 3) ───────────────────────────────── */}
        {showDescribe && (
          <>
            <div style={{ color: 'var(--color-muted)' }} className="text-[8px] font-mono tracking-widest shrink-0">
              RETRIEVE
            </div>

            {/* Read tool call */}
            <div
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--color-border)' }}
              className="rounded px-2 py-1.5 shrink-0"
            >
              <span style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono">{'> '}</span>
              <span style={{ color: 'var(--color-text)', whiteSpace: 'pre-wrap' }} className="text-[9px] font-mono">
                {'Read("~/.openclaw/lcm-files/conv_xyz/'}{FILE_ID}{'.log")'}
              </span>
            </div>

            <div style={{ color: 'var(--color-muted)' }} className="text-[9px] font-mono shrink-0">
              ✓ 847 lines · {FILE_TOKENS.toLocaleString()} tok
            </div>

            {/* File content card */}
            <div
              style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(86,211,100,0.25)',
                borderLeft: '2px solid var(--color-fresh)',
              }}
              className="rounded px-2.5 py-2 flex flex-col gap-0.5 shrink-0"
            >
              {LOG_LINES.map((line, i) => (
                <div key={i} className="flex gap-1.5 items-baseline">
                  <span style={{ color: 'var(--color-border)' }} className="text-[7px] font-mono shrink-0">
                    {line.time}
                  </span>
                  <span
                    style={{ color: LEVEL_COLOR[line.level] }}
                    className="text-[7px] font-mono font-bold shrink-0 w-8"
                  >
                    {line.level}
                  </span>
                  <span style={{ color: 'var(--color-muted)' }} className="text-[7px] font-mono leading-snug">
                    {line.text}
                  </span>
                </div>
              ))}
              <div style={{ color: 'var(--color-border)' }} className="text-[7px] font-mono mt-0.5">
                … 840 more lines
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
