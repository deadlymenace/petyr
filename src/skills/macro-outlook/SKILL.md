---
name: macro-outlook
description: Provides a comprehensive macroeconomic outlook / economic environment assessment. Triggers when user asks for economic outlook, recession risk, market environment, macro conditions, interest rate outlook, or economic indicators summary.
---

# Macro Outlook Skill

## Workflow Checklist

Copy and track progress:
```
Macro Outlook Progress:
- [ ] Step 1: Fetch all key macro indicators
- [ ] Step 2: Yield curve analysis
- [ ] Step 3: Inflation trajectory
- [ ] Step 4: Employment analysis
- [ ] Step 5: Sector implications
```

## Step 1: Fetch Key Indicators

Call `macro_search`:

**Query:** `"Current snapshot of: fed funds rate, 10-year Treasury, 2-year Treasury, yield curve spread, CPI, unemployment rate, GDP growth, consumer sentiment, VIX"`

This should fetch the latest values for FEDFUNDS, DGS10, DGS2, T10Y2Y, CPIAUCSL, UNRATE, GDP, UMCSENT, VIXCLS.

For historical context, also call:
**Query:** `"FEDFUNDS and CPIAUCSL monthly data for the last 2 years"`

## Step 2: Yield Curve Analysis

Using T10Y2Y (10-year minus 2-year Treasury spread):
- **Spread > 0**: Normal curve — economy expected to grow
- **Spread < 0**: Inverted curve — recession signal (historically leads by 12-18 months)
- **Spread transitioning from negative to positive**: "Un-inversion" — recession may be imminent or just ended

Also note absolute level of 10-year yield (DGS10):
- >5%: Highly restrictive
- 4-5%: Restrictive
- 3-4%: Neutral
- <3%: Accommodative

## Step 3: Inflation Assessment

Using CPI (CPIAUCSL):
- Calculate year-over-year change from data
- **>4% YoY**: High inflation — Fed likely hawkish
- **2-4% YoY**: Moderate — Fed may be neutral or gradually easing
- **<2% YoY**: Low inflation / disinflation — Fed likely dovish

Fed rate vs inflation: Real rate = Fed Funds - CPI
- Positive real rate: Restrictive monetary policy
- Negative real rate: Accommodative monetary policy

## Step 4: Employment Assessment

Using UNRATE:
- **<4%**: Tight labor market — wage pressure, consumer spending strong
- **4-5%**: Normal employment
- **>5%**: Weakening labor market — potential recession indicator
- Trend matters more than level: Rising unemployment is more concerning than stable high employment

## Step 5: Output Format

Present a structured summary including:
1. **Dashboard Table**: Indicator, Current Value, Prior Month/Quarter, Trend Direction
2. **Yield Curve Assessment**: Shape, spread, recession signal status
3. **Inflation Outlook**: Current level, trajectory, Fed policy implications
4. **Employment Health**: Unemployment trend, labor market tightness
5. **Growth Assessment**: GDP trend, consumer sentiment direction
6. **Market Volatility**: VIX level and what it implies
7. **Sector Implications**: Which sectors benefit/suffer in current environment
   - Rising rates: Hurts REITs, utilities, growth stocks; benefits banks
   - High inflation: Hurts consumer discretionary; benefits energy, materials
   - Recession risk: Hurts cyclicals; benefits healthcare, utilities, consumer staples
8. **Forward View**: Key risks and what to watch next
