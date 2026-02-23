---
name: working-capital
description: Performs working capital cycle / cash conversion cycle analysis (DSO, DIO, DPO). Triggers when user asks for working capital cycle, cash conversion cycle, DSO DIO DPO analysis, or working capital efficiency.
---

# Working Capital Cycle Skill

## Workflow Checklist

Copy and track progress:
```
Working Capital Cycle Progress:
- [ ] Step 1: Get income + balance sheet data (4 quarters)
- [ ] Step 2: Calculate DSO, DIO, DPO
- [ ] Step 3: Calculate Cash Conversion Cycle
- [ ] Step 4: Trend analysis
```

## Step 1: Gather Financial Data

Call the `financial_search` tool:

### 1.1 Income Statements (quarterly, last 2 years)
**Query:** `"[TICKER] quarterly income statements for the last 2 years"`

**Extract:** `revenue`, `cost_of_revenue`

### 1.2 Balance Sheets (quarterly, last 2 years)
**Query:** `"[TICKER] quarterly balance sheets for the last 2 years"`

**Extract:** `accounts_receivable`, `inventory`, `accounts_payable`

## Step 2: Calculate Components

For each quarter:

### DSO — Days Sales Outstanding
**DSO = (Accounts Receivable / Revenue) × 365**
- Or for quarterly: (AR / Quarterly Revenue) × 91.25
- Measures: How fast the company collects from customers
- Lower is better

### DIO — Days Inventory Outstanding
**DIO = (Inventory / Cost of Revenue) × 365**
- Or for quarterly: (Inventory / Quarterly COGS) × 91.25
- Measures: How fast inventory turns over
- Lower is better (but too low may mean stockouts)

### DPO — Days Payable Outstanding
**DPO = (Accounts Payable / Cost of Revenue) × 365**
- Or for quarterly: (AP / Quarterly COGS) × 91.25
- Measures: How long the company takes to pay suppliers
- Higher is better (means free supplier financing)

## Step 3: Cash Conversion Cycle

**CCC = DSO + DIO - DPO**

- **CCC < 0**: Company gets paid by customers before paying suppliers (excellent, e.g., Amazon)
- **CCC 0-30**: Efficient working capital management
- **CCC 30-60**: Average efficiency
- **CCC > 60**: Significant working capital tied up in operations

## Step 4: Output Format

Present a structured summary including:
1. **Cash Conversion Cycle Trend Table**: Quarter, DSO, DIO, DPO, CCC
2. **Direction**: Is CCC improving (shrinking) or deteriorating (growing)?
3. **Component Analysis**: Which component is driving changes?
4. **Working Capital Requirements**: Estimate of working capital tied up = (CCC / 365) × Annual Revenue
5. **Peer Context**: If possible, note industry-typical CCC range
6. **Caveats**: Seasonal businesses may show volatile CCC; use trailing 4-quarter average for comparison. Negative CCC is not always positive (may indicate delayed payments stressing supplier relationships).
