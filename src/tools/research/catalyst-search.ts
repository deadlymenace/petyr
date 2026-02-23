import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage, ToolCall } from '@langchain/core/messages';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { getCurrentDate } from '../../agent/prompts.js';

/** Format snake_case tool name to Title Case for progress messages */
function formatSubToolName(name: string): string {
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Import catalyst-relevant tools directly
import { secFullTextSearch } from './sec-search.js';
import { getManagementChanges } from './management-tracker.js';
import { getInsiderTrades } from '../finance/insider_trades.js';

// All catalyst tools available for routing
const CATALYST_TOOLS: StructuredToolInterface[] = [
  secFullTextSearch,
  getManagementChanges,
  getInsiderTrades,
];

const CATALYST_TOOL_MAP = new Map(CATALYST_TOOLS.map(t => [t.name, t]));

function buildRouterPrompt(): string {
  return `You are a catalyst and event-driven analysis routing assistant.
Current date: ${getCurrentDate()}

Given a user's query about catalysts, events, or triggers for a stock, call the appropriate tool(s).

## Analysis Strategies

1. **Management Changes**: Track executive departures and appointments
   - get_management_changes: ticker → 8-K Item 5.02 filings for leadership changes

2. **Insider Trading Patterns**: Detect unusual insider activity
   - get_insider_trades: ticker → Form 4 filings showing insider buys/sells
   - Cluster buys = bullish signal, cluster sells = bearish signal

3. **Activist Investors**: Search for 13D/13G filings
   - sec_full_text_search: query="[COMPANY]" forms="SC 13D,SC 13G" → activist positions
   - 13D = activist intent (>5% stake + plans), 13G = passive (>5% stake, no intent)

4. **Material Events**: Search for recent 8-K filings
   - sec_full_text_search: query="[COMPANY]" forms="8-K" → material events
   - Includes M&A, restructuring, credit agreements, earnings

5. **Proxy Fights**: Search for DEF 14A filings
   - sec_full_text_search: query="[COMPANY]" forms="DEF 14A" → proxy statements

## Guidelines

- For executive changes → get_management_changes
- For insider buying/selling → get_insider_trades
- For activist positions → sec_full_text_search with 13D/13G forms
- For material events → sec_full_text_search with 8-K forms
- For comprehensive catalyst scan → combine multiple tools

Call the appropriate tool(s) now.`;
}

const CatalystSearchInputSchema = z.object({
  query: z.string().describe('Natural language query about catalysts, events, management changes, insider activity, or activist investors'),
});

/**
 * Create a catalyst_search tool configured with the specified model.
 * Uses native LLM tool calling for routing queries to management, insider, and SEC search tools.
 */
export function createCatalystSearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'catalyst_search',
    description: `Intelligent agentic search for catalysts and event-driven analysis. Takes a natural language query and automatically routes to management tracking, insider trades, and SEC filing tools. Use for:
- Management and executive changes (CEO/CFO departures, appointments)
- Insider trading patterns (cluster buys/sells, unusual activity)
- Activist investor positions (13D/13G filings)
- Material events (8-K filings: M&A, restructuring, earnings)
- Proxy fights and shareholder activism
- Event-driven investment signals`,
    schema: CatalystSearchInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      onProgress?.('Scanning for catalysts...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: CATALYST_TOOLS,
      });
      const aiMessage = response as AIMessage;

      const toolCalls = aiMessage.tool_calls as ToolCall[];
      if (!toolCalls || toolCalls.length === 0) {
        return formatToolResult({ error: 'No tools selected for query' }, []);
      }

      const toolNames = toolCalls.map(tc => formatSubToolName(tc.name));
      onProgress?.(`Fetching from ${toolNames.join(', ')}...`);
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          try {
            const tool = CATALYST_TOOL_MAP.get(tc.name);
            if (!tool) {
              throw new Error(`Tool '${tc.name}' not found`);
            }
            const rawResult = await tool.invoke(tc.args);
            const result = typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult);
            const parsed = JSON.parse(result);
            return {
              tool: tc.name,
              args: tc.args,
              data: parsed.data,
              sourceUrls: parsed.sourceUrls || [],
              error: null,
            };
          } catch (error) {
            return {
              tool: tc.name,
              args: tc.args,
              data: null,
              sourceUrls: [],
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      const successfulResults = results.filter((r) => r.error === null);
      const failedResults = results.filter((r) => r.error !== null);
      const allUrls = results.flatMap((r) => r.sourceUrls);

      const combinedData: Record<string, unknown> = {};
      for (const result of successfulResults) {
        const ticker = (result.args as Record<string, unknown>).ticker as string | undefined;
        const key = ticker ? `${result.tool}_${ticker}` : result.tool;
        combinedData[key] = result.data;
      }

      if (failedResults.length > 0) {
        combinedData._errors = failedResults.map((r) => ({
          tool: r.tool,
          args: r.args,
          error: r.error,
        }));
      }

      return formatToolResult(combinedData, allUrls);
    },
  });
}
