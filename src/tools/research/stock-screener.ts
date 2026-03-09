import { DynamicStructuredTool, StructuredToolInterface } from '@langchain/core/tools';
import { AIMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { callApi } from '../finance/api.js';

const StockScreenerInputSchema = z.object({
  query: z
    .string()
    .describe('Natural language screening query. Examples: "rank AAPL, MSFT, GOOGL by P/E ratio", "compare semiconductor stocks by revenue growth", "find highest dividend yield among AAPL, JNJ, PG, KO, XOM"'),
});

export function createStockScreener(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'stock_screener',
    description: `Compares and ranks multiple stocks across financial metrics. Fetches key ratios for each ticker in parallel and ranks by the specified metric. Use for:
- Comparing P/E, EV/EBITDA, ROE, or other metrics across a list of tickers
- Finding the best/worst stock in a group by a specific criterion
- Sector-level screening and ranking
- Multi-stock due diligence comparisons`,
    schema: StockScreenerInputSchema,
    func: async (input, _runManager, config?: RunnableConfig) => {
      const onProgress = config?.metadata?.onProgress as ((msg: string) => void) | undefined;

      // Use LLM to extract tickers and metric from the query
      const extractPrompt = `Extract the stock tickers and the metric to rank by from this query.

Query: "${input.query}"

Respond with a JSON object:
{
  "tickers": ["AAPL", "MSFT", ...],
  "metric": "pe_ratio",
  "sort_order": "asc" or "desc",
  "metric_display_name": "P/E Ratio"
}

Common metric mappings:
- P/E ratio → pe_ratio (lower is cheaper, sort asc)
- EV/EBITDA → enterprise_value_to_ebitda (lower is cheaper, sort asc)
- ROE → return_on_equity (higher is better, sort desc)
- Revenue growth → revenue_growth (higher is better, sort desc)
- Dividend yield → dividend_yield (higher is better, sort desc)
- Profit margin → net_profit_margin (higher is better, sort desc)
- Market cap → market_cap (sort desc)
- ROIC → return_on_invested_capital (higher is better, sort desc)
- Debt to equity → debt_to_equity (lower is better, sort asc)

If no specific metric mentioned, default to pe_ratio.
Respond with JSON only.`;

      const { response: extractResponse } = await callLlm(extractPrompt, {
        model,
        systemPrompt: 'Extract structured data from financial queries. Respond with JSON only.',
      });

      let params: { tickers: string[]; metric: string; sort_order: string; metric_display_name: string };
      try {
        const text = typeof extractResponse.content === 'string'
          ? extractResponse.content
          : JSON.stringify(extractResponse.content);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        params = jsonMatch ? JSON.parse(jsonMatch[0]) : { tickers: [], metric: 'pe_ratio', sort_order: 'asc', metric_display_name: 'P/E Ratio' };
      } catch {
        return formatToolResult({ error: 'Could not parse screening parameters from query' }, []);
      }

      if (!params.tickers?.length) {
        return formatToolResult({ error: 'No tickers found in query. Please specify tickers to compare.' }, []);
      }

      onProgress?.(`Screening ${params.tickers.length} stocks by ${params.metric_display_name}...`);

      // Fetch key ratios for each ticker in parallel
      const results = await Promise.all(
        params.tickers.map(async (ticker) => {
          try {
            const { data, url } = await callApi('/financial-metrics/', { ticker: ticker.toUpperCase(), period: 'ttm', limit: 1 });
            const metrics = (data.financial_metrics as Record<string, unknown>[] || [])[0] || {};
            return {
              ticker: ticker.toUpperCase(),
              value: metrics[params.metric] ?? null,
              market_cap: metrics.market_cap,
              pe_ratio: metrics.pe_ratio,
              revenue_growth: metrics.revenue_growth,
              error: null,
            };
          } catch (error) {
            return {
              ticker: ticker.toUpperCase(),
              value: null,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      // Sort by the requested metric
      const sortedResults = results
        .filter((r) => r.value !== null && r.value !== undefined)
        .sort((a, b) => {
          const aVal = Number(a.value);
          const bVal = Number(b.value);
          return params.sort_order === 'asc' ? aVal - bVal : bVal - aVal;
        });

      const failedTickers = results.filter((r) => r.error).map((r) => r.ticker);

      return formatToolResult({
        metric: params.metric_display_name,
        sort_order: params.sort_order,
        rankings: sortedResults.map((r, i) => ({ rank: i + 1, ticker: r.ticker, [params.metric]: r.value, market_cap: r.market_cap })),
        failed_tickers: failedTickers.length > 0 ? failedTickers : undefined,
      }, []);
    },
  });
}
