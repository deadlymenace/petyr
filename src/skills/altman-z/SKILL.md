---
name: altman-z
description: Calculates the Altman Z-Score for bankruptcy risk / financial distress assessment. Triggers when user asks for Altman Z-score, bankruptcy risk, financial distress score, or credit risk analysis.
---

# Altman Z-Score Skill

## Workflow Checklist

Copy and track progress:
```
Altman Z-Score Progress:
- [ ] Step 1: Get balance sheet and income statement
- [ ] Step 2: Calculate 5 component ratios
- [ ] Step 3: Calculate Z-Score
- [ ] Step 4: Interpret results
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Balance Sheet
**Query:** `"[TICKER] latest annual balance sheet"`

**Extract:**
- `total_assets`
- `total_current_assets`
- `total_current_liabilities`
- `total_liabilities`
- `retained_earnings`
- `total_equity`

### 1.2 Income Statement
**Query:** `"[TICKER] latest annual income statement"`

**Extract:**
- `revenue` (Sales)
- `operating_income` (proxy for EBIT)
- `ebit` (if available directly)

### 1.3 Financial Metrics
**Query:** `"[TICKER] financial metrics snapshot"`

**Extract:** `market_cap` (Market Value of Equity)

## Step 2: Calculate Component Ratios

**A = Working Capital / Total Assets**
- Working Capital = Total Current Assets - Total Current Liabilities
- Measures short-term liquidity relative to firm size

**B = Retained Earnings / Total Assets**
- Measures cumulative profitability relative to firm size
- Young firms naturally have lower B

**C = EBIT / Total Assets**
- Measures operating efficiency / true productivity of assets
- Most important variable (highest coefficient)

**D = Market Value of Equity / Total Liabilities**
- Market Cap / Total Liabilities
- Market-based measure of solvency

**E = Revenue / Total Assets**
- Asset turnover — measures sales-generating ability of assets

## Step 3: Calculate Z-Score

**Z = 1.2×A + 1.4×B + 3.3×C + 0.6×D + 1.0×E**

## Step 4: Output Format

Present a structured summary including:
1. **Z-Score Result**: The calculated score with interpretation zone
2. **Component Breakdown Table**: Ratio, Value, Weight, Contribution
3. **Interpretation**:
   - Z > 2.99: **Safe Zone** — Low probability of bankruptcy
   - 1.81 < Z < 2.99: **Grey Zone** — Moderate risk, further analysis needed
   - Z < 1.81: **Distress Zone** — High probability of financial distress
4. **Historical Context**: If data available, show Z-Score trend over 2-3 years
5. **Caveats**: Original model designed for manufacturing firms; less reliable for financial firms, utilities, and non-US companies. For private firms, use book value of equity instead of market cap (D ratio) with modified coefficients.
