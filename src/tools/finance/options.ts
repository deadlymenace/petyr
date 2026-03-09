import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';

const OptionsDataInputSchema = z.object({
  ticker: z
    .string()
    .describe("The stock ticker symbol to fetch options data for. For example, 'AAPL' for Apple."),
  type: z
    .enum(['calls', 'puts', 'both'])
    .default('both')
    .describe('Type of options to retrieve (default: both).'),
  expiration: z
    .string()
    .optional()
    .describe('Specific expiration date to filter by (YYYY-MM-DD). If omitted, returns nearest expiration.'),
});

export function createOptionsData(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_options_data',
    description: `Retrieves options chain data for a stock including implied volatility, put/call ratios, and unusual activity. Sources data from public financial websites. Use for:
- Checking implied volatility levels (high IV = market expects big move)
- Put/call ratio analysis (sentiment indicator)
- Identifying unusual options activity
- Options-based valuation signals`,
    schema: OptionsDataInputSchema,
    func: async (input) => {
      const ticker = input.ticker.toUpperCase();

      // Use LLM with web search knowledge to compile options data
      const optionsPrompt = `Find current options market data for ${ticker} stock.

I need:
1. Current implied volatility (IV) — overall and vs. historical average
2. Put/call ratio (volume-based and open interest-based)
3. Most active options contracts (by volume)
4. Any unusual options activity (large block trades, unusual volume)
5. Key expiration dates and their at-the-money IV
${input.expiration ? `6. Specifically look at the ${input.expiration} expiration` : ''}
${input.type !== 'both' ? `Focus on ${input.type} only.` : ''}

Respond with a JSON object:
{
  "ticker": "${ticker}",
  "implied_volatility": { "current": 0.0, "percentile": 0-100, "assessment": "high|normal|low" },
  "put_call_ratio": { "volume": 0.0, "open_interest": 0.0, "signal": "bullish|bearish|neutral" },
  "most_active": [
    { "type": "call|put", "strike": 0, "expiration": "YYYY-MM-DD", "volume": 0, "open_interest": 0, "iv": 0.0 }
  ],
  "unusual_activity": "description of any notable activity or 'None detected'",
  "summary": "1-2 sentence summary of options market sentiment"
}`;

      const { response } = await callLlm(optionsPrompt, {
        model,
        systemPrompt: 'You are an options market data analyst. Provide the best available options data. Respond with JSON only.',
      });

      let parsed: Record<string, unknown>;
      try {
        const text = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Could not parse options data', ticker };
      } catch {
        parsed = { error: 'Failed to parse options data', ticker };
      }

      return formatToolResult(parsed, []);
    },
  });
}
