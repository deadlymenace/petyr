import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../types.js';
import { logger } from '../../utils/logger.js';

const SEC_EFTS_BASE_URL = 'https://efts.sec.gov/LATEST/search-index';

const ManagementChangesInputSchema = z.object({
  ticker: z
    .string()
    .describe("The stock ticker symbol or company name to search for management changes. For example, 'AAPL' or 'Apple'."),
  start_date: z
    .string()
    .optional()
    .describe('Start date in YYYY-MM-DD format. Defaults to 1 year ago.'),
  end_date: z
    .string()
    .optional()
    .describe('End date in YYYY-MM-DD format. Defaults to today.'),
});

export const getManagementChanges = new DynamicStructuredTool({
  name: 'get_management_changes',
  description: `Searches SEC EDGAR for management and executive changes at a company. Specifically targets 8-K Item 5.02 filings (Departure/Appointment of Directors or Officers). Use for:
- Detecting CEO/CFO/CTO changes
- Tracking board of directors turnover
- Identifying executive departures and new appointments
- Monitoring leadership stability`,
  schema: ManagementChangesInputSchema,
  func: async (input) => {
    const now = new Date();
    const startDate = input.start_date || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const endDate = input.end_date || now.toISOString().split('T')[0];

    // Search for 8-K filings mentioning Item 5.02 (executive changes)
    const url = new URL(SEC_EFTS_BASE_URL);
    url.searchParams.append('q', `"Item 5.02" "${input.ticker}"`);
    url.searchParams.append('forms', '8-K');
    url.searchParams.append('dateRange', 'custom');
    url.searchParams.append('startdt', startDate);
    url.searchParams.append('enddt', endDate);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Dexter Financial Research Tool research@dexter.ai',
          'Accept': 'application/json',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[SEC EDGAR] network error: ${message}`);
      throw new Error(`[SEC EDGAR] request failed: ${message}`);
    }

    if (!response.ok) {
      const detail = `${response.status} ${response.statusText}`;
      logger.error(`[SEC EDGAR] error: ${detail}`);
      throw new Error(`[SEC EDGAR] request failed: ${detail}`);
    }

    const data = await response.json().catch(() => {
      throw new Error('[SEC EDGAR] invalid JSON response');
    });

    const hits = (data.hits?.hits || []).map((hit: Record<string, unknown>) => {
      const source = hit._source as Record<string, unknown> | undefined;
      return {
        entity_name: source?.entity_name,
        file_date: source?.file_date,
        form_type: source?.form_type,
        description: 'Item 5.02 — Departure/Appointment of Directors or Officers',
        snippet: (hit.highlight as Record<string, string[]> | undefined)?.['_all']?.[0] || null,
        filing_url: source?.file_num
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${source.file_num}&type=8-K&dateb=&owner=include&count=10`
          : null,
      };
    });

    return formatToolResult(
      { total: data.hits?.total?.value || 0, management_changes: hits },
      [url.toString()]
    );
  },
});
