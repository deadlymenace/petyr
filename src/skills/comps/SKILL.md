---
name: comps
description: Performs comparable company analysis (trading multiples / relative valuation). Triggers when user asks for comparable companies, trading multiples, relative valuation, peer valuation, "how does X compare to peers", or EV/EBITDA comps.
---

# Comparable Company Analysis Skill

## Workflow Checklist

Copy and track progress:
```
Comps Analysis Progress:
- [ ] Step 1: Identify peer group
- [ ] Step 2: Pull key multiples for each peer
- [ ] Step 3: Calculate median/mean multiples
- [ ] Step 4: Apply to target company's metrics
- [ ] Step 5: Derive implied valuation range
- [ ] Step 6: Present as football field chart data
```

## Step 1: Identify Peer Group

Call the `financial_search` tool:

### 1.1 Company Facts
**Query:** `"[TICKER] company facts"`

**Extract:** `sector`, `industry`, `market_cap`

### 1.2 Peer Identification
Based on the sector and industry, identify 4-8 comparable companies. Prefer companies with:
- Same industry classification
- Similar market cap range (0.5x to 2x target)
- Similar business model and geography

## Step 2: Pull Key Multiples

For the target AND each peer, call `financial_search`:

**Query:** `"[TICKER] financial metrics snapshot"`

**Extract for each company:**
- `enterprise_value`, `market_cap`
- `pe_ratio` (P/E)
- `ev_to_ebitda` (EV/EBITDA)
- `ev_to_revenue` (EV/Revenue)
- `price_to_free_cash_flow` (P/FCF)
- `price_to_book` (P/B)

If any metric is missing, calculate from available data:
- EV/Revenue = enterprise_value / revenue
- P/FCF = market_cap / free_cash_flow

## Step 3: Calculate Statistics

For each multiple across the peer group:
- **Median** (preferred — less sensitive to outliers)
- **Mean** (for reference)
- **Min / Max** (for range)
- **Exclude** extreme outliers (>3 standard deviations or negative values)

## Step 4: Apply to Target Metrics

Get target company's fundamental data:

**Query:** `"[TICKER] income statements and cash flow statements for the last year"`

**Calculate implied values:**
- Implied EV (EV/EBITDA) = Target EBITDA × Peer Median EV/EBITDA
- Implied EV (EV/Revenue) = Target Revenue × Peer Median EV/Revenue
- Implied Market Cap (P/E) = Target EPS × Peer Median P/E
- Implied Market Cap (P/FCF) = Target FCF × Peer Median P/FCF

## Step 5: Derive Valuation Range

For each multiple:
1. Convert implied EV to equity value: Equity = EV - Net Debt
2. Divide by shares outstanding for per-share value
3. Calculate upside/downside vs current price

## Step 6: Output Format

Present a structured summary including:
1. **Peer Group Table**: Company, Market Cap, EV/EBITDA, P/E, EV/Revenue, P/FCF
2. **Statistics Row**: Median, Mean for each multiple
3. **Implied Valuation Table**: Multiple, Peer Median, Target Metric, Implied Value, vs Current Price
4. **Football Field Summary**: Low / Median / High implied price for each methodology
5. **Caveats**: Differences in growth rates, margins, or business mix vs peers
