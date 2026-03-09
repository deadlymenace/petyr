export const X_RESEARCH_DESCRIPTION = `
General-purpose X/Twitter research agent. Searches X for real-time perspectives, discussions, and expert opinions using Exa's tweet search.

## When to Use

- User says "search x for", "what are people saying about", "what's twitter saying", "check x for", "x research"
- User is working on something where recent X discourse would provide useful context
- Retail investor sentiment or social buzz around a stock or event
- Breaking news reactions or community discussion about a topic
- Dev/expert/community opinion gathering

## When NOT to Use

- For posting tweets or account management (not supported)
- For historical data older than 30 days
- When financial_search or news_sentiment would be more appropriate for pure financial data

## Usage Notes

- Requires EXASEARCH_API_KEY (same key used for web_search)
- Default lookback: 7 days (configurable up to 30)
- Returns: key themes, sentiment breakdown, notable voices, consensus view, raw post samples
- Works best with specific queries ("NVDA earnings reaction") vs. vague ones ("stocks")
- Can be combined with news_sentiment for a full picture (news + social)
`.trim();
