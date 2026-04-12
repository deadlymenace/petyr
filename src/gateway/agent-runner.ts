import { Agent } from '../agent/agent.js';
import { InMemoryChatHistory } from '../utils/in-memory-chat-history.js';
import type { AgentEvent } from '../agent/types.js';

// ---------------------------------------------------------------------------
// Session eviction — TTL-based cleanup of idle sessions
// ---------------------------------------------------------------------------
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes idle
const MAX_SESSIONS = 100;

type SessionState = {
  history: InMemoryChatHistory;
  tail: Promise<void>;
  lastActivity: number;
};

const sessions = new Map<string, SessionState>();

/** Evict sessions that are idle beyond TTL or exceed the max session count. */
function evictStaleSessions(): void {
  const now = Date.now();

  // First pass: remove expired sessions
  for (const [key, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }

  // Second pass: if still over capacity, evict oldest (LRU)
  if (sessions.size > MAX_SESSIONS) {
    const sorted = [...sessions.entries()].sort((a, b) => a[1].lastActivity - b[1].lastActivity);
    const toEvict = sorted.slice(0, sessions.size - MAX_SESSIONS);
    for (const [key] of toEvict) {
      sessions.delete(key);
    }
  }
}

function getSession(sessionKey: string, model: string): SessionState {
  // Lightweight eviction check on every access
  evictStaleSessions();

  const existing = sessions.get(sessionKey);
  if (existing) {
    existing.lastActivity = Date.now();
    return existing;
  }
  const created: SessionState = {
    history: new InMemoryChatHistory(model),
    tail: Promise.resolve(),
    lastActivity: Date.now(),
  };
  sessions.set(sessionKey, created);
  return created;
}

export type AgentRunRequest = {
  sessionKey: string;
  query: string;
  model: string;
  modelProvider: string;
  maxIterations?: number;
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void | Promise<void>;
  fileContext?: string;
};

export async function runAgentForMessage(req: AgentRunRequest): Promise<string> {
  const session = getSession(req.sessionKey, req.model);
  let finalAnswer = '';

  const run = async () => {
    const fullQuery = req.fileContext
      ? `${req.fileContext}\n\n---\n\nUser query: ${req.query}`
      : req.query;
    session.history.saveUserQuery(fullQuery);
    const agent = Agent.create({
      model: req.model,
      modelProvider: req.modelProvider,
      maxIterations: req.maxIterations ?? 6,
      signal: req.signal,
    });
    for await (const event of agent.run(fullQuery, session.history)) {
      await req.onEvent?.(event);
      if (event.type === 'done') {
        finalAnswer = event.answer;
      }
    }
    if (finalAnswer) {
      await session.history.saveAnswer(finalAnswer);
    }
  };

  // Serialize per-session turns while allowing cross-session concurrency.
  session.tail = session.tail.then(run, run);
  await session.tail;
  return finalAnswer;
}

