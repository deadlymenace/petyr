---
name: earnings-surprise
description: Analyzes earnings surprise history and estimate revision trends for a stock. Triggers when user asks about earnings beats/misses, estimate revisions, earnings momentum, surprise history, or whether a company consistently beats estimates.
---

# Earnings Surprise Analysis Skill

## Workflow Checklist

Copy and track progress:
```
Earnings Surprise Analysis Progress:
- [ ] Step 1: Get quarterly earnings history
- [ ] Step 2: Get analyst estimate history
- [ ] Step 3: Calculate beat/miss pattern
- [ ] Step 4: Analyze estimate revision trends
- [ ] Step 5: Correlate with price reactions
- [ ] Step 6: Present findings
```

## Step 1: Get Quarterly Earnings History

Call `financial_search`:

**Query:** `"[TICKER] quarterly income statements last 8 quarters"`

**Extract:** Reported EPS (diluted) and revenue for each quarter

## Step 2: Get Analyst Estimate History

Call `financial_search`:

**Query:** `"[TICKER] analyst estimates quarterly"`

**Extract:** Consensus EPS and revenue estimates for each available quarter

## Step 3: Calculate Beat/Miss Pattern

For each quarter where both actual and estimated data exist:

1. **EPS Surprise:** `(Actual EPS - Estimated EPS) / |Estimated EPS| × 100%`
2. **Revenue Surprise:** `(Actual Revenue - Estimated Revenue) / Estimated Revenue × 100%`
3. **Beat/Miss Streak:** Count consecutive beats or misses
4. **Average Surprise:** Mean EPS surprise over the period
5. **Consistency Score:** % of quarters that beat estimates

**Classification:**
- Consistent Beater: >75% beat rate with positive average surprise
- Mixed: 40-75% beat rate
- Consistent Misser: <40% beat rate

## Step 4: Analyze Estimate Revision Trends

Call `web_search`:

**Query:** `"[TICKER] earnings estimate revisions [CURRENT_YEAR]"`

**Assess:**
1. **Revision Direction:** Are analysts raising or cutting estimates for next quarter/year?
2. **Revision Magnitude:** How much have estimates changed in last 30/60/90 days?
3. **Revision Breadth:** Are most analysts moving in the same direction?
4. **Estimate Dispersion:** Wide vs. narrow range of estimates (indicates uncertainty)

## Step 5: Correlate with Price Reactions

Call `financial_search`:

**Query:** `"[TICKER] daily stock prices last 2 years"`

**For each earnings date, measure:**
1. **1-Day Reaction:** % change on earnings day
2. **Post-Earnings Drift:** 5-day return after earnings
3. **Pattern:** Does the stock tend to sell off on beats (buy the rumor, sell the news)?

## Step 6: Output Format

Present findings in this structure:

1. **Summary Line:** "[TICKER] has [beat/missed] EPS estimates [X] of last [Y] quarters"
2. **Surprise History Table:**
   | Quarter | Est EPS | Act EPS | Surprise | Revenue Surprise | 1-Day Move |
3. **Key Statistics:**
   - Beat rate, average surprise magnitude, longest streak
4. **Estimate Revision Trend:** Current direction and magnitude for upcoming quarter
5. **Price Reaction Pattern:** Does the market reward/punish beats/misses?
6. **Signal Assessment:** Bullish (rising estimates + consistent beats), Neutral, or Bearish (falling estimates + misses)
