---
name: magic-formula
description: Implements Greenblatt's Magic Formula ranking (earnings yield + ROIC). Triggers when user asks for magic formula, Greenblatt ranking, earnings yield + ROIC screening, or best value stocks by magic formula.
---

# Magic Formula Skill

## Workflow Checklist

Copy and track progress:
```
Magic Formula Progress:
- [ ] Step 1: Define universe of stocks
- [ ] Step 2: Get financial data for each stock
- [ ] Step 3: Calculate earnings yield and ROIC
- [ ] Step 4: Rank each metric separately
- [ ] Step 5: Sum ranks and present top stocks
```

## Step 1: Define Universe

Ask the user for a sector or use a default universe. The Magic Formula works best with:
- Market cap > $50M (exclude micro-caps)
- Exclude financials and utilities (different capital structures)
- Focus on a single sector for more meaningful comparison

If the user specifies a sector, identify 15-20 stocks in that sector.
If no sector specified, use a broad universe of well-known large-caps across sectors.

## Step 2: Get Financial Data

For each stock in the universe, call `financial_search`:

**Query:** `"[TICKER] financial metrics snapshot"`

**Extract:**
- `enterprise_value`
- `operating_income` or `ebit`
- `market_cap`
- `total_assets`, `total_current_assets`, `total_current_liabilities`
- `property_plant_and_equipment`

If `operating_income` is not directly available, get it from income statements.

## Step 3: Calculate Two Key Metrics

### Earnings Yield
**Earnings Yield = EBIT / Enterprise Value**
- Inverse of EV/EBIT multiple
- Higher is better (cheaper stock)

### Return on Invested Capital (ROIC)
**ROIC = EBIT / (Net Working Capital + Net Fixed Assets)**
- Net Working Capital = Current Assets - Current Liabilities
- Net Fixed Assets = PP&E (property, plant & equipment)
- Higher is better (more efficient business)

**Exclude from ranking if:**
- Negative EBIT (unprofitable)
- Negative invested capital (financial firms)

## Step 4: Rank Each Metric

1. **Rank by Earnings Yield**: Highest yield = Rank 1
2. **Rank by ROIC**: Highest ROIC = Rank 1
3. **Combined Rank**: Sum of both ranks (lowest combined rank = best)

## Step 5: Output Format

Present a structured summary including:
1. **Top 10-20 Magic Formula Stocks Table**: Rank, Ticker, Earnings Yield, EY Rank, ROIC, ROIC Rank, Combined Rank
2. **Why It Works**: Briefly explain — buying good companies (high ROIC) at cheap prices (high earnings yield)
3. **Sector Distribution**: How the top stocks distribute across sectors
4. **Caveats**:
   - Greenblatt recommends buying top 20-30 stocks and holding for 1 year
   - Works best as systematic strategy, not individual stock picks
   - Past performance doesn't guarantee future results
   - Excludes qualitative factors (management quality, competitive moat)
