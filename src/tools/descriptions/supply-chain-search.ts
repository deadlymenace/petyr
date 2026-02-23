/**
 * Rich description for the supply_chain_search tool.
 * Used in the system prompt to guide the LLM on when and how to use this tool.
 */
export const SUPPLY_CHAIN_SEARCH_DESCRIPTION = `
Intelligent meta-tool for supply chain and industry analysis. Takes a natural language query and automatically searches SEC EDGAR full-text filings and financial data to map relationships and competitive positioning.

## When to Use

- Identifying suppliers and customers from SEC filing disclosures
- Mapping competitive landscape and market positioning
- Revenue segment analysis and breakdown
- Supply chain risk assessment
- Cross-company relationship discovery (who mentions whom in filings)
- Industry structure analysis
- Comparing financial metrics across competitors

## When NOT to Use

- Stock prices or current quotes (use financial_search)
- Macroeconomic data (use macro_search)
- Specific filing content reading (use read_filings)
- Management changes or insider trades (use catalyst_search)

## Usage Notes

- Call ONCE with the complete natural language query - handles routing internally
- No API key required for SEC EDGAR full-text search (free government data)
- Searches across ALL SEC filings (10-K, 10-Q, 8-K, etc.)
- Best for discovering relationships mentioned in Item 1 (Business) and Item 1A (Risk Factors) of 10-K filings
- Returns filing snippets with entity names and dates
`.trim();
