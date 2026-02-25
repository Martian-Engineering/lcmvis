/**
 * Simulated conversation data for the LCM incremental compaction visualization.
 */

export const TOTAL_BUDGET = 8000;
export const CHUNK_TOKENS = 2000;
export const FRESH_TAIL_COUNT = 4;
export const CONDENSED_MIN_FANOUT = 4;

export const MESSAGES = [
  { id: 'm1',  role: 'user',      tokens: 180, label: 'Turn 1',  snippet: 'Can you help me set up the OAuth2 flow?' },
  { id: 'm2',  role: 'assistant', tokens: 420, label: 'Turn 1',  snippet: 'Sure! First, install the oauth2-client package…' },
  { id: 'm3',  role: 'user',      tokens:  95, label: 'Turn 2',  snippet: 'Getting a CORS error on the token endpoint.' },
  { id: 'm4',  role: 'assistant', tokens: 510, label: 'Turn 2',  snippet: 'That CORS error usually means the redirect URI…' },
  { id: 'm5',  role: 'user',      tokens: 130, label: 'Turn 3',  snippet: 'Now I need to persist the token to localStorage.' },
  { id: 'm6',  role: 'assistant', tokens: 480, label: 'Turn 3',  snippet: 'Here\'s a pattern for safe token storage…' },
  { id: 'm7',  role: 'user',      tokens: 110, label: 'Turn 4',  snippet: 'The refresh token logic isn\'t working.' },
  { id: 'm8',  role: 'assistant', tokens: 560, label: 'Turn 4',  snippet: 'Let\'s trace through the refresh flow step by step…' },
  { id: 'm9',  role: 'user',      tokens: 145, label: 'Turn 5',  snippet: 'Can we add role-based access control next?' },
  { id: 'm10', role: 'assistant', tokens: 490, label: 'Turn 5',  snippet: 'RBAC can be layered on top of your OAuth2 setup…' },
  { id: 'm11', role: 'user',      tokens: 120, label: 'Turn 6',  snippet: 'How should I structure the permissions matrix?' },
  { id: 'm12', role: 'assistant', tokens: 530, label: 'Turn 6',  snippet: 'A resource × action matrix works well here…' },
  { id: 'm13', role: 'user',      tokens: 100, label: 'Turn 7',  snippet: 'Tests are failing after the RBAC middleware.' },
  { id: 'm14', role: 'assistant', tokens: 440, label: 'Turn 7',  snippet: 'The middleware ordering matters — auth before RBAC…' },
  { id: 'm15', role: 'user',      tokens: 135, label: 'Turn 8',  snippet: 'All green! Now let\'s add audit logging.' },
  { id: 'm16', role: 'assistant', tokens: 470, label: 'Turn 8',  snippet: 'Audit logs should capture who, what, and when…' },
  { id: 'm17', role: 'user',      tokens: 115, label: 'Turn 9',  snippet: 'Can we add rate limiting to the API endpoints?' },
  { id: 'm18', role: 'assistant', tokens: 455, label: 'Turn 9',  snippet: 'Rate limiting is best applied at the gateway layer…' },
  { id: 'm19', role: 'user',      tokens: 130, label: 'Turn 10', snippet: 'How do we handle burst traffic gracefully?' },
  { id: 'm20', role: 'assistant', tokens: 480, label: 'Turn 10', snippet: 'A token-bucket algorithm handles bursts well…' },
];

/** Summary 1: Turns 1–4. Source tokens 2,485 → exceeds CHUNK_TOKENS. */
export const SUMMARY_1 = {
  id: 'sum_01', kind: 'summary', depth: 0,
  tokens: 320, timeRange: 'Turns 1 – 4', descendantCount: 8,
  snippet: 'OAuth2 setup: installed client, resolved CORS via redirect URI config, implemented token persistence with localStorage, debugged refresh token flow.',
  sourceIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
};

