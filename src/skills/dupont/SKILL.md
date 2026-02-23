---
name: dupont
description: Performs DuPont analysis / ROE decomposition / ROE breakdown. Triggers when user asks for DuPont analysis, ROE decomposition, ROE breakdown, return on equity drivers, or what's driving ROE changes.
---

# DuPont Analysis Skill

## Workflow Checklist

Copy and track progress:
```
DuPont Analysis Progress:
- [ ] Step 1: Get 3-5 years of financial data
- [ ] Step 2: Calculate 3-factor DuPont decomposition
- [ ] Step 3: Calculate 5-factor DuPont decomposition
- [ ] Step 4: Trend analysis
- [ ] Step 5: Identify ROE drivers
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Income Statements
**Query:** `"[TICKER] annual income statements for the last 5 years"`

**Extract:** `revenue`, `net_income`, `operating_income`, `pretax_income`, `income_tax_expense`

### 1.2 Balance Sheets
**Query:** `"[TICKER] annual balance sheets for the last 5 years"`

**Extract:** `total_assets`, `total_equity`, `total_debt`

### 1.3 Financial Metrics (for cross-validation)
**Query:** `"[TICKER] financial metrics for the last 5 years"`

**Extract:** `return_on_equity`, `net_profit_margin`, `asset_turnover`

## Step 2: 3-Factor DuPont

**ROE = Net Profit Margin × Asset Turnover × Equity Multiplier**

- **Net Profit Margin** = Net Income / Revenue
  - Measures: How much of each dollar of revenue becomes profit
- **Asset Turnover** = Revenue / Total Assets
  - Measures: How efficiently assets generate revenue
- **Equity Multiplier** = Total Assets / Total Equity
  - Measures: Financial leverage (higher = more debt)

Verify: Product of three factors ≈ Net Income / Total Equity = ROE

## Step 3: 5-Factor DuPont

**ROE = Tax Burden × Interest Burden × Operating Margin × Asset Turnover × Equity Multiplier**

- **Tax Burden** = Net Income / Pretax Income
  - Measures: What fraction of profits the company keeps after tax
- **Interest Burden** = Pretax Income / Operating Income (EBIT)
  - Measures: Impact of interest expense on profitability
- **Operating Margin** = Operating Income / Revenue
  - Measures: Core business profitability before interest and taxes
- **Asset Turnover** = Revenue / Total Assets
- **Equity Multiplier** = Total Assets / Total Equity

## Step 4: Trend Analysis

For each year, calculate all factors and identify:
- Which factor changed the most year-over-year
- Which factor is the primary driver of ROE improvement/decline
- Whether leverage is masking deteriorating operations (or vice versa)

## Step 5: Output Format

Present a structured summary including:
1. **ROE Trend**: ROE for each year with direction
2. **3-Factor Decomposition Table**: Year, Net Margin, Asset Turnover, Equity Multiplier, ROE
3. **5-Factor Decomposition Table**: Year, Tax Burden, Interest Burden, Op Margin, Asset Turnover, Eq Multiplier, ROE
4. **Key Insight**: Which factor is primarily driving ROE changes
5. **Peer Context**: If available, compare DuPont factors to key competitor
6. **Caveats**: High equity multiplier increases ROE but also increases risk; look at both operational factors AND leverage
