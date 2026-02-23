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

// Import research tools directly
import { secFullTextSearch } from './sec-search.js';
import { getSegmentedRevenues } from '../finance/segments.js';
import { getKeyRatios } from '../finance/key-ratios.js';

// All supply chain tools available for routing
const SUPPLY_CHAIN_TOOLS: StructuredToolInterface[] = [
  secFullTextSearch,
  getSegmentedRevenues,
  getKeyRatios,
];

const SUPPLY_CHAIN_TOOL_MAP = new Map(SUPPLY_CHAIN_TOOLS.map(t => [t.name, t]));

function buildRouterPrompt(): string {
  return `You are a supply chain and industry analysis routing assistant.
Current date: ${getCurrentDate()}

Given a user's query about supply chains, industry analysis, or competitive positioning, call the appropriate tool(s).

## Analysis Strategies

1. **Supplier/Customer Discovery**: Search 10-K filings for mentions of the target company
   - sec_full_text_search: query="[COMPANY NAME]" forms="10-K" → finds companies that mention this company
   - Look in Item 1 (Business) and Item 1A (Risk Factors) for supply chain disclosures

2. **Competitor Mapping**: Compare financial metrics across peers
   - get_key_ratios: Get metrics for each known competitor
   - get_segmented_revenues: Compare revenue mix and segments

3. **Industry Analysis**: Search for industry-specific terms
   - sec_full_text_search: query with industry keywords, forms="10-K"
   - Cross-reference with segmented revenues for market sizing

4. **Supply Chain Risk**: Search for disruption mentions
   - sec_full_text_search: query="supply chain" AND "[COMPANY]" forms="10-K,10-Q"

## Guidelines

- For discovering relationships → use sec_full_text_search on 10-K filings
- For comparing companies → use get_key_ratios for each competitor
- For revenue breakdown → use get_segmented_revenues
- Combine multiple tools for comprehensive analysis

Call the appropriate tool(s) now.`;
}

const SupplyChainSearchInputSchema = z.object({
  query: z.string().describe('Natural language query about supply chains, industry analysis, or competitive positioning'),
});

/**
 * Create a supply_chain_search tool configured with the specified model.
 * Uses native LLM tool calling for routing queries to SEC EDGAR and financial data tools.
 */
export function createSupplyChainSearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'supply_chain_search',
    description: `Intelligent agentic search for supply chain and industry analysis. Takes a natural language query and automatically routes to SEC EDGAR full-text search and financial data tools. Use for:
- Supplier and customer relationship mapping
- Competitor identification and comparison
- Industry structure and market positioning
- Revenue segment analysis
- Supply chain risk assessment
- Cross-company relationship discovery from SEC filings`,
    schema: SupplyChainSearchInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      onProgress?.('Analyzing supply chain...');
      const { response } = await callLlm(input.query, {
        model,
        systemPrompt: buildRouterPrompt(),
        tools: SUPPLY_CHAIN_TOOLS,
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
            const tool = SUPPLY_CHAIN_TOOL_MAP.get(tc.name);
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
        const query = (result.args as Record<string, unknown>).query as string | undefined;
        const key = ticker ? `${result.tool}_${ticker}` : query ? `${result.tool}_${query.slice(0, 30)}` : result.tool;
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
