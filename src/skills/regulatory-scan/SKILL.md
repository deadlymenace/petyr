---
name: regulatory-scan
description: Performs regulatory risk scan / policy change analysis / compliance assessment. Triggers when user asks for regulatory risk, policy changes, compliance risk, government regulation impact, or regulatory environment for a company or sector.
---

# Regulatory Scan Skill

## Workflow Checklist

Copy and track progress:
```
Regulatory Scan Progress:
- [ ] Step 1: Get 10-K risk factors
- [ ] Step 2: Search for recent regulatory news
- [ ] Step 3: Cross-company regulatory scan
- [ ] Step 4: Assess regulatory risk level
```

## Step 1: SEC Filing Risk Factors

Call `read_filings`:
**Query:** `"[TICKER] risk factors from latest 10-K filing"`

This reads Item 1A (Risk Factors) from the most recent annual report.

**Look for:**
- Regulatory and compliance risks mentioned
- Government investigation or enforcement actions
- Pending legislation that could impact the business
- International regulatory requirements
- Industry-specific regulations (FDA, FCC, EPA, etc.)

## Step 2: Recent Regulatory News

Call `web_search` (if available):
**Query:** `"[COMPANY NAME] regulation policy government [current year]"`
**Query:** `"[INDUSTRY] regulation legislation policy changes [current year]"`

**Look for:**
- New laws or regulations affecting the company
- Regulatory investigations or enforcement actions
- Fines or penalties
- Lobbying disclosures or political spending
- Industry-wide regulatory changes

## Step 3: Cross-Company Regulatory Scan

Call `supply_chain_search` (if available):
**Query:** `"regulatory compliance [INDUSTRY] SEC filings recent"`

**Also call** `catalyst_search` (if available):
**Query:** `"[TICKER] regulatory events and material disclosures"`

**Look for:**
- How competitors are discussing similar regulatory risks
- Industry-wide compliance trends
- Regulatory actions against peers that could affect target

## Step 4: Output Format

Present a structured summary including:
1. **Regulatory Risk Level**: Low / Medium / High / Critical
2. **Active Regulatory Issues**: Specific regulations, investigations, or compliance matters
3. **Risk Factor Summary**: Key regulatory risks from 10-K (top 3-5)
4. **Recent Developments**: Policy changes or regulatory actions in the last year
5. **Industry Context**: How regulatory environment compares to peers
6. **Potential Impact**: Revenue impact scenarios if regulations tighten
7. **Monitoring Points**: What to watch for future regulatory developments
8. **Caveats**: Regulatory analysis is inherently forward-looking and uncertain. Risk factors in 10-K filings are comprehensive by design (cover all possibilities). Actual regulatory impact depends on enforcement, which is unpredictable.
