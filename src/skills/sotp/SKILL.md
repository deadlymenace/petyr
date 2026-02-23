---
name: sotp
description: Performs sum-of-the-parts (SOTP) valuation / segment valuation / breakup value analysis. Triggers when user asks for sum of the parts, segment valuation, breakup value, conglomerate discount, or SOTP analysis.
---

# Sum-of-the-Parts Valuation Skill

## Workflow Checklist

Copy and track progress:
```
SOTP Analysis Progress:
- [ ] Step 1: Get segmented revenues and company data
- [ ] Step 2: Get segment-appropriate peer multiples
- [ ] Step 3: Value each segment independently
- [ ] Step 4: Sum segments, subtract net debt
- [ ] Step 5: Compare to market cap (discount/premium)
```

## Step 1: Get Segment Data

Call the `financial_search` tool:

### 1.1 Segmented Revenues
**Query:** `"[TICKER] segmented revenues for the last year"`

**Extract:** Revenue by business segment and/or geography

### 1.2 Financial Metrics
**Query:** `"[TICKER] financial metrics snapshot"`

**Extract:** `market_cap`, `enterprise_value`, `total_debt`, `cash_and_equivalents`

### 1.3 Balance Sheet
**Query:** `"[TICKER] latest balance sheet"`

**Extract:** `total_debt`, `cash_and_equivalents` for net debt calculation

## Step 2: Identify Peer Multiples per Segment

For each business segment:
1. Identify 2-3 pure-play comparables in that segment's industry
2. Get their EV/Revenue and EV/EBITDA multiples via `financial_search`
3. Use the median multiple for each segment

**Example for a conglomerate with cloud + hardware:**
- Cloud segment → compare to CRM, NOW, DDOG (SaaS multiples)
- Hardware segment → compare to HPQ, DELL (hardware multiples)

## Step 3: Value Each Segment

For each segment:
- Segment EV = Segment Revenue × Applicable EV/Revenue multiple
- If segment EBITDA is available: Segment EV = Segment EBITDA × Applicable EV/EBITDA multiple

## Step 4: Calculate Equity Value

1. **Sum of Parts EV** = Sum of all segment EVs
2. **Net Debt** = Total Debt - Cash and Equivalents
3. **Implied Equity Value** = Sum of Parts EV - Net Debt
4. **Per Share Value** = Implied Equity / Shares Outstanding

## Step 5: Output Format

Present a structured summary including:
1. **Segment Valuation Table**: Segment, Revenue, Multiple Used, Comparable Peers, Implied EV
2. **Bridge to Equity**: Sum of Parts EV → minus Net Debt → Equity Value → Per Share
3. **Discount/Premium**: Current market cap vs SOTP value (positive = conglomerate discount)
4. **Key Assumptions**: Which multiples and peers were used for each segment
5. **Caveats**: Segment margins may differ from pure-play peers; corporate overhead allocation; synergy loss in actual breakup
