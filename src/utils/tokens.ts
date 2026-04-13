/**
 * Token estimation utilities for context management.
 * Used to prevent exceeding LLM context window limits.
 */

/**
 * Rough token estimation based on character count.
 * Uses ~4 chars per token as a standard heuristic for mixed content.
 * This is conservative - better to overestimate token usage to avoid context overflow.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Maximum token budget for context data in final answer generation.
 * Conservative limit that leaves room for system prompt, query, and response.
 */
export const TOKEN_BUDGET = 150_000;

// ============================================================================
// Anthropic-style Context Management Constants
// ============================================================================

/**
 * Token threshold at which context clearing is triggered.
 * Matches Anthropic's default of 100k tokens.
 * When estimated context exceeds this, oldest tool results are cleared.
 */
export const CONTEXT_THRESHOLD = 100_000;

/**
 * Number of most recent tool results to keep when clearing.
 * Anthropic's default is 3, but we use 5 for slightly more context.
 */
export const KEEP_TOOL_USES = 5;

/**
 * Maximum character length for a single tool result before truncation.
 * 12,000 chars ≈ 3,400 tokens. Prevents oversized API responses
 * (web_fetch, browser snapshots) from dominating context across iterations.
 */
export const MAX_TOOL_RESULT_CHARS = 12_000;
