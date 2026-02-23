---
name: investment-thesis
description: Builds a comprehensive investment thesis with bull/bear case and Buy/Sell/Hold recommendation. Triggers when user asks "should I buy [stock]", investment thesis, bull/bear case, stock recommendation, investment analysis, or comprehensive stock evaluation.
---

# Investment Thesis Skill

## Workflow Checklist

Copy and track progress:
```
Investment Thesis Progress:
- [ ] Step 1: Financial health assessment
- [ ] Step 2: Industry position and competitive moat
- [ ] Step 3: Supply chain and business relationships
- [ ] Step 4: Management quality and insider activity
- [ ] Step 5: Macro environment and timing
- [ ] Step 6: Catalysts and event analysis
- [ ] Step 7: Valuation (invoke DCF or comps)
- [ ] Step 8: Risk assessment
- [ ] Step 9: Synthesis — Buy / Sell / Hold with conviction
```

## Step 1: Financial Health

Call `financial_search`:

**Query:** `"[TICKER] financial metrics snapshot"`
**Query:** `"[TICKER] annual income statements for the last 3 years"`
**Query:** `"[TICKER] annual balance sheets for the last 3 years"`
**Query:** `"[TICKER] annual cash flow statements for the last 3 years"`

**Assess:**
- Revenue growth trajectory (accelerating/decelerating?)
- Margin trends (gross, operating, net)
- Free cash flow generation consistency
- Debt levels and coverage ratios
- Return on equity and return on invested capital

## Step 2: Industry Position

Call `financial_search`:
**Query:** `"[TICKER] company facts"`
**Query:** `"[TICKER] segmented revenues for the last year"`

**Assess:**
- Market position within industry
- Revenue diversification (segments, geography)
- Competitive advantages (brand, network effects, switching costs, cost advantages, scale)

## Step 3: Supply Chain Analysis

Call `supply_chain_search` (if available):
**Query:** `"[TICKER] suppliers, customers, and competitive relationships"`

**Assess:**
- Customer concentration risk
- Supplier dependency
- Competitive threat landscape

## Step 4: Management & Insider Activity

Call `catalyst_search` (if available):
**Query:** `"[TICKER] management changes and insider trading in the last year"`

**Assess:**
- Recent executive changes (stability vs disruption)
- Insider buying vs selling patterns
- Alignment of management incentives with shareholders

## Step 5: Macro Environment

Call `macro_search` (if available):
**Query:** `"Current economic environment: interest rates, inflation, and consumer sentiment"`

**Assess:**
- How current macro conditions affect this company/sector
- Interest rate sensitivity (if highly leveraged or rate-sensitive business)
- Consumer/business spending environment
- Currency exposure for international companies

## Step 6: Catalysts

Call `catalyst_search` (if available):
**Query:** `"[TICKER] upcoming catalysts, activist investors, and material events"`

Call `financial_search`:
**Query:** `"[TICKER] analyst estimates and price targets"`

**Assess:**
- Upcoming earnings dates and expectations
- Activist investor involvement
- M&A potential (acquirer or target)
- Product launches, regulatory decisions
- Analyst consensus and price target gap

## Step 7: Valuation

Invoke the `dcf-valuation` skill workflow (Steps 1-8) OR `comps` skill:
- Use DCF for absolute valuation (intrinsic value)
- Use comps for relative valuation (peer comparison)
- Ideally do both for triangulation

**Key question:** Is the stock trading above or below fair value, and by how much?

## Step 8: Risk Assessment

Summarize key risks:
1. **Company-specific risks**: Competitive threats, key person dependency, regulatory
2. **Industry risks**: Disruption, cyclicality, commodity exposure
3. **Macro risks**: Interest rates, recession, currency
4. **Valuation risk**: If overvalued, how much downside in bear case?

## Step 9: Output Format

Present a structured investment thesis:

1. **Recommendation**: Buy / Sell / Hold with conviction level (High / Medium / Low)
2. **Target Price Range**: Base, bull, and bear case price targets
3. **Bull Case** (3-5 bullets): Why the stock could outperform
4. **Bear Case** (3-5 bullets): Why the stock could underperform
5. **Key Metrics Table**: Current price, fair value (DCF), peer median, P/E, EV/EBITDA, FCF yield, dividend yield
6. **Catalyst Timeline**: Near-term events that could move the stock
7. **Risk/Reward**: Upside vs downside potential with probability weighting
8. **Disclaimer**: This is analysis, not financial advice. Always do your own research and consider your risk tolerance and investment horizon.
