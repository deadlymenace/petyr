---
name: quality-of-earnings
description: Performs quality of earnings / earnings quality / accruals analysis. Triggers when user asks for quality of earnings, earnings quality assessment, accruals analysis, or whether earnings are real (cash-backed).
---

# Quality of Earnings Skill

## Workflow Checklist

Copy and track progress:
```
Quality of Earnings Progress:
- [ ] Step 1: Get 3 years of income + cash flow statements
- [ ] Step 2: Compare net income vs operating cash flow
- [ ] Step 3: Calculate accruals ratio
- [ ] Step 4: Check revenue recognition red flags
- [ ] Step 5: Check expense capitalization
- [ ] Step 6: Score and summarize
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Income Statements (3 years)
**Query:** `"[TICKER] annual income statements for the last 3 years"`

**Extract:** `revenue`, `net_income`, `cost_of_revenue`, `operating_income`

### 1.2 Cash Flow Statements (3 years)
**Query:** `"[TICKER] annual cash flow statements for the last 3 years"`

**Extract:** `net_cash_flow_from_operations`, `capital_expenditure`, `depreciation_and_amortization`

### 1.3 Balance Sheets (3 years)
**Query:** `"[TICKER] annual balance sheets for the last 3 years"`

**Extract:** `total_assets`, `accounts_receivable`, `inventory`

## Step 2: OCF vs Net Income

**OCF/NI Ratio = Operating Cash Flow / Net Income**

For each year:
- OCF/NI > 1.0: **High quality** — cash flow exceeds reported earnings
- OCF/NI = 0.8–1.0: **Acceptable** — some timing differences
- OCF/NI < 0.8: **Low quality** — significant gap between reported and cash earnings
- OCF/NI < 0: **Red flag** — profitable on paper but burning cash

## Step 3: Accruals Ratio

**Accruals Ratio = (Net Income - Operating Cash Flow) / Total Assets**

- Ratio < -5%: **High quality** — cash earnings exceed accrual earnings
- Ratio -5% to 5%: **Normal** — typical accrual dynamics
- Ratio > 5%: **Low quality** — earnings heavily driven by accruals
- Ratio > 10%: **Red flag** — investigate further

## Step 4: Revenue Recognition Checks

**Days Sales Outstanding (DSO) = (Accounts Receivable / Revenue) × 365**

- Rising DSO trend: **Warning** — possible aggressive revenue recognition
- DSO rising faster than revenue: **Red flag** — channel stuffing risk
- Compare DSO to industry average if possible

## Step 5: Expense Capitalization Check

**CapEx / Revenue Ratio** and **CapEx / D&A Ratio**

- CapEx/Revenue rising while CapEx/D&A > 2: **Warning** — may be capitalizing expenses
- D&A declining as % of PP&E: **Warning** — may be stretching useful lives

## Step 6: Output Format

Present a structured summary including:
1. **Overall Quality Score**: High / Acceptable / Low / Red Flag
2. **OCF vs Net Income Table**: Year, Net Income, OCF, OCF/NI Ratio, Assessment
3. **Accruals Analysis**: Year, Accruals, Total Assets, Accruals Ratio, Assessment
4. **Revenue Quality**: DSO trend, revenue vs receivables growth comparison
5. **CapEx Analysis**: CapEx/Revenue trend, CapEx/D&A ratio
6. **Key Findings**: Top 2-3 observations about earnings quality
7. **Caveats**: One-time items (restructuring, asset sales) can distort OCF/NI; industry context matters (SaaS deferred revenue creates natural OCF > NI)
