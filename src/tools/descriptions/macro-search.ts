/**
 * Rich description for the macro_search tool.
 * Used in the system prompt to guide the LLM on when and how to use this tool.
 */
export const MACRO_SEARCH_DESCRIPTION = `
Intelligent meta-tool for macroeconomic data from FRED (Federal Reserve Economic Data). Takes a natural language query and automatically routes to appropriate economic data tools covering 800,000+ time series.

## When to Use

- Interest rates (fed funds rate, Treasury yields, mortgage rates)
- Yield curve analysis (2s10s spread, inversions, term structure)
- Inflation data (CPI, core CPI, PCE, core PCE)
- Employment data (unemployment rate, nonfarm payrolls, jobless claims)
- GDP and economic growth metrics
- Consumer sentiment and confidence
- Market volatility (VIX)
- Housing market indicators (home prices, mortgage rates)
- Money supply and Federal Reserve balance sheet
- Recession risk assessment
- Economic environment for investment timing

## When NOT to Use

- Company-specific financial data (use financial_search)
- Stock prices (use financial_search)
- SEC filings (use read_filings)
- Industry/competitive analysis (use supply_chain_search)

## Usage Notes

- Call ONCE with the complete natural language query - handles complexity internally
- Requires FRED_API_KEY environment variable (free from https://fred.stlouisfed.org/docs/api/api_key.html)
- Returns structured time series data with source URLs for verification
- Common queries: "current interest rate environment", "yield curve status", "inflation trend", "recession indicators"
`.trim();
