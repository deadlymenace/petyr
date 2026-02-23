---
name: residual-income
description: Performs residual income / economic value added (EVA) valuation. Triggers when user asks for residual income model, economic value added, EVA analysis, or economic profit valuation.
---

# Residual Income / EVA Valuation Skill

## Workflow Checklist

Copy and track progress:
```
Residual Income Analysis Progress:
- [ ] Step 1: Get financial data (NOPAT, invested capital)
- [ ] Step 2: Calculate WACC
- [ ] Step 3: Calculate EVA (economic value added)
- [ ] Step 4: Project EVA 5 years + terminal
- [ ] Step 5: Discount to present value
- [ ] Step 6: Present results
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Income Statements
**Query:** `"[TICKER] annual income statements for the last 5 years"`

**Extract:** `operating_income`, `income_tax_expense`, `revenue`, `pretax_income`

**Calculate:** NOPAT = Operating Income × (1 - Effective Tax Rate)
- Effective Tax Rate = Income Tax Expense / Pretax Income

### 1.2 Balance Sheet
**Query:** `"[TICKER] annual balance sheets for the last 5 years"`

**Extract:** `total_assets`, `current_liabilities`, `total_debt`, `cash_and_equivalents`, `outstanding_shares`

**Calculate:** Invested Capital = Total Assets - Current Liabilities (excluding short-term debt) - Excess Cash

### 1.3 Financial Metrics
**Query:** `"[TICKER] financial metrics snapshot"`

**Extract:** `return_on_invested_capital`, `weighted_average_cost_of_capital`, `market_cap`, `enterprise_value`

### 1.4 Company Facts
**Query:** `"[TICKER] company facts"`

**Extract:** `sector` — for WACC estimation from [sector-wacc.md](../dcf/sector-wacc.md)

## Step 2: Calculate WACC

Use the sector-based WACC from the DCF skill's [sector-wacc.md](../dcf/sector-wacc.md), adjusted for company-specific capital structure.

## Step 3: Calculate EVA

**EVA = NOPAT - (Invested Capital × WACC)**

- EVA > 0: Company creates economic value (earns above cost of capital)
- EVA < 0: Company destroys economic value (earns below cost of capital)
- EVA = 0: Company earns exactly its cost of capital

Calculate EVA for each of the last 5 years to establish trend.

## Step 4: Project EVA

**Years 1-5:** Project NOPAT growth and invested capital growth
- Use historical trends with decay toward steady state
- EVA should converge toward zero for most companies as competition erodes excess returns

**Terminal value:** Assume EVA gradually decays to zero OR use a perpetuity of stabilized EVA

## Step 5: Calculate Intrinsic Value

**Intrinsic Value = Book Value of Equity + PV of Future EVAs**

1. Current book value of equity (from balance sheet)
2. Sum of discounted projected EVAs (Years 1-5)
3. Discounted terminal EVA value
4. Total = Book Value + PV(EVAs)
5. Per share = Total / Outstanding Shares

## Step 6: Output Format

Present a structured summary including:
1. **EVA History Table**: Year, NOPAT, Invested Capital, WACC, Capital Charge, EVA
2. **Value Creation Summary**: Is the company creating or destroying economic value?
3. **Intrinsic Value**: Book value + PV of future EVAs = fair value per share
4. **Comparison**: Fair value vs current price, upside/downside
5. **ROIC vs WACC Chart Data**: ROIC trend vs WACC (ROIC > WACC = value creation)
6. **Caveats**: Accounting adjustments needed for true economic capital; R&D capitalization matters
