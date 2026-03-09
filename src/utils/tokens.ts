/**
 * Token estimation utilities for context management.
 * Used to prevent exceeding LLM context window limits.
 */

/**
 * Rough token estimation based on character count.
 * JSON is denser than prose, so we use ~3.5 chars per token.
 * This is conservative - better to underestimate available space.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
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
