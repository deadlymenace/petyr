# Petyr Enterprise Platform — Product & Business Plan

## Vision

Petyr becomes the **AI-powered financial research infrastructure** that enterprises plug into their operations. Any finance team — hedge fund, bank, wealth manager, fintech, PE firm, or corporate treasury — can deploy Petyr as their research analyst, customized to their markets, compliance needs, and workflows. Accessible from web, API, Slack, WhatsApp, Telegram, or embedded in their own products.

---

## Table of Contents

1. [Product Architecture](#1-product-architecture)
2. [Pricing & Monetization](#2-pricing--monetization)
3. [Enterprise Features](#3-enterprise-features)
4. [Local Market Expansion](#4-local-market-expansion)
5. [Messaging & Channel Integrations](#5-messaging--channel-integrations)
6. [Intelligence & Differentiation](#6-intelligence--differentiation)
7. [Distribution & Integrations](#7-distribution--integrations)
8. [Infrastructure & Compliance](#8-infrastructure--compliance)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Revenue Projections](#10-revenue-projections)

---

## 1. Product Architecture

### Current State (v2)
```
User → Web UI / CLI → Agent (LangChain) → Tools → Data APIs
                                        → Skills → LLM Analysis
```

### Enterprise Target State
```
                    ┌─── Web Dashboard ───┐
                    ├─── REST API ────────┤
                    ├─── WhatsApp Bot ────┤
Enterprise User ──→ ├─── Telegram Bot ────┤ ──→ API Gateway ──→ Auth + Rate Limiting
                    ├─── Slack Bot ───────┤         │
                    ├─── Teams Bot ───────┤         ▼
                    ├─── Excel Plugin ────┤    Petyr Core Engine
                    └─── Embedded Widget ─┘         │
                                                    ├── Tool Registry (per-tenant config)
                                                    ├── Market Data Router (region-aware)
                                                    ├── Skill Engine
                                                    ├── Compliance Logger
                                                    └── Report Generator
                                                         │
                                              ┌──────────┴──────────┐
                                              ▼                     ▼
                                        Global Data APIs      Client Custom Feeds
                                        (US, EU, APAC)        (local exchanges,
                                                               proprietary data)
```

### Core Components to Build

| Component | Purpose | Priority |
|-----------|---------|----------|
| API Gateway | REST API with auth, rate limiting, metering | P0 |
| Multi-Tenant Engine | Isolated workspaces, configs, data per enterprise | P0 |
| Auth Service | SSO (SAML/OIDC), API keys, role-based access | P0 |
| Market Data Router | Routes queries to region-specific data providers | P1 |
| Channel Adapters | WhatsApp, Telegram, Slack, Teams connectors | P1 |
| Usage Metering | Track queries, tool calls, tokens for billing | P0 |
| Admin Dashboard | Enterprise self-service: users, billing, settings | P1 |
| Compliance Logger | Immutable audit log of every interaction | P1 |

---

## 2. Pricing & Monetization

### Tier Structure

| Tier | Target | Price | Includes |
|------|--------|-------|----------|
| **Starter** | Individual analysts, small funds | $99/mo | 500 queries/mo, 1 user, US markets, web + API |
| **Professional** | Small teams, RIAs, family offices | $499/mo | 5,000 queries/mo, 5 users, US + 1 additional market, all channels |
| **Business** | Mid-size funds, banks, fintechs | $2,499/mo | 25,000 queries/mo, 25 users, 5 markets, white-label, priority support |
| **Enterprise** | Large institutions | Custom | Unlimited queries, unlimited users, all markets, on-prem option, dedicated support, SLA |

### Add-On Revenue Streams

| Add-On | Price | Description |
|--------|-------|-------------|
| Additional Market | $199/mo each | JSE, LSE, TSX, NSE, ASX, TSE, HKEX, etc. |
| Custom Data Feed Integration | $999 one-time + $299/mo | Connect client's proprietary data sources |
| White-Label / Embedded Widget | $999/mo | Remove Petyr branding, embed in client's product |
| Messaging Channels | $99/mo per channel | WhatsApp, Telegram, Slack, Teams |
| Scheduled Reports | $199/mo | Daily briefings, weekly digests, earnings alerts |
| On-Premise Deployment | $9,999/mo | Self-hosted in client's infrastructure |
| API Overage | $0.02/query | Beyond plan limits |

### Revenue Model Math
- 50 Starter clients = $4,950/mo
- 20 Professional clients = $9,980/mo
- 10 Business clients = $24,990/mo
- 3 Enterprise clients = ~$30,000/mo (est.)
- Add-ons across all = ~$15,000/mo
- **Year 1 target: $85K/mo = ~$1M ARR**

---

## 3. Enterprise Features

### 3.1 Multi-Tenant Workspaces

Each enterprise gets an isolated workspace:
- Own tool configuration (which markets, which data feeds)
- Own watchlists, reports, research history
- Own user management and roles
- Own billing and usage dashboard
- Own branding (white-label tier)

```
Workspace: "Meridian Capital"
├── Users: 12 analysts, 3 PMs, 1 admin
├── Markets: US, UK, South Africa
├── Custom Feeds: Bloomberg Terminal (connected)
├── Watchlists: 4 shared lists
├── Reports: 89 generated this month
├── Queries: 4,231 / 5,000 used
└── Channels: Slack (#research), WhatsApp (PM group)
```

### 3.2 Role-Based Access Control

| Role | Permissions |
|------|------------|
| Admin | Manage users, billing, settings, data feeds, view all logs |
| Portfolio Manager | Full tool access, approve reports, manage watchlists |
| Analyst | Full tool access, create reports, personal watchlists |
| Viewer | Read-only: view reports, watchlists, research history |
| API-Only | Programmatic access only, no UI |

### 3.3 Audit & Compliance Trail

Every interaction logged immutably:
```json
{
  "timestamp": "2026-04-02T14:23:01Z",
  "workspace": "meridian-capital",
  "user": "jane.doe@meridian.com",
  "channel": "slack",
  "query": "Run a DCF on AAPL with 10% discount rate",
  "tools_used": ["financial_metrics", "financial_search"],
  "skills_used": ["dcf-valuation"],
  "tokens_consumed": 4230,
  "response_time_ms": 8400,
  "result_hash": "sha256:abc123..."
}
```

Exportable as CSV/JSON for regulatory audits (MiFID II, SEC, FSA compliance).

### 3.4 Team Collaboration

- **Shared Watchlists** — team-wide stock tracking with real-time snapshots
- **Shared Reports** — research reports visible to the team, with comments
- **Research Threads** — persistent conversation threads tied to a ticker or thesis
- **@mentions** — tag team members in research findings
- **Handoff** — "Continue this analysis" passes full context to another analyst

---

## 4. Local Market Expansion

### Market Data Architecture

```
Market Data Router
├── US (default) ─── Financial Datasets API, SEC EDGAR, FRED
├── UK ──────────── LSE data, Companies House, Bank of England
├── South Africa ── JSE data, SENS announcements, SARB
├── Canada ──────── TSX data, SEDAR filings, Bank of Canada
├── India ─────────── NSE/BSE data, SEBI filings, RBI
├── Australia ────── ASX data, ASIC filings, RBA
├── Japan ─────────── TSE data, EDINET filings, BOJ
├── Hong Kong ────── HKEX data, SFC filings, HKMA
├── Nigeria ────────── NGX data, SEC Nigeria, CBN
├── EU ──────────── Euronext, Deutsche Borse, BaFin
└── Custom ──────── Client-provided API endpoint
```

### Per-Market Module Structure

Each market module includes:
1. **Price Data Provider** — real-time and historical prices
2. **Filing Provider** — regulatory filings in local format
3. **Macro Provider** — central bank data, local economic indicators
4. **News Provider** — local financial news sources
5. **Exchange-Specific Tools** — e.g., SENS for JSE, RNS for LSE

### How Enterprises Add Their Market

Self-service via Admin Dashboard:
1. Select from supported markets OR provide custom API endpoint
2. Configure authentication (API key, OAuth, etc.)
3. Map data fields to Petyr's standard schema
4. Test with sample queries
5. Activate for their workspace

### Custom Data Feed Integration

For enterprises with proprietary data:
- Bloomberg Terminal connector
- Refinitiv/LSEG connector
- FactSet connector
- Custom REST/GraphQL API adapter
- CSV/Excel file upload (periodic)
- Database connector (PostgreSQL, SQL Server)

---

## 5. Messaging & Channel Integrations

### 5.1 WhatsApp Business

**How it works:**
```
User sends WhatsApp message
    → Meta Cloud API webhook
    → Petyr Channel Adapter
    → Auth (verify phone → workspace)
    → runAgentForMessage()
    → Response sent back via WhatsApp API
```

**Features:**
- Text queries → full research responses
- Voice notes → transcribed (Whisper API) → analyzed → text response
- Send voice response back (TTS)
- Image responses (charts, tables rendered as images)
- Document sharing (PDF reports sent as attachments)
- Group chats — Petyr responds when tagged (@Petyr)
- Quick reply buttons for common actions

**Setup:** Enterprise registers their WhatsApp Business number, connects to Petyr via Meta Business API credentials.

**Pricing:** Meta charges ~$0.005-0.08 per conversation (varies by region). Petyr charges $99/mo for the channel.

### 5.2 Telegram Bot

**How it works:**
```
User sends Telegram message
    → Telegram Bot API webhook
    → Petyr Channel Adapter
    → Auth (verify Telegram ID → workspace)
    → runAgentForMessage()
    → Response via Telegram API (supports markdown natively)
```

**Features:**
- Full markdown support (tables, bold, code blocks render natively)
- Inline keyboards for actions (Add to Watchlist, Run DCF, Export Report)
- /commands: /sentiment AAPL, /dcf MSFT, /watchlist, /report
- Group support — works in team channels
- File sharing (PDF reports, CSV exports)
- Callback queries for interactive flows

**Setup:** Enterprise creates Telegram bot via @BotFather, provides token to Petyr.

**Pricing:** Telegram API is free. Petyr charges $99/mo for the channel.

### 5.3 Slack

**How it works:**
```
User sends message in #research channel or DMs @Petyr
    → Slack Events API
    → Petyr Channel Adapter
    → Auth (workspace OAuth)
    → runAgentForMessage()
    → Response posted as threaded reply with Block Kit formatting
```

**Features:**
- Threaded conversations — keeps channels clean
- Block Kit rich formatting (tables, charts, buttons)
- Slash commands: /petyr sentiment AAPL
- Scheduled messages: daily pre-market briefing at 7am
- Interactive modals: research configuration forms
- App Home tab: dashboard with watchlist, recent research

**Setup:** Enterprise installs Petyr Slack app via OAuth.

### 5.4 Microsoft Teams

**How it works:**
```
User messages Petyr bot in Teams
    → Bot Framework webhook
    → Petyr Channel Adapter
    → Auth (Azure AD SSO)
    → runAgentForMessage()
    → Response via Adaptive Cards
```

**Features:**
- Adaptive Cards for rich responses (tables, charts, actions)
- Tab integration: embed Petyr dashboard in Teams
- Meeting integration: "Petyr, pull up the NVDA analysis" during calls
- Connector: push alerts to channels

**Setup:** Enterprise deploys via Teams Admin Center or Azure.

### 5.5 Discord (Bonus — for crypto/retail communities)

- Bot commands in servers
- Thread-based research
- Role-based access (only @Analysts can use advanced tools)

### 5.6 Channel Adapter Architecture

```typescript
// All channels implement the same interface
interface ChannelAdapter {
  name: string;
  parseIncoming(payload: unknown): ChannelMessage;
  formatResponse(agentResponse: AgentEvent[], channel: ChannelMessage): unknown;
  send(response: unknown): Promise<void>;
}

// Unified message format
interface ChannelMessage {
  workspaceId: string;
  userId: string;
  channel: 'whatsapp' | 'telegram' | 'slack' | 'teams' | 'discord' | 'web' | 'api';
  query: string;
  attachments?: Buffer[];  // voice notes, images
  replyTo?: string;        // thread/conversation ID
}
```

Every channel funnels into the same `runAgentForMessage()` — the core engine doesn't care where the message came from. This means **every new feature automatically works across all channels**.

---

## 6. Intelligence & Differentiation

### 6.1 Petyr Score (Proprietary Composite Rating)

A single 0-100 score combining:
- **Fundamental (40%)** — Piotroski, Altman Z, ROE, margins, growth
- **Sentiment (25%)** — News + social sentiment score
- **Technical (20%)** — Momentum, relative strength, support/resistance
- **Risk (15%)** — Beta, volatility, debt levels, Beneish M-Score

```
AAPL Petyr Score: 78/100
├── Fundamental: 84 (strong margins, growing revenue)
├── Sentiment: 71 (mixed news, bullish social)
├── Technical: 76 (above 200MA, near resistance)
└── Risk: 82 (low debt, no manipulation flags)
```

This becomes the **signature feature** — enterprises pay for the score alone.

### 6.2 Alert System

```
Alerts:
- "Notify me when NVDA Petyr Score drops below 60"
- "Alert if any watchlist stock sentiment flips bearish"
- "Weekly email: top 10 stocks by Petyr Score in my markets"
- "Earnings alert: notify 1 day before any watchlist stock reports"
- "Macro alert: notify when Fed rate decision is released"
```

Delivered via any connected channel (email, Slack, WhatsApp, Telegram, webhook).

### 6.3 Research Memory

Petyr remembers past analyses per workspace:
- "Last time you asked about AAPL (March 15): sentiment was bullish 0.7, DCF fair value was $285. Today: sentiment is bearish -0.3, DCF fair value is $260. Significant deterioration in 3 weeks."
- Trend tracking: "NVDA Petyr Score has declined from 88 to 72 over the past month"
- Thesis tracking: "Your bull thesis from February is being challenged by these developments..."

### 6.4 Natural Language Dashboards

"Show me my portfolio's risk exposure" → Petyr generates:
- Asset allocation pie chart
- Sector concentration heat map
- Correlation matrix
- VaR analysis
- Petyr Score distribution

Rendered as images (for messaging channels) or interactive web charts (for dashboard).

### 6.5 Scenario Analysis Engine

"What happens to my portfolio if rates rise 100bps?"
- Re-runs DCF models with higher discount rate
- Checks sector sensitivity to rates
- Estimates portfolio impact
- Suggests hedging positions

---

## 7. Distribution & Integrations

### 7.1 REST API (Primary Distribution)

```
POST /v1/query
Authorization: Bearer pk_live_xxx

{
  "query": "Run a DCF on AAPL with 10% discount rate",
  "tools": ["financial_search", "financial_metrics"],
  "skills": ["dcf-valuation"],
  "stream": true
}

→ SSE stream of AgentEvents
→ Final response with tool calls, analysis, and Petyr Score
```

Endpoints:
- `POST /v1/query` — run research query
- `GET /v1/watchlist` — manage watchlists
- `POST /v1/report` — generate report
- `GET /v1/score/:ticker` — get Petyr Score
- `GET /v1/alerts` — manage alerts
- `GET /v1/usage` — usage and billing
- `WebSocket /v1/stream` — real-time data feed

### 7.2 Excel / Google Sheets Plugin

```
=PETYR("AAPL", "petyr_score")          → 78
=PETYR("AAPL", "sentiment")            → 0.71
=PETYR("AAPL", "dcf_fair_value")       → $285.40
=PETYR("AAPL,MSFT,NVDA", "compare")    → comparison table
=PETYR_SCREEN("tech", "pe < 25")       → filtered list
```

Analysts live in spreadsheets. This is the fastest path to adoption.

### 7.3 Embedded Widget (White-Label)

```html
<script src="https://cdn.petyr.ai/widget.js"></script>
<petyr-widget
  api-key="pk_live_xxx"
  theme="dark"
  position="bottom-right"
  branding="false"
/>
```

Fintechs embed Petyr in their own platforms. Users see a chat bubble with the fintech's branding.

### 7.4 Mobile App

- iOS + Android (React Native)
- Voice input: "Hey Petyr, what's the sentiment on Tesla?"
- Push notification alerts
- Swipe-through research cards
- Quick actions: watchlist snapshot, Petyr Score check

---

## 8. Infrastructure & Compliance

### 8.1 Deployment Options

| Option | For | Infrastructure |
|--------|-----|---------------|
| Cloud (Multi-Tenant) | Starter, Pro, Business | Petyr-hosted, AWS/GCP |
| Dedicated Cloud | Enterprise | Single-tenant, client's preferred region |
| On-Premise | Enterprise (regulated) | Docker/Kubernetes in client's data center |
| Hybrid | Enterprise | Core on-prem, market data from cloud |

### 8.2 Data Residency

Enterprise clients choose where their data lives:
- US (Virginia, Oregon)
- EU (Frankfurt, Dublin) — GDPR compliant
- UK (London) — FCA compliant
- APAC (Singapore, Tokyo, Sydney)
- Africa (Cape Town, Johannesburg)
- Custom region on request

### 8.3 Security

- SOC 2 Type II certification (target)
- End-to-end encryption (TLS 1.3 in transit, AES-256 at rest)
- API key rotation and scoping
- IP allowlisting for enterprise
- SSO via SAML 2.0 / OIDC (Okta, Azure AD, Google Workspace)
- MFA enforcement
- Penetration testing (annual)

### 8.4 Regulatory Compliance

| Regulation | Region | How Petyr Complies |
|-----------|--------|-------------------|
| MiFID II | EU | Full audit trail, best execution logging |
| SEC Rule 17a-4 | US | Immutable communication records |
| GDPR | EU | Data residency, right to deletion, consent management |
| POPIA | South Africa | Data processing agreements, consent tracking |
| FCA | UK | Audit logging, data retention policies |
| SOX | US | Access controls, change management logs |

### 8.5 Uptime & SLA

| Tier | SLA | Support |
|------|-----|---------|
| Starter | 99.5% | Email (48h response) |
| Professional | 99.9% | Email + chat (24h response) |
| Business | 99.95% | Priority chat (4h response) |
| Enterprise | 99.99% | Dedicated CSM, phone, 1h response |

---

## 9. Implementation Roadmap

### Phase 1 — Foundation (Months 1-3)
**Goal: Sellable product with API + web**

- [ ] REST API with authentication (API keys + JWT)
- [ ] Usage metering and rate limiting
- [ ] Multi-tenant workspace isolation
- [ ] Admin dashboard (user management, billing, settings)
- [ ] Stripe integration for subscription billing
- [ ] Petyr Score v1 (composite rating)
- [ ] Hosted web dashboard per workspace
- [ ] Basic alert system (email)

**Milestone: First paying Starter/Pro customers**

### Phase 2 — Channels (Months 3-5)
**Goal: Meet enterprises where they work**

- [ ] Telegram Bot adapter
- [ ] Slack app (Events API + Block Kit)
- [ ] WhatsApp Business adapter
- [ ] Microsoft Teams bot
- [ ] Channel-agnostic message routing
- [ ] Voice note transcription (Whisper)
- [ ] Image rendering for chart/table responses

**Milestone: Enterprises using Petyr from Slack/WhatsApp daily**

### Phase 3 — Markets (Months 4-7)
**Goal: Global market coverage**

- [ ] Market Data Router architecture
- [ ] UK market module (LSE, Companies House, BoE)
- [ ] South Africa module (JSE, SENS, SARB)
- [ ] Canada module (TSX, SEDAR, BoC)
- [ ] India module (NSE/BSE, SEBI, RBI)
- [ ] Australia module (ASX, ASIC, RBA)
- [ ] Custom market API adapter (self-service)
- [ ] Currency/forex support
- [ ] Commodity data feeds

**Milestone: 10+ markets supported, first non-US enterprise client**

### Phase 4 — Enterprise (Months 6-9)
**Goal: Enterprise-grade platform**

- [ ] SSO (SAML 2.0 / OIDC)
- [ ] Role-based access control
- [ ] Compliance audit trail (immutable logging)
- [ ] Custom data feed connectors (Bloomberg, Refinitiv, FactSet)
- [ ] White-label / embedded widget
- [ ] On-premise deployment option (Docker/K8s)
- [ ] Data residency selection
- [ ] Team collaboration (shared watchlists, reports, threads)
- [ ] Research memory (per-workspace history)

**Milestone: First Enterprise-tier client signed**

### Phase 5 — Intelligence (Months 8-12)
**Goal: Differentiated AI capabilities**

- [ ] Petyr Score v2 (backtested, refined weights)
- [ ] Advanced alert system (multi-condition, cross-channel)
- [ ] Scenario analysis engine
- [ ] Natural language dashboards
- [ ] Excel / Google Sheets plugin
- [ ] Mobile app (iOS + Android)
- [ ] PE/VC tools (LBO model, deal sourcing)
- [ ] Credit analysis tools
- [ ] Portfolio construction optimizer

**Milestone: $1M ARR**

### Phase 6 — Scale (Months 12-18)
**Goal: Market leadership**

- [ ] SOC 2 Type II certification
- [ ] Marketplace for third-party tools/skills
- [ ] Partner program (consultants, integrators)
- [ ] Dedicated enterprise sales team
- [ ] Developer documentation and SDK
- [ ] Community edition (open-source core)
- [ ] AI model fine-tuning on financial data
- [ ] Expand to 25+ markets

**Milestone: $5M ARR, 100+ enterprise clients**

---

## 10. Revenue Projections

### Year 1 Targets

| Quarter | Starter | Pro | Business | Enterprise | MRR |
|---------|---------|-----|----------|-----------|-----|
| Q1 | 20 | 5 | 1 | 0 | $5,475 |
| Q2 | 50 | 15 | 3 | 1 | $20,920 |
| Q3 | 100 | 30 | 8 | 2 | $49,870 |
| Q4 | 150 | 50 | 15 | 3 | $89,600 |

Add-on revenue (markets, channels, white-label): ~20% on top.

**Year 1 ARR: ~$1.1M**
**Year 2 Target: ~$5M ARR** (enterprise growth + market expansion)
**Year 3 Target: ~$15M ARR** (scale + partnerships)

### Key Metrics to Track

- Monthly Recurring Revenue (MRR)
- Queries per user per day (engagement)
- Tool calls per query (depth of usage)
- Channel distribution (web vs API vs messaging)
- Market distribution (US vs international)
- Churn rate (target < 5% monthly)
- Net Revenue Retention (target > 120%)
- Time to first value (how fast a new client runs their first query)

---

## Competitive Positioning

| Competitor | What They Do | Petyr's Advantage |
|-----------|-------------|-------------------|
| Bloomberg Terminal | $24K/yr, desktop only | 10x cheaper, AI-native, any channel |
| Koyfin | Charts and data | Petyr reasons and analyzes, not just displays |
| AlphaSense | Document search | Petyr does search + analysis + modeling |
| Tegus | Expert interviews | Petyr is instant, 24/7, multi-source |
| ChatGPT/Claude | General AI | Petyr has financial tools, market data, compliance |
| Daloopa | Data extraction | Petyr is end-to-end: data → analysis → recommendation |

**Petyr's moat:** Specialized financial tooling + multi-channel delivery + local market customization + enterprise compliance. No one else offers AI research across WhatsApp, Slack, Telegram, web, API, and Excel with per-market data feeds and audit trails.

---

*Last updated: April 2026*
*Status: Phase 1 in progress*
