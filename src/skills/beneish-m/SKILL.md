---
name: beneish-m
description: Calculates the Beneish M-Score for earnings manipulation / accounting fraud detection. Triggers when user asks for Beneish M-score, earnings manipulation detection, accounting fraud risk, or financial statement quality screening.
---

# Beneish M-Score Skill

## Workflow Checklist

Copy and track progress:
```
Beneish M-Score Progress:
- [ ] Step 1: Get 2 years of financial statements
- [ ] Step 2: Calculate 8 component indices
- [ ] Step 3: Calculate M-Score
- [ ] Step 4: Interpret results
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Income Statements (2 years)
**Query:** `"[TICKER] annual income statements for the last 2 years"`

**Extract (current year = t, prior year = t-1):**
- `revenue`, `cost_of_revenue`, `gross_profit`
- `selling_general_and_admin`
- `depreciation_and_amortization`
- `net_income`

### 1.2 Balance Sheets (2 years)
**Query:** `"[TICKER] annual balance sheets for the last 2 years"`

**Extract:**
- `total_assets`, `total_current_assets`, `total_current_liabilities`
- `accounts_receivable`
- `property_plant_and_equipment`
- `total_debt` (current + long-term)

### 1.3 Cash Flow Statements (2 years)
**Query:** `"[TICKER] annual cash flow statements for the last 2 years"`

**Extract:** `net_cash_flow_from_operations`, `capital_expenditure`

## Step 2: Calculate 8 Indices

### DSRI — Days Sales in Receivables Index
**DSRI = (Receivables_t / Revenue_t) / (Receivables_t-1 / Revenue_t-1)**
- Large increase → possible revenue inflation

### GMI — Gross Margin Index
**GMI = Gross Margin_t-1 / Gross Margin_t**
- Where Gross Margin = Gross Profit / Revenue
- GMI > 1 means margins deteriorating → pressure to manipulate

### AQI — Asset Quality Index
**AQI = (1 - (CA_t + PPE_t) / TA_t) / (1 - (CA_t-1 + PPE_t-1) / TA_t-1)**
- Measures proportion of assets where future benefit is uncertain

### SGI — Sales Growth Index
**SGI = Revenue_t / Revenue_t-1**
- High growth firms have more incentive and ability to manipulate

### DEPI — Depreciation Index
**DEPI = Dep Rate_t-1 / Dep Rate_t**
- Where Dep Rate = D&A / (D&A + PPE)
- DEPI > 1 means slowing depreciation → inflating earnings

### SGAI — SGA Expense Index
**SGAI = (SGA_t / Revenue_t) / (SGA_t-1 / Revenue_t-1)**
- Disproportionate SGA increases may signal problems

### TATA — Total Accruals to Total Assets
**TATA = (Net Income - OCF) / Total Assets**
- High accruals = lower earnings quality

### LVGI — Leverage Index
**LVGI = Leverage_t / Leverage_t-1**
- Where Leverage = Total Debt / Total Assets
- Increasing leverage = more incentive to manipulate

## Step 3: Calculate M-Score

**M = -4.84 + 0.920×DSRI + 0.528×GMI + 0.404×AQI + 0.892×SGI + 0.115×DEPI - 0.172×SGAI + 4.679×TATA - 0.327×LVGI**

## Step 4: Output Format

Present a structured summary including:
1. **M-Score Result**: The calculated score with interpretation
2. **Component Breakdown Table**: Index, Value, Coefficient, Contribution
3. **Interpretation**:
   - M < -2.22: **Unlikely Manipulator** — Low probability of manipulation
   - -2.22 < M < -1.78: **Grey Zone** — Some indicators warrant attention
   - M > -1.78: **Likely Manipulator** — High probability of earnings manipulation
4. **Red Flag Analysis**: Which indices are most concerning (DSRI > 1.465, TATA > 0.031, AQI > 1.254)
5. **Caveats**: M-Score is a screening tool, not proof of fraud. High-growth companies naturally have higher SGI. Works best for manufacturing/retail; less reliable for financials and tech.
