/**
 * Rich description for the catalyst_search tool.
 * Used in the system prompt to guide the LLM on when and how to use this tool.
 */
export const CATALYST_SEARCH_DESCRIPTION = `
Intelligent meta-tool for catalyst and event-driven analysis. Takes a natural language query and automatically routes to management tracking, insider trading, and SEC filing search tools to identify potential stock-moving events.

## When to Use

- Management changes (CEO/CFO/CTO departures, new appointments, board changes)
- Insider trading patterns (cluster buys/sells, unusual activity signals)
- Activist investor positions (13D/13G filings, activist campaigns)
- Material events from 8-K filings (M&A, restructuring, credit agreements)
- Proxy fights and shareholder activism
- Event-driven investment signals and catalysts
- Identifying upcoming triggers for stock price movement

## When NOT to Use

- Financial statements or metrics (use financial_search or financial_metrics)
- Stock prices (use financial_search)
- Macroeconomic data (use macro_search)
- Supply chain or competitor analysis (use supply_chain_search)
- Reading full filing content (use read_filings)

## Usage Notes

- Call ONCE with the complete natural language query - handles routing internally
- Combines SEC EDGAR search (free) with insider trades from Financial Datasets API
- For activist investors, searches SC 13D (activist intent) and SC 13G (passive large holders)
- For management, targets 8-K Item 5.02 (Departure/Appointment of Directors or Officers)
- Returns structured results with filing dates and snippets
`.trim();
