---
name: analyst-ratings
description: Aggregates analyst ratings, price targets, and recommendation changes for a stock. Triggers when user asks about analyst consensus, price targets, buy/sell ratings, upgrades/downgrades, or what analysts think about a stock.
---

# Analyst Ratings Analysis Skill

## Workflow Checklist

Copy and track progress:
```
Analyst Ratings Analysis Progress:
- [ ] Step 1: Get current analyst consensus
- [ ] Step 2: Get price target data
- [ ] Step 3: Find recent rating changes
- [ ] Step 4: Get fundamental context
- [ ] Step 5: Cross-reference with insider activity
- [ ] Step 6: Present analysis
```

## Step 1: Get Current Analyst Consensus

Call `web_search`:

**Query:** `"[TICKER] analyst ratings consensus [CURRENT_YEAR]"`

**Extract:**
- Total number of analysts covering the stock
- Breakdown: Strong Buy, Buy, Hold, Sell, Strong Sell
- Consensus recommendation (Buy/Hold/Sell)
- Average rating score (1.0-5.0 scale)

## Step 2: Get Price Target Data

Call `web_search`:

**Query:** `"[TICKER] analyst price target average high low [CURRENT_YEAR]"`

**Extract:**
- Average price target
- High price target (most bullish)
- Low price target (most bearish)
- Median price target

Call `financial_search`:

**Query:** `"[TICKER] price snapshot"`

**Calculate:**
- Upside/downside to average target: `(Avg Target - Current Price) / Current Price × 100%`
- Upside to high target
- Downside to low target

## Step 3: Find Recent Rating Changes

Call `web_search`:

**Query:** `"[TICKER] analyst upgrade downgrade last 3 months"`

**Extract for each change:**
- Date
- Analyst firm
- Action (upgrade/downgrade/initiate/reiterate)
- Old rating → New rating
- Price target change (if any)

**Assess:**
- Net upgrades vs. downgrades in last 90 days
- Trend: Is sentiment improving or deteriorating?
- Notable firms (Goldman Sachs, JPMorgan, Morgan Stanley, etc.)

## Step 4: Get Fundamental Context

Call `financial_search`:

**Query:** `"[TICKER] key financial ratios"`

**Extract:** P/E, EV/EBITDA, revenue growth — to contextualize whether the consensus is reasonable

Call `financial_search`:

**Query:** `"[TICKER] analyst estimates annual"`

**Extract:** Forward EPS and revenue estimates for next 1-2 fiscal years

## Step 5: Cross-Reference with Insider Activity

Call `catalyst_search`:

**Query:** `"[TICKER] insider trading activity last 6 months"`

**Compare:**
- Are insiders buying while analysts are bearish? (Contrarian bullish signal)
- Are insiders selling while analysts are bullish? (Caution signal)
- Large insider purchases near analyst upgrades (confirmation)

## Step 6: Output Format

Present analysis in this structure:

1. **Headline:** "[TICKER]: [Consensus Rating] — Avg Target $[X] ([Y]% upside/downside)"
2. **Consensus Breakdown Table:**
   | Rating | Count | % |
3. **Price Target Range:** Low / Average / High with implied upside/downside
4. **Recent Rating Changes Table:**
   | Date | Firm | Action | Rating | Target |
5. **Trend Assessment:** Improving/Stable/Deteriorating based on recent changes
6. **Insider Signal:** Confirming or diverging from analyst sentiment
7. **Key Risk:** One-line note if analyst consensus is unusually one-sided or if estimates are declining despite bullish ratings
