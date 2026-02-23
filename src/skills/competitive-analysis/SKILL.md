---
name: competitive-analysis
description: Performs competitive analysis / moat assessment / market share and peer comparison. Triggers when user asks for competitive analysis, moat analysis, market share comparison, peer comparison, competitive positioning, or industry analysis for a company.
---

# Competitive Analysis Skill

## Workflow Checklist

Copy and track progress:
```
Competitive Analysis Progress:
- [ ] Step 1: Identify company and segment details
- [ ] Step 2: Map competitors
- [ ] Step 3: Financial comparison
- [ ] Step 4: Moat assessment
- [ ] Step 5: Market share and positioning
```

## Step 1: Company Profile

Call `financial_search`:
**Query:** `"[TICKER] company facts"`
**Query:** `"[TICKER] segmented revenues for the last year"`

**Extract:** `sector`, `industry`, `market_cap`, segment breakdown

## Step 2: Map Competitors

Based on industry classification, identify 3-5 key competitors.

For deeper discovery, call `supply_chain_search` (if available):
**Query:** `"Who are the main competitors of [COMPANY NAME] in [INDUSTRY]?"`

Also call `web_search` (if available):
**Query:** `"[COMPANY NAME] main competitors market share [current year]"`

## Step 3: Financial Comparison

For each competitor (and the target), call `financial_search`:
**Query:** `"[TICKER] financial metrics snapshot"`

**Compare:**
- Revenue and revenue growth
- Gross margin and operating margin
- ROIC and ROE
- P/E ratio and EV/EBITDA (valuation premium/discount)
- Free cash flow yield
- Debt levels (Debt/EBITDA)

## Step 4: Moat Assessment

Evaluate competitive advantages using the 5 moat sources:

### 1. Network Effects
- Does the product become more valuable as more people use it?
- Examples: social networks, marketplaces, payment networks

### 2. Switching Costs
- How difficult/expensive is it for customers to switch?
- Examples: enterprise software, banking relationships, integrated platforms

### 3. Cost Advantages
- Does the company have structural cost advantages?
- Examples: scale economies, proprietary technology, geographic advantage

### 4. Intangible Assets
- Brand power, patents, regulatory licenses
- Examples: luxury brands, pharma patents, banking charters

### 5. Efficient Scale
- Does the company serve a market that's only big enough for a few competitors?
- Examples: railroads, utilities, specialized industrial

**Rate each moat source:** None / Narrow / Wide

## Step 5: Output Format

Present a structured summary including:
1. **Competitive Landscape Table**: Company, Market Cap, Revenue, Growth, Op Margin, P/E
2. **Market Position**: Estimated market share or position ranking
3. **Moat Assessment**: Each moat source rated with evidence
4. **Overall Moat Rating**: None / Narrow / Wide with justification
5. **Competitive Advantages**: Top 3 differentiators for the target company
6. **Competitive Risks**: Top 3 threats from competitors or disruption
7. **Margin Comparison**: Gross and operating margins vs peers (visual data)
8. **Caveats**: Market share estimates may be imprecise. Moat assessment is qualitative and subjective. Industry boundaries can be ambiguous for diversified companies.
