---
name: ddm
description: Performs dividend discount model (DDM) valuation. Triggers when user asks for dividend discount model, dividend valuation, DDM, dividend-based fair value, or valuation of dividend-paying stocks.
---

# Dividend Discount Model Skill

## Workflow Checklist

Copy and track progress:
```
DDM Analysis Progress:
- [ ] Step 1: Get dividend history and payout ratio
- [ ] Step 2: Calculate dividend growth rate (CAGR)
- [ ] Step 3: Estimate cost of equity (CAPM)
- [ ] Step 4: Project dividends 5 years + terminal
- [ ] Step 5: Discount to present value
- [ ] Step 6: Sensitivity analysis
```

## Step 1: Gather Dividend Data

Call the `financial_search` tool:

### 1.1 Financial Metrics
**Query:** `"[TICKER] financial metrics snapshot"`

**Extract:** `dividend_yield`, `dividend_per_share`, `payout_ratio`, `market_cap`, `pe_ratio`

### 1.2 Dividend History
**Query:** `"[TICKER] cash flow statements for the last 5 years"`

**Extract:** `dividends_paid` (will be negative), `net_income`

**Calculate:** Annual dividends per share over 5 years

### 1.3 Company Facts
**Query:** `"[TICKER] company facts"`

**Extract:** `sector`, `industry` — for WACC estimation

### 1.4 Current Price
**Query:** `"[TICKER] price snapshot"`

**Extract:** `price`

## Step 2: Calculate Dividend Growth Rate

Calculate 5-year dividend CAGR from history.

**Growth rate selection:**
- Stable dividend history → Use CAGR directly
- Recently increased/decreased → Weight recent years more heavily
- **Cap at 8%** for DDM (must be below cost of equity for Gordon model to converge)
- Cross-validate with earnings growth rate (dividends can't grow faster than earnings long-term)

## Step 3: Estimate Cost of Equity (CAPM)

Cost of Equity = Risk-Free Rate + Beta × Equity Risk Premium

**Default assumptions:**
- Risk-free rate: 4% (current 10-year Treasury approximate)
- Equity risk premium: 5-6%
- Beta: Use from financial metrics, or estimate 0.8-1.2 based on sector

**Result:** Typically 8-12% for most dividend stocks

**Critical check:** Cost of equity MUST be greater than dividend growth rate for Gordon model

## Step 4: Project Dividends

**Years 1-5:** Apply growth rate with gradual decay toward terminal rate

**Terminal value (Year 5+):** Gordon Growth Model:
- Terminal Value = D₆ / (Ke - g)
- Where g = long-term growth rate (2-3%, matching GDP growth)

## Step 5: Calculate Present Value

1. Discount each year's projected dividend: PV = D / (1 + Ke)^t
2. Discount terminal value: PV_TV = TV / (1 + Ke)^5
3. Fair value per share = Sum of all PVs
4. Compare to current price for upside/downside

## Step 6: Output Format

Present a structured summary including:
1. **Valuation Summary**: Current price vs. DDM fair value, upside/downside percentage
2. **Dividend History Table**: Year, DPS, Growth Rate, Payout Ratio
3. **Key Inputs**: Cost of equity, growth rate (near-term), terminal growth rate
4. **Projected Dividends Table**: Years 1-5 projected DPS with present values
5. **Sensitivity Matrix**: 3×3 grid varying cost of equity (±1%) and terminal growth (1.5%, 2.5%, 3.5%)
6. **Caveats**: DDM only works for consistent dividend payers; high-growth companies reinvest instead
