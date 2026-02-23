import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callApi } from './api.js';
import { formatToolResult } from '../types.js';

const StockPricesInputSchema = z.object({
  ticker: z
    .string()
    .describe("The stock ticker symbol to fetch price data for. For example, 'AAPL' for Apple."),
  interval: z
    .enum(['minute', 'day', 'week', 'month', 'year'])
    .default('day')
    .describe("The time interval for price data. Defaults to 'day'."),
  interval_multiplier: z
    .number()
    .default(1)
    .describe('Multiplier for the interval. Defaults to 1.'),
  start_date: z.string().describe('Start date in YYYY-MM-DD format. Required.'),
  end_date: z.string().describe('End date in YYYY-MM-DD format. Required.'),
});

export const getStockPrices = new DynamicStructuredTool({
  name: 'get_stock_prices',
  description: `Retrieves historical OHLCV (open, high, low, close, volume) price data for a stock over a specified date range. Use for technical analysis, moving averages, beta calculation, and price trend analysis.`,
  schema: StockPricesInputSchema,
  func: async (input) => {
    const params = {
      ticker: input.ticker.toUpperCase(),
      interval: input.interval,
      interval_multiplier: input.interval_multiplier,
      start_date: input.start_date,
      end_date: input.end_date,
    };
    // Cache when the date window is fully closed (OHLCV data is final)
    const endDate = new Date(input.end_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data, url } = await callApi('/prices/', params, { cacheable: endDate < today });
    return formatToolResult(data.prices || [], [url]);
  },
});

const PriceSnapshotInputSchema = z.object({
  ticker: z
    .string()
    .describe("The stock ticker symbol to fetch the latest price for. For example, 'AAPL' for Apple."),
});

export const getPriceSnapshot = new DynamicStructuredTool({
  name: 'get_price_snapshot',
  description: `Fetches the most recent price snapshot for a stock, including the latest price, volume, and OHLC data. Use for current price checks and day change analysis.`,
  schema: PriceSnapshotInputSchema,
  func: async (input) => {
    const params = { ticker: input.ticker.toUpperCase() };
    const { data, url } = await callApi('/prices/snapshot/', params);
    return formatToolResult(data.snapshot || {}, [url]);
  },
});
