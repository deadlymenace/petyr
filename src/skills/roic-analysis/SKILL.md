---
name: roic-analysis
description: Performs return on invested capital (ROIC) analysis / capital efficiency assessment. Triggers when user asks for ROIC, return on invested capital, capital efficiency, value creation analysis, or ROIC vs WACC comparison.
---

# ROIC Analysis Skill

## Workflow Checklist

Copy and track progress:
```
ROIC Analysis Progress:
- [ ] Step 1: Get 5 years of financial data
- [ ] Step 2: Calculate NOPAT
- [ ] Step 3: Calculate Invested Capital
- [ ] Step 4: Calculate ROIC and compare to WACC
- [ ] Step 5: Trend and peer comparison
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Income Statements (5 years)
**Query:** `"[TICKER] annual income statements for the last 5 years"`

**Extract:** `operating_income`, `income_tax_expense`, `pretax_income`, `revenue`

### 1.2 Balance Sheets (5 years)
**Query:** `"[TICKER] annual balance sheets for the last 5 years"`

**Extract:** `total_assets`, `total_current_liabilities`, `total_debt`, `cash_and_equivalents`, `outstanding_shares`

### 1.3 Financial Metrics
**Query:** `"[TICKER] financial metrics snapshot"`

**Extract:** `return_on_invested_capital`, `weighted_average_cost_of_capital`, `market_cap`, `enterprise_value`

### 1.4 Company Facts
**Query:** `"[TICKER] company facts"`

**Extract:** `sector`, `industry` — for WACC estimation

## Step 2: Calculate NOPAT

**NOPAT = Operating Income × (1 - Effective Tax Rate)**

- Effective Tax Rate = Income Tax Expense / Pretax Income
- If tax rate is negative or >50%, use normalized 25% rate
- NOPAT represents the after-tax profit from core operations (excludes interest)

## Step 3: Calculate Invested Capital

**Invested Capital = Total Assets - Non-Interest-Bearing Current Liabilities - Excess Cash**

Simplified: **IC = Total Equity + Total Debt - Excess Cash**

Or: **IC = Total Assets - (Current Liabilities excluding short-term debt) - Cash above operating needs**

Rule of thumb for excess cash: Cash > 5% of revenue is "excess"

## Step 4: Calculate ROIC

**ROIC = NOPAT / Invested Capital**

For each year, calculate ROIC and compare:
- **ROIC > WACC**: Company creates economic value — each dollar invested earns more than its cost
- **ROIC = WACC**: Company earns exactly its cost of capital — no value creation
- **ROIC < WACC**: Company destroys economic value — shrinking is better than growing

**Use WACC from:**
1. Reported `weighted_average_cost_of_capital` if available
2. Sector-based estimate from [sector-wacc.md](../dcf/sector-wacc.md)

## Step 5: Output Format

Present a structured summary including:
1. **ROIC Summary**: Current ROIC, WACC, spread (ROIC - WACC)
2. **ROIC Trend Table**: Year, NOPAT, Invested Capital, ROIC, WACC, Spread, Value Creation?
3. **Value Creation Assessment**:
   - Consistent ROIC > WACC: Durable competitive advantage (moat)
   - ROIC declining toward WACC: Moat eroding
   - ROIC < WACC: No competitive advantage, consider reallocating capital
4. **Reinvestment Rate**: Revenue growth rate × (1/ROIC) = capital needed per $ of growth
5. **Peer Comparison**: If available, compare ROIC to 2-3 peers
6. **Caveats**: ROIC varies by industry (capital-light businesses naturally have high ROIC); compare within sectors. R&D-intensive firms may have understated invested capital if R&D is expensed.
