---
name: piotroski-f
description: Calculates the Piotroski F-Score for financial strength assessment. Triggers when user asks for Piotroski F-score, financial strength score, fundamental scoring, or value stock screening criteria.
---

# Piotroski F-Score Skill

## Workflow Checklist

Copy and track progress:
```
Piotroski F-Score Progress:
- [ ] Step 1: Get 2 years of financial statements
- [ ] Step 2: Score 9 binary criteria
- [ ] Step 3: Sum and interpret
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Income Statements (2 years)
**Query:** `"[TICKER] annual income statements for the last 2 years"`

**Extract:** `revenue`, `gross_profit`, `net_income`, `operating_income`

### 1.2 Balance Sheets (2 years)
**Query:** `"[TICKER] annual balance sheets for the last 2 years"`

**Extract:** `total_assets`, `total_current_assets`, `total_current_liabilities`, `total_debt`, `outstanding_shares`

### 1.3 Cash Flow Statements (2 years)
**Query:** `"[TICKER] annual cash flow statements for the last 2 years"`

**Extract:** `net_cash_flow_from_operations`, `capital_expenditure`

## Step 2: Score 9 Binary Criteria

### Profitability (4 points)
1. **ROA > 0**: Net Income / Total Assets > 0 → 1 point
2. **Operating Cash Flow > 0**: OCF > 0 → 1 point
3. **ROA Increasing**: Current year ROA > Prior year ROA → 1 point
4. **Accruals**: OCF > Net Income (quality of earnings) → 1 point

### Leverage / Liquidity (3 points)
5. **Declining Leverage**: Current year (Long-term Debt / Total Assets) < Prior year → 1 point
6. **Rising Current Ratio**: Current year (Current Assets / Current Liabilities) > Prior year → 1 point
7. **No Dilution**: Current year shares outstanding ≤ Prior year → 1 point

### Operating Efficiency (2 points)
8. **Rising Gross Margin**: Current year (Gross Profit / Revenue) > Prior year → 1 point
9. **Rising Asset Turnover**: Current year (Revenue / Total Assets) > Prior year → 1 point

## Step 3: Output Format

Present a structured summary including:
1. **F-Score Result**: Total score (0-9) with interpretation
2. **Criteria Breakdown Table**: Criterion, Current Value, Prior Value, Pass/Fail, Points
3. **Category Scores**: Profitability (0-4), Leverage (0-3), Efficiency (0-2)
4. **Interpretation**:
   - 8-9: **Strong** — High-quality value stock, strong fundamentals
   - 5-7: **Average** — Mixed signals, deeper analysis needed
   - 0-4: **Weak** — Poor fundamentals, potential value trap
5. **Caveats**: F-Score is designed for value stocks (low P/B); most useful when combined with value screens. Does not account for industry-specific factors.
