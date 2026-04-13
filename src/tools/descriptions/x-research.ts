export const X_RESEARCH_DESCRIPTION = `
Multi-platform social media research agent. Searches X/Twitter, Reddit, StockTwits, HackerNews, YouTube, Substack, and LinkedIn for real-time perspectives, expert opinions, community sentiment, and breaking news reactions. Uses LLM-powered synthesis to extract structured insights.

## When to Use

- "what are people saying about X", "what's twitter saying", "check social media", "search reddit for"
- "what do experts/developers/analysts think about..."
- "community reaction to...", "social sentiment on...", "what's the buzz around..."
- Retail investor sentiment, social buzz, or hype around a stock, product, or event
- Breaking news reactions — how the community is responding in real-time
- Developer/tech community opinions (HackerNews, Reddit, Substack)
- Expert and influencer takes on a topic
- Understanding public discourse before or after an earnings call, product launch, policy change
- When news_sentiment gives the institutional view but you also need the retail/community view
- Any query where qualitative social context would enrich quantitative data from other tools

## When NOT to Use

- For posting tweets or account management (not supported)
- For historical data older than 30 days
- For pure financial data (prices, metrics, filings) — use financial_search
- For ticker-specific news+social combo — use news_sentiment (it includes both)

## Focus Modes

- **general** (default) — balanced synthesis across themes, sentiment, and voices
- **sentiment** — deep bullish/bearish scoring with platform divergence analysis
- **expert_opinions** — prioritizes verified accounts, analysts, domain experts
- **community_reaction** — consensus vs. dissent, echo chambers vs. genuine debate
- **breaking_news** — real-time narrative tracking, verified vs. unverified claims

## Platform Filtering

Filter to specific platforms: ["twitter", "reddit", "hackernews", "stocktwits", "youtube", "substack", "linkedin"]. Omit to search all.

## Combination Strategies

- **x_research + news_sentiment** — full picture: institutional news + retail social across platforms
- **x_research + financial_search** — quantitative data enriched with qualitative community context
- **x_research + catalyst_search** — event-driven analysis with real-time social reaction
- **x_research (focus: expert_opinions) + analyst-ratings skill** — professional + social expert consensus

## Usage Notes

- Returns: key themes, sentiment breakdown (with score), notable voices, consensus, contrarian takes, platform differences, momentum, confidence level, and raw post samples
- Default lookback: 7 days (configurable up to 30)
- Works best with specific queries ("NVDA earnings reaction", "developer reaction to Rust 2.0") vs. vague ones ("stocks")
`.trim();
