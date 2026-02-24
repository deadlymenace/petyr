import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatToolResult } from '../types.js';
import { logger } from '../../utils/logger.js';

const SEC_EFTS_BASE_URL = 'https://efts.sec.gov/LATEST/search-index';

const SecFullTextSearchInputSchema = z.object({
  query: z
    .string()
    .describe('Full-text search query across SEC filings. Supports boolean operators (AND, OR, NOT) and phrase matching with quotes.'),
  forms: z
    .string()
    .optional()
    .describe("Comma-separated filing types to filter. Examples: '10-K', '10-Q', '8-K', '10-K,10-Q', '13D', '13G', 'DEF 14A'."),
  date_range: z
    .enum(['custom', '1d', '7d', '30d', '1y', '5y'])
    .default('1y')
    .describe("Date range for the search. Defaults to '1y' (last year)."),
  start_date: z
    .string()
    .optional()
    .describe("Start date in YYYY-MM-DD format. Only used when date_range is 'custom'."),
  end_date: z
    .string()
    .optional()
    .describe("End date in YYYY-MM-DD format. Only used when date_range is 'custom'."),
  entity: z
    .string()
    .optional()
    .describe("Company name or CIK number to filter results to a specific entity."),
});

export const secFullTextSearch = new DynamicStructuredTool({
  name: 'sec_full_text_search',
  description: `Searches across ALL SEC filings using the EDGAR full-text search index (EFTS). No API key required. Use for:
- Finding mentions of specific companies, products, or technologies across all filings
- Identifying supplier/customer relationships from 10-K disclosures
- Tracking competitive mentions and market position statements
- Searching for specific risk factors or regulatory disclosures
- Finding 13D/13G activist investor filings
- Searching 8-K material events across all companies`,
  schema: SecFullTextSearchInputSchema,
  func: async (input) => {
    const url = new URL(SEC_EFTS_BASE_URL);
    url.searchParams.append('q', input.query);

    if (input.forms) {
      url.searchParams.append('forms', input.forms);
    }

    if (input.date_range === 'custom') {
      if (input.start_date) url.searchParams.append('dateRange', 'custom');
      if (input.start_date) url.searchParams.append('startdt', input.start_date);
      if (input.end_date) url.searchParams.append('enddt', input.end_date);
    } else {
      const now = new Date();
      let start: Date;
      switch (input.date_range) {
        case '1d': start = new Date(now.getTime() - 86400000); break;
        case '7d': start = new Date(now.getTime() - 7 * 86400000); break;
        case '30d': start = new Date(now.getTime() - 30 * 86400000); break;
        case '1y': start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
        case '5y': start = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()); break;
        default: start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      }
      url.searchParams.append('dateRange', 'custom');
      url.searchParams.append('startdt', start.toISOString().split('T')[0]);
      url.searchParams.append('enddt', now.toISOString().split('T')[0]);
    }

    if (input.entity) {
      url.searchParams.append('q', `"${input.entity}"`);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'Petyr Financial Research Tool research@petyr.ai',
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
        file_number: source?.file_num,
        period_of_report: source?.period_of_report,
        snippet: (hit.highlight as Record<string, string[]> | undefined)?.['_all']?.[0] || null,
        filing_url: source?.file_num
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${source.file_num}&type=&dateb=&owner=include&count=10`
          : null,
      };
    });

    return formatToolResult(
      { total: data.hits?.total?.value || 0, results: hits },
      [url.toString()]
    );
  },
});
