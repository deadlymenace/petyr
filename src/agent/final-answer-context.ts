import { type ToolContext, Scratchpad } from './scratchpad.js';
import { getToolDescription } from '../utils/tool-description.js';

/**
 * Build context data for final answer generation from scratchpad.
 * Uses only active (non-cleared) tool results to respect context clearing
 * and avoid re-expanding results that were already dropped during iteration.
 */
export function buildFinalAnswerContext(scratchpad: Scratchpad): string {
  const contexts = scratchpad.getActiveToolResults();

  if (contexts.length === 0) {
    return 'No data was gathered.';
  }

  const validContexts = contexts.filter((ctx) => !ctx.result.startsWith('Error:'));
  if (validContexts.length === 0) {
    return 'No data was successfully gathered.';
  }

  return validContexts.map((ctx) => formatToolContext(ctx)).join('\n\n');
}

function formatToolContext(ctx: ToolContext): string {
  const description = getToolDescription(ctx.toolName, ctx.args);
  // Compact format — no pretty-print to save tokens
  return `### ${description}\n${ctx.result}`;
}
