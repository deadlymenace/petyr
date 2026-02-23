import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFredApi } from './api.js';
import { formatToolResult } from '../types.js';

const EconomicSeriesInputSchema = z.object({
  series_id: z
    .string()
    .describe(
      "The FRED series ID to fetch. Common series: FEDFUNDS (fed funds rate), DGS10 (10-year Treasury), DGS2 (2-year Treasury), T10Y2Y (yield curve spread), CPIAUCSL (CPI), UNRATE (unemployment rate), GDP (GDP), UMCSENT (consumer sentiment), VIXCLS (VIX)."
    ),
  start_date: z
    .string()
    .optional()
    .describe('Start date in YYYY-MM-DD format. Defaults to 1 year ago.'),
  end_date: z
    .string()
    .optional()
    .describe('End date in YYYY-MM-DD format. Defaults to today.'),
  frequency: z
    .enum(['d', 'w', 'bw', 'm', 'q', 'sa', 'a'])
    .optional()
    .describe("Data frequency: d=daily, w=weekly, bw=biweekly, m=monthly, q=quarterly, sa=semiannual, a=annual. Defaults to the series' native frequency."),
});

export const getEconomicSeries = new DynamicStructuredTool({
  name: 'get_economic_series',
  description: `Retrieves historical economic data from the FRED (Federal Reserve Economic Data) database. Use for macroeconomic analysis including interest rates, inflation, unemployment, GDP, yield curves, and consumer sentiment. Supports 800,000+ time series from the Federal Reserve Bank of St. Louis.`,
  schema: EconomicSeriesInputSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      series_id: input.series_id.toUpperCase(),
      observation_start: input.start_date,
      observation_end: input.end_date,
      frequency: input.frequency,
    };

    // Cache when end_date is in the past (historical data is immutable)
    let cacheable = false;
    if (input.end_date) {
      const endDate = new Date(input.end_date + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      cacheable = endDate < today;
    }

    const { data, url } = await callFredApi('/series/observations', params, { cacheable });
    return formatToolResult(data.observations || [], [url]);
  },
});

const EconomicSnapshotInputSchema = z.object({
  series_ids: z
    .array(z.string())
    .describe(
      "Array of FRED series IDs to fetch the latest values for. Example: ['FEDFUNDS', 'DGS10', 'DGS2', 'CPIAUCSL', 'UNRATE']"
    ),
});

export const getEconomicSnapshot = new DynamicStructuredTool({
  name: 'get_economic_snapshot',
  description: `Fetches the latest values for multiple economic indicators at once. Use for a quick overview of current macro conditions. Returns the most recent observation for each series.`,
  schema: EconomicSnapshotInputSchema,
  func: async (input) => {
    const results = await Promise.all(
      input.series_ids.map(async (seriesId) => {
        try {
          const params = {
            series_id: seriesId.toUpperCase(),
            sort_order: 'desc',
            limit: 1,
          };
          const { data, url } = await callFredApi('/series/observations', params);
          const observations = (data.observations as Array<Record<string, unknown>>) || [];
          return {
            series_id: seriesId.toUpperCase(),
            value: observations[0]?.value ?? null,
            date: observations[0]?.date ?? null,
            url,
            error: null,
          };
        } catch (error) {
          return {
            series_id: seriesId.toUpperCase(),
            value: null,
            date: null,
            url: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );

    const urls = results.map((r) => r.url).filter((u): u is string => u !== null);
    return formatToolResult(results, urls);
  },
});
