---
name: channel-checks
description: Performs alternative data channel checks for investment signals. Triggers when user asks for channel checks, alternative data, hiring trends, web traffic trends, app rankings, or non-traditional data signals for a stock.
---

# Channel Checks Skill

## Workflow Checklist

Copy and track progress:
```
Channel Checks Progress:
- [ ] Step 1: Job postings analysis
- [ ] Step 2: Web traffic and app ranking signals
- [ ] Step 3: Patent and innovation activity
- [ ] Step 4: Social media and sentiment signals
- [ ] Step 5: Synthesize alternative data signals
```

## Step 1: Job Postings Analysis

Call `web_search`:
**Query:** `"[COMPANY NAME] job openings hiring [current year]"`

**Assess:**
- Volume of open roles vs historical (expanding or contracting?)
- Types of roles: Engineering heavy = product investment; Sales heavy = growth push; Cuts in G&A = cost optimization
- New role types that signal strategic direction (e.g., AI/ML roles, new geography)
- Layoff announcements vs actual hiring activity

## Step 2: Web Traffic & App Rankings

Call `web_search`:
**Query:** `"[COMPANY NAME] web traffic trends [current year]"`
**Query:** `"[COMPANY NAME] app store ranking downloads [current year]"`

**Assess:**
- Website traffic trend (growing, flat, declining)
- App store rankings for consumer-facing companies
- New product launches visible in web presence
- Compare to competitors' traffic trends if available

## Step 3: Patent & Innovation Activity

Call `web_search`:
**Query:** `"[COMPANY NAME] patents filed [current year] innovation"`

**Assess:**
- Volume of recent patent filings (proxy for R&D activity)
- Patent areas (what technologies are they investing in?)
- Patent grants vs applications
- Compare to competitor patent activity

## Step 4: Social Media & Sentiment

Call `web_search`:
**Query:** `"[COMPANY NAME] [TICKER] investor sentiment analysis [current year]"`

**Assess:**
- General sentiment trend (positive/negative/neutral)
- Customer satisfaction signals (reviews, complaints)
- Glassdoor employee sentiment (leading indicator of talent retention)
- Social media mentions trend

## Step 5: Output Format

Present a structured summary including:
1. **Signal Dashboard**: Data Point, Current Signal, Direction, Confidence
2. **Hiring Momentum**: Expanding / Stable / Contracting + strategic implications
3. **Digital Presence**: Traffic/app trends and what they imply for revenue
4. **Innovation Pipeline**: Patent activity and R&D signals
5. **Sentiment**: Customer and employee sentiment direction
6. **Overall Signal**: Bullish / Neutral / Bearish based on alternative data
7. **Caveats**: Alternative data is noisy and requires large-scale analysis for reliable signals. Web search results provide directional indicators, not precise measurements. Hiring plans can change quickly. Data may lag actual business conditions.
