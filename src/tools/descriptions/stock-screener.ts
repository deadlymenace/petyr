export const STOCK_SCREENER_DESCRIPTION = `
Compares and ranks multiple stocks across financial metrics in a single call.

## When to Use

- Comparing multiple stocks by a specific metric (P/E, ROE, dividend yield, etc.)
- Ranking stocks within a sector or watchlist
- Finding the best/worst performer in a group
- Multi-stock screening queries like "which of these has the highest margin?"

## When NOT to Use

- For single-stock analysis (use financial_search instead)
- For fundamental deep-dives (use financial_search or a skill)
- For macro/economic data (use macro_search)

## Usage Notes

- Provide tickers in the query: "rank AAPL, MSFT, GOOGL by P/E ratio"
- Supports all key financial metrics: P/E, EV/EBITDA, ROE, ROIC, margins, growth rates
- Fetches data for all tickers in parallel for speed
- Returns a ranked table sorted by the requested metric
`.trim();
