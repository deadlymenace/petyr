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

// Import macro tools directly (avoid circular deps with index.ts)
import { getEconomicSeries, getEconomicSnapshot } from './economic-indicators.js';

// All macro tools available for routing
const MACRO_TOOLS: StructuredToolInterface[] = [
  getEconomicSeries,
  getEconomicSnapshot,
];

// Create a map for quick tool lookup by name
const MACRO_TOOL_MAP = new Map(MACRO_TOOLS.map(t => [t.name, t]));

// Build the router system prompt
function buildRouterPrompt(): string {
  return `You are a macroeconomic data routing assistant.
Current date: ${getCurrentDate()}

Given a user's natural language query about economic data, call the appropriate FRED tool(s).

## Key FRED Series IDs

- **Interest Rates**: FEDFUNDS (fed funds rate), DGS10 (10-year Treasury yield), DGS2 (2-year Treasury yield), DGS30 (30-year Treasury)
- **Yield Curve**: T10Y2Y (10yr minus 2yr spread), T10Y3M (10yr minus 3mo spread)
- **Inflation**: CPIAUCSL (CPI all items), CPILFESL (core CPI), PCEPI (PCE price index), PCEPILFE (core PCE)
- **Employment**: UNRATE (unemployment rate), PAYEMS (nonfarm payrolls), ICSA (initial jobless claims)
- **GDP**: GDP (nominal GDP), GDPC1 (real GDP), A191RL1Q225SBEA (real GDP growth rate)
- **Sentiment**: UMCSENT (consumer sentiment), AAII (investor sentiment)
- **Volatility**: VIXCLS (VIX)
- **Housing**: MORTGAGE30US (30-year mortgage rate), CSUSHPINSA (Case-Shiller home price index)
- **Money Supply**: M2SL (M2 money supply), WALCL (Fed balance sheet)

## Guidelines

1. **Query Mapping**:
   - "interest rates" or "fed funds rate" → FEDFUNDS
   - "yield curve" → T10Y2Y (or fetch DGS10 and DGS2 separately)
   - "inflation" or "CPI" → CPIAUCSL
   - "unemployment" → UNRATE
   - "GDP" or "economic growth" → GDP or GDPC1
   - "recession risk" → use get_economic_snapshot with T10Y2Y, UNRATE, ICSA, UMCSENT
   - "market conditions" → use get_economic_snapshot with FEDFUNDS, DGS10, VIXCLS, CPIAUCSL, UNRATE

2. **Tool Selection**:
   - For historical trends or time series → get_economic_series
   - For current snapshot of multiple indicators → get_economic_snapshot
   - For detailed analysis → combine both tools

3. **Date Inference**: Convert relative dates to YYYY-MM-DD format

Call the appropriate tool(s) now.`;
}

// Input schema for the macro_search tool
const MacroSearchInputSchema = z.object({
  query: z.string().describe('Natural language query about economic or macroeconomic data'),
});

/**
 * Create a macro_search tool configured with the specified model.
 * Uses native LLM tool calling for routing queries to FRED economic data tools.
 */
export function createMacroSearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'macro_search',
    description: `Intelligent agentic search for macroeconomic data from FRED (Federal Reserve Economic Data). Takes a natural language query and automatically routes to appropriate economic data tools. Use for:
- Interest rates (fed funds rate, Treasury yields)
- Yield curve analysis (spread, inversions)
- Inflation data (CPI, PCE)
- Employment (unemployment rate, payrolls, jobless claims)
- GDP and economic growth
- Consumer sentiment
- Market volatility (VIX)
- Housing market data
- Money supply and Fed balance sheet`,
    schema: MacroSearchInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      // 1. Call LLM with macro tools bound (native tool calling)
      onProgress?.('Searching economic data...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: MACRO_TOOLS,
      });
      const aiMessage = response as AIMessage;

      // 2. Check for tool calls
      const toolCalls = aiMessage.tool_calls as ToolCall[];
      if (!toolCalls || toolCalls.length === 0) {
        return formatToolResult({ error: 'No tools selected for query' }, []);
      }

      // 3. Execute tool calls in parallel
      const toolNames = toolCalls.map(tc => formatSubToolName(tc.name));
      onProgress?.(`Fetching from ${toolNames.join(', ')}...`);
      const results = await Promise.all(
        toolCalls.map(async (tc) => {
          try {
            const tool = MACRO_TOOL_MAP.get(tc.name);
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

      // 4. Combine results
      const successfulResults = results.filter((r) => r.error === null);
      const failedResults = results.filter((r) => r.error !== null);

      const allUrls = results.flatMap((r) => r.sourceUrls);

      const combinedData: Record<string, unknown> = {};

      for (const result of successfulResults) {
        const seriesId = (result.args as Record<string, unknown>).series_id as string | undefined;
        const key = seriesId ? `${result.tool}_${seriesId}` : result.tool;
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
