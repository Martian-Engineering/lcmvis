/**
 * Simulated conversation data for the LCM incremental compaction visualization.
 */

export const TOTAL_BUDGET = 8000;
export const LEAF_CHUNK_TOKENS = 2000;
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

/** Leaf 1: Turns 1–4. Source tokens 2,485 → exceeds LEAF_CHUNK_TOKENS. */
export const LEAF_SUMMARY = {
  id: 'sum_leaf_01', kind: 'leaf', depth: 0,
  tokens: 320, timeRange: 'Turns 1 – 4', descendantCount: 8,
  snippet: 'OAuth2 setup: installed client, resolved CORS via redirect URI config, implemented token persistence with localStorage, debugged refresh token flow.',
  sourceIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
};

/** Leaf 2: Turns 5–8. Source tokens 2,430 → exceeds LEAF_CHUNK_TOKENS. */
export const LEAF_SUMMARY_2 = {
  id: 'sum_leaf_02', kind: 'leaf', depth: 0,
  tokens: 340, timeRange: 'Turns 5 – 8', descendantCount: 8,
  snippet: 'RBAC implementation: resource×action permissions matrix, middleware ordering fixed (auth→RBAC), tests passing. Audit logging added capturing actor, action, and timestamp.',
  sourceIds: ['m9', 'm10', 'm11', 'm12', 'm13', 'm14', 'm15', 'm16'],
};

/** Leaf 3: Turns 9–12 (fast-forward; no individual messages tracked in viz). */
export const LEAF_SUMMARY_3 = {
  id: 'sum_leaf_03', kind: 'leaf', depth: 0,
  tokens: 310, timeRange: 'Turns 9 – 12', descendantCount: 8,
  snippet: 'Rate limiting: token-bucket algorithm, burst handling at gateway. Input validation added across all API endpoints. Integration tests passing.',
  sourceIds: [],
};

/** Leaf 4: Turns 13–16 (fast-forward). */
export const LEAF_SUMMARY_4 = {
  id: 'sum_leaf_04', kind: 'leaf', depth: 0,
  tokens: 325, timeRange: 'Turns 13 – 16', descendantCount: 8,
  snippet: 'CI/CD pipeline configured, staging environment ready. N+1 query in auth middleware fixed with eager loading. System is production-ready.',
  sourceIds: [],
};

/** Depth-1 condensed summary — synthesizes all four leaf summaries. */
export const D1_SUMMARY = {
  id: 'sum_d1_01', kind: 'condensed', depth: 1,
  tokens: 580, timeRange: 'Turns 1 – 16', descendantCount: 32,
  snippet: 'Project arc: OAuth2 + RBAC auth built from scratch, audit logging and rate limiting added, all inputs validated, CI/CD pipeline configured. N+1 query resolved. System deployed to staging.',
  sourceIds: ['sum_leaf_01', 'sum_leaf_02', 'sum_leaf_03', 'sum_leaf_04'],
};

/**
 * Placeholder used during fast-forward mode to represent the current
 * fresh tail without tracking individual messages turn-by-turn.
 */
export const FRESH_TAIL_PLACEHOLDER = { id: 'fresh-placeholder', tokens: 480 };
