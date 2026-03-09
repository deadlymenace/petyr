export const WATCHLIST_DESCRIPTION = `
Manages a persistent stock watchlist stored in .petyr/watchlist.json.

## When to Use

- User wants to track or follow specific stocks ("add NVDA to my watchlist")
- User asks "what's on my watchlist" or "show my watchlist"
- User wants price updates on their tracked stocks ("watchlist snapshot")
- User wants to stop tracking a stock ("remove AAPL from watchlist")

## When NOT to Use

- For one-off price checks (use financial_search)
- For portfolio valuation or P&L tracking (not supported)

## Usage Notes

- Actions: add, remove, list, snapshot
- Watchlist persists across sessions in .petyr/watchlist.json
- Snapshot fetches current prices for all watchlist tickers in parallel
- Optional notes can be attached when adding (e.g., "watching for earnings")
`.trim();