/** Summary 2: Turns 5–8. Source tokens 2,430 → exceeds CHUNK_TOKENS. */
export const SUMMARY_2 = {
  id: 'sum_02', kind: 'summary', depth: 0,
  tokens: 340, timeRange: 'Turns 5 – 8', descendantCount: 8,
  snippet: 'RBAC implementation: resource×action permissions matrix, middleware ordering fixed (auth→RBAC), tests passing. Audit logging added capturing actor, action, and timestamp.',
  sourceIds: ['m9', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16'],
};

/** Summary 3: Turns 9–12 (fast-forward; no individual messages tracked in viz). */
export const SUMMARY_3 = {
  id: 'sum_03', kind: 'summary', depth: 0,
  tokens: 310, timeRange: 'Turns 9 – 12', descendantCount: 8,
  snippet: 'Rate limiting: token-bucket algorithm, burst handling at gateway. Input validation added across all API endpoints. Integration tests passing.',
  sourceIds: [],
};

/** Summary 4: Turns 13–16 (fast-forward). */
export const SUMMARY_4 = {
  id: 'sum_04', kind: 'summary', depth: 0,
  tokens: 325, timeRange: 'Turns 13 – 16', descendantCount: 8,
  snippet: 'CI/CD pipeline configured, staging environment ready. N+1 query in auth middleware fixed with eager loading. System is production-ready.',
  sourceIds: [],
};

/** Depth-1 condensed summary — synthesizes all four depth-0 summaries. */
export const D1_SUMMARY = {
  id: 'sum_d1_01', kind: 'condensed', depth: 1,
  tokens: 580, timeRange: 'Turns 1 – 16', descendantCount: 32,
  snippet: 'Project arc: OAuth2 + RBAC auth built from scratch, audit logging and rate limiting added, all inputs validated, CI/CD pipeline configured. N+1 query resolved. System deployed to staging.',
  sourceIds: ['sum_01', 'sum_02', 'sum_03', 'sum_04'],
};

// ── Extended conversation (Turns 17–64) ─────────────────────────────────────
// Used by the Assembler and Full Lifecycle sections.
// Individual messages are not tracked for these turns; only summaries.

/** Summaries 5–8: Turns 17–32 — deployment infrastructure phase. */
export const SUMMARY_5 = {
  id: 'sum_05', kind: 'summary', depth: 0,
  tokens: 305, timeRange: 'Turns 17 – 20', descendantCount: 8,
  snippet: 'Docker containerization: multi-stage builds, non-root user, health checks. docker-compose for local dev with hot reload.',
  sourceIds: [],
};
export const SUMMARY_6 = {
  id: 'sum_06', kind: 'summary', depth: 0,
  tokens: 330, timeRange: 'Turns 21 – 24', descendantCount: 8,
  snippet: 'Kubernetes deployment: Deployment + Service + Ingress manifests, HPA configured, rolling update strategy. Secrets managed via sealed-secrets.',
  sourceIds: [],
};
export const SUMMARY_7 = {
  id: 'sum_07', kind: 'summary', depth: 0,
  tokens: 315, timeRange: 'Turns 25 – 28', descendantCount: 8,
  snippet: 'Observability: Prometheus metrics endpoint, Grafana dashboards for latency/error rate/saturation. PagerDuty alert rules configured.',
  sourceIds: [],
};
export const SUMMARY_8 = {
  id: 'sum_08', kind: 'summary', depth: 0,
  tokens: 300, timeRange: 'Turns 29 – 32', descendantCount: 8,
  snippet: 'Performance profiling: p99 latency reduced 40% via query index and connection pool tuning. Flame graph identified N+1 in notification fanout.',
  sourceIds: [],
};

/** D1 summary 2: Turns 17–32 — deployment and infrastructure. */
export const D1_SUMMARY_2 = {
  id: 'sum_d1_02', kind: 'condensed', depth: 1,
  tokens: 545, timeRange: 'Turns 17 – 32', descendantCount: 32,
  snippet: 'Infrastructure phase: containerized with Docker, deployed to Kubernetes with HPA. Full observability stack (Prometheus + Grafana). p99 latency reduced 40%.',
  sourceIds: ['sum_05', 'sum_06', 'sum_07', 'sum_08'],
};

/** Summaries 9–12: Turns 33–48 — feature development phase. */
export const SUMMARY_9 = {
  id: 'sum_09', kind: 'summary', depth: 0,
  tokens: 320, timeRange: 'Turns 33 – 36', descendantCount: 8,
  snippet: 'User management UI: invite flow, role assignment, team hierarchy. Bulk operations with optimistic updates. WCAG AA accessibility audit passing.',
  sourceIds: [],
};
export const SUMMARY_10 = {
  id: 'sum_10', kind: 'summary', depth: 0,
  tokens: 340, timeRange: 'Turns 37 – 40', descendantCount: 8,
  snippet: 'Real-time notifications: WebSocket server, presence tracking, per-user channels. Reconnect logic with exponential backoff. Redis pub/sub backend.',
  sourceIds: [],
};
export const SUMMARY_11 = {
  id: 'sum_11', kind: 'summary', depth: 0,
  tokens: 295, timeRange: 'Turns 41 – 44', descendantCount: 8,
  snippet: 'Data export: CSV/JSON/XLSX via background jobs, signed S3 URLs, email delivery. Export history page with re-download links.',
  sourceIds: [],
};
export const SUMMARY_12 = {
  id: 'sum_12', kind: 'summary', depth: 0,
  tokens: 310, timeRange: 'Turns 45 – 48', descendantCount: 8,
  snippet: 'Admin dashboard: usage analytics, feature flags, impersonation mode. Audit log viewer with full-text search. Role-gated behind SUPERADMIN.',
  sourceIds: [],
};

/** D1 summary 3: Turns 33–48 — feature development. */
export const D1_SUMMARY_3 = {
  id: 'sum_d1_03', kind: 'condensed', depth: 1,
  tokens: 560, timeRange: 'Turns 33 – 48', descendantCount: 32,
  snippet: 'Feature phase: user management UI, real-time notifications (WebSocket + Redis), data export pipeline, admin dashboard with audit log and feature flags.',
  sourceIds: ['sum_09', 'sum_10', 'sum_11', 'sum_12'],
};

/** Summaries 13–16: Turns 49–64 — scaling and hardening phase. */
export const SUMMARY_13 = {
  id: 'sum_13', kind: 'summary', depth: 0,
  tokens: 285, timeRange: 'Turns 49 – 52', descendantCount: 8,
  snippet: 'Database optimization: partial indexes, BRIN index on event log, materialized views for analytics queries. Slow query log baseline established.',
  sourceIds: [],
};
export const SUMMARY_14 = {
  id: 'sum_14', kind: 'summary', depth: 0,
  tokens: 300, timeRange: 'Turns 53 – 56', descendantCount: 8,
  snippet: 'CDN and caching: CloudFront for static assets, stale-while-revalidate for API responses. Redis cache layer for user session and permission lookups.',
  sourceIds: [],
};
export const SUMMARY_15 = {
  id: 'sum_15', kind: 'summary', depth: 0,
  tokens: 315, timeRange: 'Turns 57 – 60', descendantCount: 8,
  snippet: 'Security hardening: penetration test findings resolved (IDOR, missing rate limit on password reset). CSP headers, HSTS preload, dependency audit clean.',
  sourceIds: [],
};
export const SUMMARY_16 = {
  id: 'sum_16', kind: 'summary', depth: 0,
  tokens: 290, timeRange: 'Turns 61 – 64', descendantCount: 8,
  snippet: 'Load testing: 10k concurrent users sustained at p99 < 200ms. Horizontal pod autoscaling validated. Runbook and on-call rotation documented.',
  sourceIds: [],
};

/** D1 summary 4: Turns 49–64 — scaling and hardening. */
export const D1_SUMMARY_4 = {
  id: 'sum_d1_04', kind: 'condensed', depth: 1,
  tokens: 530, timeRange: 'Turns 49 – 64', descendantCount: 32,
  snippet: 'Scaling phase: DB indexes and materialized views, CDN + Redis caching, security audit clean. Load tested to 10k concurrent users at p99 < 200ms.',
  sourceIds: ['sum_13', 'sum_14', 'sum_15', 'sum_16'],
};

/** Depth-2 condensed summary — synthesizes all four D1 summaries. */
export const D2_SUMMARY = {
  id: 'sum_d2_01', kind: 'condensed', depth: 2,
  tokens: 840, timeRange: 'Turns 1 – 64', descendantCount: 128,
  snippet: 'Full project arc (64 turns): auth system (OAuth2 + RBAC), containerized and deployed to Kubernetes, observability and performance tuning, full feature set shipped, security hardened and load tested to production scale.',
  sourceIds: ['sum_d1_01', 'sum_d1_02', 'sum_d1_03', 'sum_d1_04'],
};

/**
 * Placeholder used during fast-forward mode to represent the current
 * fresh tail without tracking individual messages turn-by-turn.
 */
export const FRESH_TAIL_PLACEHOLDER = { id: 'fresh-placeholder', tokens: 480 };
