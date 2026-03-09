export const NEWS_SENTIMENT_DESCRIPTION = `
Analyzes recent news AND social media sentiment for a stock ticker. Combines institutional news headlines with X/Twitter social buzz for a complete sentiment picture.

## When to Use

- Quick sentiment check on a stock ("what's the news sentiment for NVDA?")
- Detecting narrative shifts or emerging catalysts from news flow
- Pre-analysis check before deeper research
- Understanding both institutional (news) and retail (social) sentiment
- Gauging social buzz around earnings, product launches, or events

## When NOT to Use

- For historical financial data (use financial_search)
- For SEC filing analysis (use supply_chain_search or catalyst_search)
- For economic/macro data (use macro_search)
- For in-depth company analysis (use investment-thesis skill)
- For general X/Twitter research not tied to a ticker (use x_research)

## Usage Notes

- Returns: news sentiment score, social sentiment score, sentiment breakdown, and an AI summary combining both signals
- News score from -1.0 (very bearish) to +1.0 (very bullish)
- Social component auto-enabled when EXASEARCH_API_KEY is set (can disable with include_social: false)
- AI summary highlights divergence between news and social sentiment
- Default lookback is 7 days, max 30 days
`.trim();
