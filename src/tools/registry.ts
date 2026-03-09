import { StructuredToolInterface } from '@langchain/core/tools';
import { createFinancialSearch, createFinancialMetrics, createReadFilings, createOptionsData } from './finance/index.js';
import { exaSearch, perplexitySearch, tavilySearch } from './search/index.js';
import { skillTool, SKILL_TOOL_DESCRIPTION } from './skill.js';
import { webFetchTool } from './fetch/index.js';
import { browserTool } from './browser/index.js';
import { readFileTool, writeFileTool, editFileTool } from './filesystem/index.js';
import { FINANCIAL_SEARCH_DESCRIPTION, FINANCIAL_METRICS_DESCRIPTION, WEB_SEARCH_DESCRIPTION, WEB_FETCH_DESCRIPTION, READ_FILINGS_DESCRIPTION, BROWSER_DESCRIPTION, READ_FILE_DESCRIPTION, WRITE_FILE_DESCRIPTION, EDIT_FILE_DESCRIPTION, MACRO_SEARCH_DESCRIPTION, SUPPLY_CHAIN_SEARCH_DESCRIPTION, CATALYST_SEARCH_DESCRIPTION, NEWS_SENTIMENT_DESCRIPTION, GENERATE_REPORT_DESCRIPTION, STOCK_SCREENER_DESCRIPTION, WATCHLIST_DESCRIPTION, X_RESEARCH_DESCRIPTION } from './descriptions/index.js';
import { discoverSkills } from '../skills/index.js';
import { createMacroSearch } from './macro/index.js';
import { createSupplyChainSearch, createCatalystSearch, createNewsSentiment, createStockScreener, createXResearch } from './research/index.js';
import { createGenerateReport } from './report/index.js';
import { watchlistTool } from './portfolio/index.js';

/**
 * A registered tool with its rich description for system prompt injection.
 */
export interface RegisteredTool {
  /** Tool name (must match the tool's name property) */
  name: string;
  /** The actual tool instance */
  tool: StructuredToolInterface;
  /** Rich description for system prompt (includes when to use, when not to use, etc.) */
  description: string;
}

/**
 * Get all registered tools with their descriptions.
 * Conditionally includes tools based on environment configuration.
 *
 * @param model - The model name (needed for tools that require model-specific configuration)
 * @returns Array of registered tools
 */
export function getToolRegistry(model: string): RegisteredTool[] {
  const tools: RegisteredTool[] = [
    {
      name: 'financial_search',
      tool: createFinancialSearch(model),
      description: FINANCIAL_SEARCH_DESCRIPTION,
    },
    {
      name: 'financial_metrics',
      tool: createFinancialMetrics(model),
      description: FINANCIAL_METRICS_DESCRIPTION,
    },
    {
      name: 'read_filings',
      tool: createReadFilings(model),
      description: READ_FILINGS_DESCRIPTION,
    },
    {
      name: 'web_fetch',
      tool: webFetchTool,
      description: WEB_FETCH_DESCRIPTION,
    },
    {
      name: 'browser',
      tool: browserTool,
      description: BROWSER_DESCRIPTION,
    },
    {
      name: 'read_file',
      tool: readFileTool,
      description: READ_FILE_DESCRIPTION,
    },
    {
      name: 'write_file',
      tool: writeFileTool,
      description: WRITE_FILE_DESCRIPTION,
    },
    {
      name: 'edit_file',
      tool: editFileTool,
      description: EDIT_FILE_DESCRIPTION,
    },
  ];

  // Include macro_search if FRED API key is configured
  if (process.env.FRED_API_KEY) {
    tools.push({
      name: 'macro_search',
      tool: createMacroSearch(model),
      description: MACRO_SEARCH_DESCRIPTION,
    });
  }

  // Include supply_chain_search — always available (free SEC EDGAR)
  tools.push({
    name: 'supply_chain_search',
    tool: createSupplyChainSearch(model),
    description: SUPPLY_CHAIN_SEARCH_DESCRIPTION,
  });

  // Include catalyst_search — always available
  tools.push({
    name: 'catalyst_search',
    tool: createCatalystSearch(model),
    description: CATALYST_SEARCH_DESCRIPTION,
  });

  // news_sentiment — always available (uses LLM knowledge)
  tools.push({
    name: 'news_sentiment',
    tool: createNewsSentiment(model),
    description: NEWS_SENTIMENT_DESCRIPTION,
  });

  // stock_screener — always available (uses Financial Datasets API)
  tools.push({
    name: 'stock_screener',
    tool: createStockScreener(model),
    description: STOCK_SCREENER_DESCRIPTION,
  });

  // get_options_data — always available (uses LLM knowledge)
  tools.push({
    name: 'get_options_data',
    tool: createOptionsData(model),
    description: 'Retrieves options chain data including implied volatility, put/call ratios, and unusual activity.',
  });

  // generate_report — always available
  tools.push({
    name: 'generate_report',
    tool: createGenerateReport(model),
    description: GENERATE_REPORT_DESCRIPTION,
  });

  // manage_watchlist — always available (local file persistence)
  tools.push({
    name: 'manage_watchlist',
    tool: watchlistTool,
    description: WATCHLIST_DESCRIPTION,
  });

  // x_research — available when Exa API key is configured (uses Exa's tweet search)
  if (process.env.EXASEARCH_API_KEY) {
    tools.push({
      name: 'x_research',
      tool: createXResearch(model),
      description: X_RESEARCH_DESCRIPTION,
    });
  }

  // Include web_search if Exa, Perplexity, or Tavily API key is configured (Exa → Perplexity → Tavily)
  if (process.env.EXASEARCH_API_KEY) {
    tools.push({
      name: 'web_search',
      tool: exaSearch,
      description: WEB_SEARCH_DESCRIPTION,
    });
  } else if (process.env.PERPLEXITY_API_KEY) {
    tools.push({
      name: 'web_search',
      tool: perplexitySearch,
      description: WEB_SEARCH_DESCRIPTION,
    });
  } else if (process.env.TAVILY_API_KEY) {
    tools.push({
      name: 'web_search',
      tool: tavilySearch,
      description: WEB_SEARCH_DESCRIPTION,
    });
  }

  // Include skill tool if any skills are available
  const availableSkills = discoverSkills();
  if (availableSkills.length > 0) {
    tools.push({
      name: 'skill',
      tool: skillTool,
      description: SKILL_TOOL_DESCRIPTION,
    });
  }

  return tools;
}

/**
 * Get just the tool instances for binding to the LLM.
 *
 * @param model - The model name
 * @returns Array of tool instances
 */
export function getTools(model: string): StructuredToolInterface[] {
  return getToolRegistry(model).map((t) => t.tool);
}

/**
 * Build the tool descriptions section for the system prompt.
 * Formats each tool's rich description with a header.
 *
 * @param model - The model name
 * @returns Formatted string with all tool descriptions
 */
export function buildToolDescriptions(model: string): string {
  return getToolRegistry(model)
    .map((t) => `### ${t.name}\n\n${t.description}`)
    .join('\n\n');
}
