---
name: earnings-analysis
description: Analyzes earnings calls and transcripts for a company. Triggers when user asks about earnings call, earnings transcript, management guidance, earnings commentary, quarterly results analysis, or what management said during earnings.
---

# Earnings Analysis Skill

## Workflow Checklist

Copy and track progress:
```
Earnings Analysis Progress:
- [ ] Step 1: Get earnings dates and latest quarter
- [ ] Step 2: Retrieve earnings transcript
- [ ] Step 3: Get financial data for context
- [ ] Step 4: Analyze management guidance and tone
- [ ] Step 5: Compare estimates vs. actuals
- [ ] Step 6: Present structured summary
```

## Step 1: Get Earnings Dates and Latest Quarter

Call `web_search` to find the most recent earnings date:

**Query:** `"[TICKER] most recent earnings call date [CURRENT_YEAR]"`

**Extract:** Date of last earnings call, fiscal quarter reported (e.g., Q3 FY2025)

If user specified a quarter, use that instead.

## Step 2: Retrieve Earnings Transcript

Search for the full transcript:

**Query via `web_search`:** `"[TICKER] [QUARTER] earnings call transcript [YEAR]"`

**Fetch transcript** via `web_fetch` from the best result URL (prefer Seeking Alpha, Motley Fool, or investor relations pages).

**If transcript unavailable:** Search for an earnings call summary or press release instead.

**Extract key sections:**
- Prepared remarks (CEO, CFO)
- Q&A session highlights
- Forward guidance statements

## Step 3: Get Financial Data for Context

Call `financial_search` with these queries:

### 3.1 Quarterly Results
**Query:** `"[TICKER] quarterly income statements last 4 quarters"`

**Extract:** Revenue, net income, EPS for trend comparison

### 3.2 Analyst Estimates
**Query:** `"[TICKER] analyst estimates quarterly"`

**Extract:** Estimated EPS and revenue for the reported quarter

### 3.3 Price Reaction
**Query:** `"[TICKER] stock price snapshot"`

**Extract:** Current price, recent price movement around earnings date

## Step 4: Analyze Management Guidance and Tone

From the transcript text, identify and summarize:

1. **Revenue Guidance:** Did management raise, lower, or maintain guidance?
2. **Margin Outlook:** Any commentary on cost pressures, pricing power, or margin expansion?
3. **Growth Drivers:** What segments, products, or geographies did management highlight?
4. **Risk Factors:** What headwinds or challenges did management call out?
5. **Capital Allocation:** Any changes to buyback, dividend, or M&A plans?
6. **Tone Assessment:** Was management confident, cautious, defensive, or optimistic?

## Step 5: Compare Estimates vs. Actuals

Calculate for the reported quarter:
- **EPS Beat/Miss:** Actual EPS vs. consensus estimate ($ and % difference)
- **Revenue Beat/Miss:** Actual revenue vs. consensus ($ and % difference)
- **Guidance vs. Street:** If forward guidance given, compare to consensus for next quarter/year

## Step 6: Output Format

Present a structured summary:

1. **Headline:** "[TICKER] [QUARTER] Earnings: [Beat/Miss] — Key Takeaways"
2. **Results Table:** Revenue, EPS — actual vs. estimate, beat/miss amount
3. **Management Guidance Summary:** Forward outlook in 2-3 bullet points
4. **Key Themes from Q&A:** Top 3-5 analyst concerns and management responses
5. **Tone Assessment:** One-line characterization (e.g., "Cautiously optimistic, flagged macro uncertainty")
6. **Stock Reaction:** Price movement on/after earnings day
7. **Notable Quotes:** 1-2 direct quotes from management that capture the key message
