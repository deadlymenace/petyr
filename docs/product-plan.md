# Petyr — Know Before You Invest
## Product & Technical Plan

*Supersedes [`docs/archive/enterprise-plan-2026.md`](archive/enterprise-plan-2026.md). Last updated: October 2026. Status: Phase 0 in progress — waitlist site live.*

> **Changelog — October 2026: from equities to all tokenized assets.** Petyr's scope widens from US equities (with tokenized equities as an execution afterthought) to being the AI companion and home for **all tokenized real-world assets** — tokenized equities, treasuries/money-market funds, gold and commodities, real estate, private credit and funds — plus crypto majors. The crypto-native global investor becomes the primary persona (US users: research-only); the tokenized on-chain rail (§5 Option B) becomes the recommended lead rail; a proposed tokenized-asset skill/card family and verdicts are added (§4); compliance review moves earlier (§9); the roadmap phases tokenized coverage in read-only first (§10). The 23 equity skills and the agent core are unchanged.

---

## Table of Contents

1. [Vision & Positioning](#1-vision--positioning)
2. [Who It's For](#2-who-its-for)
3. [UX Pillars — The Mockups Are the Spec](#3-ux-pillars--the-mockups-are-the-spec)
4. [Feature Specification](#4-feature-specification)
5. [Execution Rails (PROPOSED — decision pending)](#5-execution-rails-proposed--decision-pending)
6. [Autonomous Research Engine](#6-autonomous-research-engine)
7. [Architecture](#7-architecture)
8. [Monetization](#8-monetization)
9. [Compliance & Trust](#9-compliance--trust)
10. [Roadmap](#10-roadmap)
11. [Metrics](#11-metrics)
12. [Competitive Positioning](#12-competitive-positioning)

---

## 1. Vision & Positioning

Petyr is an **everyday AI companion and the home for tokenized real-world assets** — the same institutional-grade research stack (23 analysis skills, 19 tools) once pitched at hedge funds, now delivered as plain-English verdicts in your pocket, across every asset that is moving on-chain:

- **Tokenized equities** — xStocks / Backed and similar wrappers of listed shares
- **Tokenized treasuries & money-market funds** — e.g. BlackRock BUIDL, Ondo OUSG and USDY, Franklin Templeton BENJI
- **Tokenized gold & commodities** — e.g. PAXG, XAUT
- **Tokenized real estate, private credit and funds**
- **Crypto majors** — SOL, BTC, ETH and peers, as the base layer users already hold

Tokenization is putting these assets a wallet away from anyone, but the hard questions — *what actually backs this token, can I redeem it, why does it trade below its NAV, who can legally hold it* — are rarely answered in plain English. Petyr answers them before you buy.

**Tagline: "Know before you invest."**

Most people don't lose money in the market because it's hard. They lose it because nobody explained what was actually happening. Petyr reads the filing — or the attestation report — models the outcome, and explains the risk — in plain English, before you ever place a trade.

### The pivot

The enterprise plan (hedge funds, banks, $99–$2,499/mo workspaces) is retired. What carries over and what doesn't:

| Carries over unchanged | Dropped |
|---|---|
| Agent core (`src/agent/*`) | Multi-tenant enterprise workspaces |
| All 19 tools, all 23 skills | RBAC roles, SSO (SAML/OIDC) |
| Multi-provider LLM layer | Per-market regional data modules |
| WhatsApp gateway + channel abstraction | Slack / Teams / Excel integrations |
| PDF report generation | White-label / embedded widget |
| CLI (as dev harness) | Compliance-trail-as-product |

### The three pillars

Every roadmap milestone references one of these:

- **P1 — Bite-Sized Institutional Analysis.** Same rigor, radically simpler delivery: verdicts, cards, and chips instead of walls of text. Progressive disclosure — verdict → snapshot → full reasoning.
- **P2 — Act On It.** Direct in-app investing in tokenized assets from Petyr theses. *(Execution rail decision pending, recommended direction: tokenized on-chain, Solana-first — see §5.)*
- **P3 — Petyr Works While You Sleep.** Autonomous portfolio research for every user: scheduled and event-triggered briefs, pushed to your phone.

### Brand

Gold `#E6B860` / `#F3D08A` on near-black `#07080B`. Plus Jakarta Sans (UI) + JetBrains Mono (numbers, eyebrows). The golden bird mascot (`src/web/public/bird.svg`). Domain **petyr.ai**, handle **@PetyrAI**. Voice: a companion, not a terminal — confident, plain-spoken, never breathless.

---

## 2. Who It's For

### The Crypto-Native Global Investor *(primary persona · execution-revenue user)*
Non-US, has a wallet, holds SOL and stablecoins, and no practical access to US brokerages. Understands self-custody, doesn't understand discounted cash flow — or why a tokenized treasury yields what it does, or whether a gold token is actually backed by bars in a vault. **Week 1:** connects (or creates) a wallet, asks "Is USDY a safe place to park stablecoins?" and gets a backing-and-redemption card; researches tokenized NVDA with the same verdict cards as the stock; and — once the tokenized rail ships (§5, Option B) — acts on a thesis without leaving the app. Petyr's job: **research + access, across every tokenized asset.**

### The Curious Beginner *(free tier)*
Has a Robinhood account and five positions picked from headlines. Has never opened a 10-K and never will. **Week 1 with Petyr:** asks "Is NVDA overvalued?" and gets a verdict card with three stat tiles and one sentence of *why* — the first time anyone has explained a valuation to them. Adds three tickers to the watchlist. Petyr's job: **translate.**

### The Busy Holder *(core subscriber)*
Five to fifteen positions — stocks, a stablecoin yield position, maybe some tokenized gold — checks the portfolio monthly, has missed two earnings calls they meant to read about. **Week 1:** links their watchlist, wakes up to a morning brief — "TSLA reports tomorrow; here's what matters in 3 bullets." Petyr's job: **watch the portfolio and push what changed.**

### US users *(research-only)*
Many tokenized RWAs exclude US persons (§9). US users get the full research product — equity verdicts, tokenized-asset cards, briefs — but no tokenized execution surfaces. An optional brokerage link (§5 Option A) may later give them portfolio awareness on what they already own.

### Anti-persona
Day traders, yield farmers chasing APY, and professionals. Petyr does not do real-time signals, leverage/perps, order-book analysis, or terminal workflows. Saying no to this keeps scope honest and the product calm.

---

## 3. UX Pillars — The Mockups Are the Spec

The App Store mockups (`Petyr App test/preview/screenshots/`, generated by `slides.html`) are the canonical v1 screen list. The public landing page (`src/web/public/index.html`) already ships this design language.

### 3.1 Watchlist — "Every holding, a verdict"
Asset rows (tickers and tokens): price, day delta, and a **Petyr Verdict** phrase — "Fairly valued", "Quality hold", "Priced for perfection", "Undervalued · defensive" — and for tokenized assets, "Trades at a discount", "Backing verified · yield-bearing", "Backing unverified". Below the list, the **macro strip**: "Fed funds 4.50% · 10Y 4.18% · CPI 2.9%. *Rates still restrictive* — favors cash-flow over story stocks." (FRED-backed, refreshed daily.)

**Tap-through = progressive disclosure, three depths:**
1. **Verdict** — the phrase + confidence, on the row.
2. **Snapshot** — the card: method badge, 3 stat tiles, sparkline, one-sentence read.
3. **Full reasoning** — the complete agent analysis, sourced and timestamped.

### 3.2 Ask Petyr — the answer is a card, not prose
"Is NVDA overvalued at these levels?" returns:
- Method badge: `Petyr · DCF + multiples`
- One-sentence read: "Priced for near-perfection — but the growth still backs it."
- Stat tiles: `Fwd P/E 31.4×` · `Rev growth +94%` · `Fair val $142`
- Sparkline (server-computed price series — never LLM-generated numbers)
- Verdict badge: `FAIRLY VALUED` — "~8% above my base-case DCF"

The same pattern for a token — "Is PAXG actually backed?" returns: method badge `Petyr · backing + liquidity`, tiles `Premium to spot` · `Last attestation (date)` · `DEX depth at ±2%` (illustrative — values always tool-sourced), verdict `BACKING VERIFIED` (proposed, §4.3). Numbers come from tools, never the model.

Prose is the *expansion*, never the default. The chat can still go deep — depth 3 is always one tap away.

### 3.3 Filings, Decoded
Any 10-K/10-Q/8-K → exactly **3 plain-English bullets** + **risk chips** ("China exposure", "Regulatory · DMA", "Hardware cyclicality") + **"Petyr's read"** — one plain-English paragraph: "A cash machine leaning on services. The story is durability, not explosive growth."

### 3.3b Tokens, Decoded *(proposed)*
The filings pattern applied to issuer documents: attestation reports, fund prospectuses/offering memoranda, token terms → **3 bullets** + **risk chips** ("US persons excluded", "Accredited only", "T+1 redemption", "Single custodian", "Bridged · Wormhole") + **"Petyr's read"**.

### 3.4 Briefs & Alerts — the companion feel
- **Morning brief** at the user's local morning: what changed overnight in *their* holdings, in bullets.
- **Event pushes**: "TSLA reports tomorrow — here's what matters", "New 8-K from AAPL — decoded", "NVDA verdict changed: Fairly valued → Priced for perfection.", "xNVDA premium to the underlying widened past your alert threshold", "New attestation for USDY — decoded."
- Delivered via mobile push and optionally WhatsApp; always in the in-app brief feed.

> ⚠️ Design gaps: no mockup exists for the Briefs feed screen or for a tokenized-asset detail screen (backing / redemption / liquidity) — both needed before Phase 1 build.

### 3.5 Design system
Shared tokens (colors, type scale, spacing, radii, card primitives) live in `packages/tokens` (§7) and are consumed identically by mobile (RN StyleSheet) and web (CSS variables). The landing page's inline CSS is the reference implementation.

---

## 4. Feature Specification

This section is the **source of truth** for capability counts (the README historically undercounted).

### 4.1 The 19 tools

| Tool | Backing | Notes |
|---|---|---|
| `financial_search` | Financial Datasets API | Meta-tool over 11 fetchers: prices, statements, ratios, estimates, insider trades, crypto, segments |
| `financial_metrics` | Financial Datasets API | Direct metric lookup |
| `read_filings` | Financial Datasets API | 10-K/10-Q/8-K reader |
| `stock_screener` | Financial Datasets API | Criteria → ranked list |
| `macro_search` | FRED | Fed funds, CPI, GDP, yields, VIX (needs `FRED_API_KEY`) |
| `supply_chain_search` | SEC EDGAR full-text | Supplier/customer mapping |
| `catalyst_search` | SEC EDGAR full-text | 8-Ks, 13D/G, management changes, insider trades |
| `web_search` | Exa → Perplexity → Tavily | First configured key wins |
| `x_research` | Exa | Multi-platform social: X, Reddit, StockTwits, HN, YouTube, Substack |
| `get_news_sentiment` | Exa + LLM scoring | Bullish/bearish + summary |
| `web_fetch` | Readability | SSRF-guarded page reader |
| `browser` | Playwright | Full browser when fetch isn't enough |
| `generate_report` | Local | Markdown/PDF with branded cover + charts |
| `manage_watchlist` | Local | Add/remove/list/snapshot |
| `get_options_data` | **LLM knowledge only** | ⚠️ No API backing — **excluded from verdict cards** until backed by real data (hallucinated option chains inside a "verdict" is a trust-killer) |
| `read_file` / `write_file` / `edit_file` | Local sandbox | Write/edit require approval |
| `skill` | Meta | Loads skill instructions into context |

**Proposed new tools for tokenized assets** (none built yet; key requirements and pricing to be confirmed from each provider's current docs — no pricing assumed here):

| Proposed tool | Candidate backing | API key? | Notes |
|---|---|---|---|
| `rwa_search` | rwa.xyz (or similar RWA data provider) | Likely yes — confirm access tier | Asset universe, issuer, AUM/supply, yield, chain distribution, holders |
| `onchain_read` | Solana RPC (Helius or another provider) | Yes for Helius; public RPC is rate-limited | Supply, mint/freeze authority, holder distribution, wallet holdings |
| `onchain_read_evm` *(later)* | Ethereum/Base RPC (e.g. Alchemy/Infura) | Yes | Needed for Ethereum-native RWAs (BUIDL, OUSG) |
| `dex_liquidity` | Jupiter (quote/price API), Birdeye | Jupiter: confirm current key policy; Birdeye: yes | Depth at ±1/2%, slippage for a given size, price vs reference |
| `issuer_docs` | Issuer attestation/reserve reports, prospectuses (via `web_fetch`/`browser`) | No | Parsed per issuer; format varies, so freshness/coverage flagged per asset |
| `reference_price` | Underlying price (Financial Datasets for equities; FRED/issuer NAV for treasuries; gold spot source TBD) | Existing keys / TBD | Basis for premium/discount; source must be shown on card |

### 4.2 The 23 skills → 6 card families (+1 proposed)

The 23 equity skills stay as-is (`src/skills/*/SKILL.md` — markdown workflow checklists). The bite-size layer (§7.3) maps their output onto six card families:

| Card family | Skills | Card emits |
|---|---|---|
| **Valuation** | dcf-valuation, comps, ddm, sotp, residual-income | Fair value tile, delta-to-price, verdict badge |
| **Health Score** | altman-z, piotroski-f, beneish-m, magic-formula | Score tile (with scale), risk chips |
| **Quality** | dupont, quality-of-earnings, working-capital, roic-analysis | Trend tiles, one-line read |
| **Technical / Risk** | technical-analysis, beta-sharpe | Sparkline + levels, volatility tile |
| **Thesis** | investment-thesis, earnings-analysis, earnings-surprise, analyst-ratings | Bull/bear bullets, verdict badge, consensus tile |
| **Context** | macro-outlook, channel-checks, competitive-analysis, regulatory-scan | Macro strip, risk chips, moat read |
| **Tokenized Asset** *(proposed — 8 new skills)* | backing-issuer-risk, reserve-attestation-check, redemption-mechanics, nav-premium-discount, yield-duration (treasuries/MMFs), liquidity-depth, chain-bridge-contract-risk, holder-concentration | Backing tile, premium/discount tile, yield tile, liquidity tile, eligibility + risk chips, verdict badge |

**Proposed tokenized-asset skills** (new `src/skills/*/SKILL.md` files, same checklist format):

- **backing-issuer-risk** — what legally backs the token (share, fund unit, bar, loan), issuer entity and jurisdiction, custodian, bankruptcy-remoteness, holder's actual claim.
- **reserve-attestation-check** — latest attestation/audit: who, when, coverage vs on-chain supply; stale or missing → `backing_unverified`.
- **redemption-mechanics** — who can redeem (eligibility, minimums), settlement time, fees, gates; whether retail can only exit via secondary market.
- **nav-premium-discount** — token price vs NAV/underlying, history of the spread, what it implies.
- **yield-duration** — for treasuries/MMFs: current yield, source, duration/WAM, rate sensitivity vs the macro strip, how yield accrues (rebasing vs price).
- **liquidity-depth** — DEX depth and slippage for typical retail sizes, venues, volume.
- **chain-bridge-contract-risk** — native vs bridged, bridge used, mint/freeze/upgrade authorities, audits, admin keys.
- **holder-concentration** — top-holder share, protocol/treasury wallets, what concentration means for exit liquidity.

Equity-wrapper tokens (e.g. xStocks) get **both** families: the equity verdict on the underlying plus the Tokenized Asset card on the wrapper.

### 4.3 Verdict taxonomy (closed enum)

Verdicts must be comparable and cacheable, so the set is fixed:

`undervalued` · `fairly_valued` · `overvalued` · `priced_for_perfection` · `quality_hold` · `speculative` · `deteriorating` · `avoid`

**Proposed extensions for tokenized assets** (not yet in `packages/core`; to be finalized with the Tokenized Asset card family):

`trades_at_discount` · `trades_at_premium` · `backing_verified` · `backing_unverified` · `illiquid` · `restricted` *(holder-eligibility limits apply)*

A wrapper token may carry two verdicts — one on the underlying, one on the wrapper (e.g. `fairly_valued` + `trades_at_premium`).

Every verdict carries: **confidence** (`low|med|high`) + **basis** (which skill produced it, e.g. "base-case DCF") + **as_of** timestamp. The mockup phrases map 1:1 onto this enum. Verdict language is always descriptive, never imperative — "Priced for perfection," never "Sell now" (§9).

---

## 5. Execution Rails (PROPOSED — decision pending)

> **⚠️ NOT YET DECIDED — recommended direction: Option B (tokenized, Solana-first) as the lead rail; Option A optional for US research users.** The final decision gates Phase 3 (§10) and requires the checklist at the bottom of this section. Phase 2 wallet-holdings awareness is read-only and does not depend on it.

"Act on this" from a verdict card is the signature loop of Pillar 2. Two candidate rails:

### Option B — Tokenized assets on-chain, Solana-first *(recommended lead rail)*

Direct in-app buys of tokenized assets and majors via an embedded wallet — the rail that matches the primary persona and the "home for tokenized assets" positioning.

- **Chain: Solana first** — team has prior Solana protocol experience (WhizzFund), xStocks/Backed tokenized equities live there with real DEX liquidity, sub-cent fees suit small retail orders, and a growing set of RWAs (e.g. some tokenized treasury and gold products) are issued or bridged there.
- **Multi-chain later** — many flagship RWAs (e.g. BUIDL, OUSG) live primarily on Ethereum, with others on Base and other EVM chains. Research covers them from Phase 1 (read-only); EVM execution is a later step, not v1.
- **Wallet: Privy** embedded (email/social → non-custodial wallet with key export); Phantom connect as secondary. Privy's multi-chain support keeps the EVM path open.
- **Swaps: Jupiter** aggregated routing with an **integrator fee (50–75 bps, to validate) — this is the execution-revenue capture**, no custom program needed at v1.
- **Assets:** only tokens that pass per-asset eligibility rules (§9.4) and a minimum liquidity bar — xStocks tokenized equities, SOL/majors, then permissionless-to-trade RWAs. Permissioned/allowlisted tokens (many treasury funds require issuer KYC and accredited/qualified status) are research-only unless and until the issuer's onboarding is integrated.
- **Geography:** many of these assets **exclude US persons** — this rail is for global/crypto-native users only, geo-fenced (§9).

### Option A — Linked existing brokerages (SnapTrade) *(optional — US research companion)*

Users connect their existing brokerage (Robinhood, IBKR, Webull, Schwab, …) via **SnapTrade**, which supports both **reading** holdings and **placing orders**. (Plaid Investments was evaluated and rejected: read-only — it cannot place orders, so it cannot deliver "invest from the thesis.")

- **Phase-in:** read-only linking first (holdings → auto-populated watchlist → verdicts on what you actually own — huge value, near-zero regulatory surface), order placement later behind the Pro tier.
- Orders execute at the user's own brokerage under the broker's KYC. **Petyr charges nothing per order** — execution is subscription value, and taking no per-trade compensation keeps Petyr out of broker-compensation/inducement territory.
- Serves: US users and anyone with a supported brokerage. Demoted from candidate lead rail: it doesn't touch tokenized assets, so it's an optional companion for US research-only users (read-only portfolio awareness first; order placement only if clearly worth it).

### Comparison

| | Option B: Tokenized (Solana-first) · *recommended* | Option A: SnapTrade · *optional* |
|---|---|---|
| Time to market | Medium (wallet read-only fast) | Fast (read-only), medium (orders) |
| Regulatory surface | Higher — securities-law analysis, per-asset eligibility, KYC + geo-fencing required | Low (broker's KYC governs) |
| Petyr revenue | 50–75 bps per swap (to validate) | None per-trade (subscription value) |
| Geography | Global ex-US (per-asset rules) | US + supported-broker countries |
| Asset coverage | Tokenized equities, majors, eligible RWAs | Listed securities only — no tokenized assets |
| Portfolio awareness | Wallet holdings (on-chain, any token) | Brokerage holdings |
| Custody | User's embedded wallet (non-custodial) | User's existing broker |

### Possible hybrid
B as the lead rail for global users; A optionally for US users who want portfolio awareness on research they can't act on in-app. They share one order state machine.

### Shared order flow (whichever rail(s) win)

```
verdict card → "Act on this"
  → pre-trade interstitial (verdict summary, amount, est. fees,
    rail- and asset-specific risk disclosure, eligibility check, "research, not personalized advice")
  → explicit confirmation (user confirms every order — NO auto-trading, ever)
  → execute (Jupiter swap | SnapTrade order API)
  → order recorded, linked to the thesis that motivated it
  → fill confirmation push
  → outcome check at +30/90/180 days
  → "Petyr said, you did — here's how it went" card (wins AND losses shown)
```

The thesis→order→outcome linkage is both the product's signature and its honesty mechanism.

### Decision checklist (required before Phase 3)
- [ ] Securities counsel review (**started before Phase 2 ends**, §9.3): verdict-plus-execution proximity; whether either rail triggers adviser/broker registration; whether Option B needs a non-US entity; per-asset-class treatment (tokenized equities vs treasury funds vs commodities vs private credit)
- [ ] Direct read of each in-scope issuer's current distribution/eligibility terms (Backed/xStocks first — can Petyr take an integrator fee on secondary DEX swaps of their tokens? which jurisdictions are excluded?)
- [ ] Per-asset eligibility rule set drafted (§9.4) for the launch asset list
- [ ] Waitlist geography data: where are the actual users? (confirms the B-first recommendation)
- [ ] EVM timing: when do Ethereum/Base RWAs move from research-only to executable?
- [ ] Founder decision recorded here, this section rewritten as final

---

## 6. Autonomous Research Engine

Pillar 3 is what makes Petyr a companion instead of a chatbot: **research the user didn't ask for, arriving when it matters.**

### Inputs — three streams into one events inbox

1. **Schedules** — nightly verdict refresh for every distinct watchlisted ticker or token; per-user brief assembly at their local morning.
2. **Pollers** (reusing existing tool plumbing) — SEC EDGAR new-filings for watched tickers, earnings-calendar (Financial Datasets), FRED release calendar, price-move detector (daily close beyond threshold). Proposed for tokens: new attestation/reserve report published, premium/discount beyond threshold, liquidity drop, mint/freeze/authority change, large holder movement.
3. **Manual** — "re-check now" on any ticker, rate-limited by tier.

### The critical cost pattern: shared research, personal delivery

```
event(ticker) ──→ 1 shared research job
                    full agent run → ResearchCard → research_artifacts cache
              ──→ N per-user personalization jobs
                    small-model call (~200 tokens): artifact + user's
                    holding/thesis → one-sentence framing + push copy
              ──→ delivery job per user
                    Expo push · WhatsApp · in-app brief feed
```

**Research cost scales with distinct tickers and tokens (hundreds), not users (thousands).** A watchlist screen for a popular ticker is a cache read, not an agent run. This single decision is what makes the free tier and the autonomous engine affordable.

### Tier gates
- **Trigger level**: Free = weekly schedule only · Plus = daily + events · Pro = intraday events.
- **Depth level**: Free briefs link to cached verdicts · Pro briefs may trigger fresh skill runs.
- A per-user daily token budget (persisted in `usage_ledger`) hard-stops runaway spend.

### Delivery
**Expo Push Notifications** (one API for iOS + Android) as primary. The existing **WhatsApp gateway becomes a first-class delivery channel** — user links their number with a code; the channel-plugin architecture (`src/gateway/channels/`) gets its second channel ever. Briefs always land in the in-app feed regardless of push state.

### Job system
**pg-boss** (Postgres-backed queue) — no Redis, transactional with the data it operates on, runs inside the Bun server process. A separate worker process is a later scaling step, not an architecture change.

---

## 7. Architecture

### 7.1 Principle: the agent core is finished — build around it

`src/agent/*` (loop, scratchpad, context management, events), all 19 tools, all 23 skills, and the multi-provider model layer are **reused unchanged**. The pivot adds layers around `runAgentForMessage()` — exactly as the WhatsApp gateway already does.

### 7.2 Monorepo (Bun workspaces)

```
apps/server        ← current src/ (agent, tools, skills, gateway, API)
apps/mobile        ← Expo / React Native (new)
apps/web           ← React + Vite web app (new)
packages/core      ← shared types: card schemas, API contracts, verdict taxonomy
packages/tokens    ← design tokens → RN StyleSheet + CSS variables
docs/              ← this plan + archive/
```

Web is a separate Vite app, **not** Expo-web — the marketing site and web app want real DOM control; `packages/tokens` keeps the two visually identical.

### 7.3 The bite-size layer: synthesizer pass, not per-skill rewrites

The mockup UI needs **typed data**; the agent emits markdown. Do **not** rewrite the 23 SKILL.md files. Instead:

1. **Card primitives** (zod schemas in `packages/core`): `VerdictBadge`, `StatTile`, `RiskChip`, `Takeaways` (max 3), `Sparkline` (a series *reference* — ticker + range, resolved server-side from real price data), `MethodBadge`. A `ResearchCard` composes them.
2. **Synthesizer pass**: after the agent's `done` event, one structured-output call on a fast model takes the final answer + scratchpad digest and emits a validated `ResearchCard`. Numbers are *extracted, never computed* by this pass — computation stays in the agent and tools. Validation failure → retry once → fall back to prose (the card is an enhancement, never a blocker).
3. **New event**: the `AgentEvent` union gains `{ type: 'card', card: ResearchCard }` — additive; CLI ignores it, WhatsApp renders it as text, app/web render it natively.
4. **Cache**: cards persist to `research_artifacts` keyed `(asset, kind, as_of)` with an `inputs_hash` (price date + latest filing accession or attestation date + macro snapshot). TTLs: verdicts 24 h, filing summaries until the next filing, macro strip on FRED release.
5. **Personalization at render**: "vs your cost basis +31%" is computed server-side from holdings at request time — never baked into the shared cached card.

### 7.4 Backend stack

| Concern | Choice | Why |
|---|---|---|
| Database | **PostgreSQL** (Neon) + **Drizzle ORM** | Jobs + concurrent writers + pg-boss; plain Postgres, no vendor lock |
| Auth | **Better Auth** (email OTP + Apple + Google) | TS-native, runs in the Bun server, Expo plugin, no auth vendor. Apple sign-in is App Store-mandatory alongside any social login |
| API | **Hono** on Bun, typed RPC client | Replaces the raw `Bun.serve` route ladder; `hono/client` becomes the shared API client for mobile + web |
| Jobs | **pg-boss** | §6 |
| Push | **Expo Push** | One API for both platforms |
| Billing | **RevenueCat** (IAP) + **Stripe** (web) → unified `entitlements` via webhooks | §8 |

The current client-generated trusted `session_id` is **eliminated** — session keys become server-derived (`user:{userId}:chat:{chatId}`). The invite gate survives one more phase as the research-preview/waitlist gate, then dies with real auth.

### 7.5 Schema sketch

```
users, profiles          identity, experience level, country, eligibility status, push token
assets                   asset registry: type, issuer, chain(s), mint/contract, eligibility rules (proposed)
entitlements             tier (free|plus|pro), source, valid_until
watchlist_items          per-user tickers + tokens (asset_type, chain, mint/contract)
portfolios, holdings     source: wallet (on-chain read) | manual | brokerage link
chats, messages          DB-backed history (replaces in-memory) + cards jsonb
research_artifacts       the shared card cache — payload, inputs_hash, model, as_of
theses                   user-saved verdicts ("I'm acting on this")
briefs                   generated briefs, trigger, delivered_via, read_at
alerts_rules             user alert configs
events                   market-event inbox (filing, earnings, price, macro)
wallets                  embedded/connected wallet ─┐
brokerage_links          SnapTrade linkage (opt.)  ├─ rail-dependent (§5)
orders, order_outcomes   thesis-linked trades     ─┘
usage_ledger             per-user daily asks/tokens/cost — tier limits + budget stop
```

### 7.6 Per-user agent context

`runAgentForMessage()` gains a `userId` and a `UserContext` system-prompt block: experience level, watchlist, holdings summary, active theses. Chat history loads from the DB into the existing in-memory shape — `src/agent/*` needs zero changes.

### 7.7 Existing surfaces

| Surface | Fate |
|---|---|
| Marketing landing (`src/web/public/index.html`) | **Live now** — gold brand + waitlist |
| Vanilla-JS chat UI (`/app`, invite-gated) | Internal dev console; deleted once `apps/web` reaches chat parity — do not invest another hour in it |
| CLI | Survives untouched as the dev/power-user harness |
| WhatsApp gateway | Survives with new purpose: brief delivery + Q&A bound to real accounts |

---

## 8. Monetization

**Freemium subscription + execution revenue.** (Execution revenue exists only once Option B ships — §5. It supports the recommended direction but remains subject to counsel review and issuer terms.)

### Tiers

| | **Free** | **Plus — $9.99/mo** | **Pro — $24.99/mo** |
|---|---|---|---|
| Asks per day | 5 | Unlimited | Unlimited |
| Watchlist assets (tickers + tokens) | 3 | 25 | 100 |
| Verdict refresh | Weekly | Daily | Daily + intraday events |
| Briefs | Weekly digest | Daily morning brief | Daily + event-driven |
| Alerts | — | Earnings, filings, price moves | + macro, verdict changes |
| Filings decoded | Watchlist only | All | All |
| Reasoning depth | Snapshot | Full reasoning | Full + PDF reports |
| Tokenized-asset cards | Snapshot | Full (backing, redemption, liquidity) | Full + attestation/premium alerts |
| Wallet holdings awareness | 1 wallet | Multiple wallets | Multiple wallets |
| In-app tokenized trading | — | Eligible users* | Eligible users* |
| Brokerage linking (optional, Option A) | — | Read-only | Read-only (+ orders if ever shipped) |
| Outcome tracking | — | — | "Petyr said, you did" cards |

*\*Phase 3, gated; only for KYC-verified users in eligible jurisdictions, only for eligible assets. Tier placement of trading is open — see open questions.*

### Execution revenue (Option B only)
50–75 bps platform fee (to validate against market and issuer terms) on tokenized-rail swaps, captured as a Jupiter integrator fee. Brokerage-linked orders (Option A) carry **no** Petyr fee — subscription value, and staying out of per-trade compensation keeps the regulatory posture clean (§9).

### Billing stack
RevenueCat for App Store / Play IAP + Stripe for web, both webhooking into one `entitlements` table. The client never decides tier; the server does.

### Unit economics (targets, to validate in beta)

| Item | Est. cost | Note |
|---|---|---|
| Verdict, cache hit | ~$0.000 | DB read |
| Verdict, fresh (shared across all users) | $0.05–0.15 | Full agent run, amortized per ticker |
| Per-user brief personalization | <$0.005 | ~200-token fast-model call |
| Free user / month | <$0.30 | Weekly refresh × 3 tickers, mostly cache hits |
| Plus user / month | $1.50–3.00 | Target gross margin >70% at $9.99 |

The shared-research cache (§6) is what makes these numbers work. Track them in `usage_ledger` from day one.

---

## 9. Compliance & Trust

Five commitments, designed into the product rather than bolted on. Widening to all tokenized RWAs raises the stakes: many of these products **restrict US persons**, and some (notably tokenized treasury/money-market funds such as BUIDL or OUSG) are limited to **accredited or qualified investors** with issuer-side KYC/allowlisting. Eligibility is per asset, not per app.

### 9.1 Research-publisher posture
Petyr provides **impersonal research and education, not individualized investment advice**. Verdicts are model-derived opinions about securities and tokenized assets, not recommendations tailored to a person's situation. In product language: verdict cards always show their `basis` ("base-case DCF"); language is descriptive, never imperative — "Priced for perfection" ✓, "Sell now" ✗; briefs describe *what changed*, not *what you should do*. "Verdict" stays (it's the brand) but the UI subtitle is "Petyr's read," and the first-run explainer says plainly: Petyr is not a licensed advisor.

### 9.2 Disclosure pattern — written once, placed three times
1. **First-run explainer** card, acknowledged once.
2. **Persistent light-touch footer** on verdict/thesis surfaces: "Research, not advice. Markets involve risk." (Already live on the landing page footer.)
3. **Pre-trade interstitial** on any order path, restating with rail-specific risk (tokenized: token ≠ share/fund unit unless terms say so, issuer and custodian risk, redemption limits, smart-contract/bridge risk, no SIPC; brokerage: your broker executes).

### 9.3 The advice/execution proximity question — the one genuine open legal item
Verdicts + one-tap execution in the same app is the pattern regulators probe (cf. scrutiny of Robinhood's Cortex). Mitigations designed in: **no per-trade compensation on the brokerage rail** (removes the inducement pattern), **no auto-trading ever** (explicit confirmation on every order), **outcome tracking shows losses** (§5). Whether this — plus the tokenized rail's bps fee — requires investment-adviser registration or an offshore entity **must go to securities counsel**. Because tokenized assets are now the core product, and research on restricted/permissioned securities raises its own questions (marketing to ineligible persons, publishing on fund products), **counsel review moves earlier: engaged during Phase 2 and concluded before Phase 2 ends** — not deferred to Phase 3. Likely outcome to evaluate: a **non-US operating entity** for the tokenized rail. Flagged, not defaulted.

### 9.4 Eligibility & geo-fencing the tokenized rail
**Per-asset eligibility rules** (in the `assets` registry): excluded jurisdictions, accredited/qualified-investor requirement, issuer allowlist/KYC requirement, minimums. Research surfaces show an eligibility chip ("US persons excluded", "Accredited only"); trade surfaces are only shown when the user's verified status satisfies the rules. Permissioned tokens are research-only until issuer onboarding is integrated.

Three enforcement layers: KYC-verified residency (Sumsub/Persona — required only when a user *activates* the rail, never at signup), IP geo-blocking on rail endpoints, in-app attestation. US persons never see rail-B trade surfaces (feature-flagged by verified country); they keep full research. Accredited/qualified status, where required, is the issuer's determination — Petyr does not self-certify it. The brokerage rail needs no Petyr KYC; subscriptions need none.

### 9.5 Data honesty
Every card shows `as_of`. `get_options_data` stays out of cards until API-backed. Tokenized-asset cards show the attestation date and data source for backing, NAV and liquidity; stale or missing attestations surface as `backing_unverified`, never silently as verified. Model + `inputs_hash` stored per artifact makes any verdict reproducible — a one-table trust feature, not compliance theater. Verdict accuracy becomes a *public* page in Phase 4 (§10) — wins and losses.

---

## 10. Roadmap

Small team (~2–3 engineers). Phases overlap at edges; milestones are the truth.

### Phase 0 — Foundation (weeks 1–3) ✅ started
- [x] Waitlist site live on Railway (gold landing + `/api/waitlist`, chat preview at `/app`)
- [x] Enterprise plan archived; this plan written
- [ ] Monorepo restructure (Bun workspaces)
- [ ] Postgres (Neon) + Drizzle + Better Auth
- [ ] Server → Hono; kill trusted `session_id`
- [ ] Persist chats/messages/watchlists per user

**Milestone: today's web chat works signed-in, multi-user, DB-backed.**

### Phase 1 — MVP: the bite-sized companion (weeks 4–10) · P1 + P3-lite
- [ ] Card schemas + verdict synthesizer + `card` event (incl. proposed Tokenized Asset family + verdict extensions)
- [ ] **Tokenized-asset coverage, read-only**: asset registry, `rwa_search` / `onchain_read` / `dex_liquidity` / `issuer_docs` tools, the 8 tokenized skills, eligibility chips — research and verdicts only, no wallets or trading
- [ ] Tokenized-asset detail screen design
- [ ] `research_artifacts` cache
- [ ] Briefs-feed screen design (the missing mockup)
- [ ] Expo app: Watchlist (tickers + tokens) + verdicts + macro strip · Asset detail (3-depth) · Ask Petyr · Filings decoded
- [ ] Nightly verdict refresh + morning brief via Expo push
- [ ] RevenueCat + Stripe freemium (Free/Plus gates)
- [ ] Beta invites drawn from the waitlist

**Milestone: TestFlight users receive a morning brief they didn't ask for — and open it.**

### Phase 2 — Own it (weeks 10–16) · P2-read + P3-full
- [ ] **Wallet holdings awareness**: connect/create a wallet (Privy / Phantom), read Solana holdings on-chain → auto-populated watchlist → verdicts on tokens actually held (read-only, no trading)
- [ ] Token event triggers: attestation published, premium/discount, liquidity, authority changes
- [ ] Optional: SnapTrade read-only for US research users (only if waitlist data supports it)
- [ ] **Securities counsel engaged — review concluded before Phase 2 ends** (§9.3)
- [ ] Event triggers: earnings, filings, price moves → per-user fan-out
- [ ] WhatsApp as delivery channel (linked accounts)
- [ ] `apps/web` chat + watchlist parity; retire the vanilla-JS `/app`
- [ ] Pro tier

**Milestone: a user connects a wallet and gets a brief on a token they hold — e.g. a new attestation or a widening discount.**

### Phase 3 — Act on it (weeks 16–26) · P2-full · **GATED**
- [ ] **Execution-rail decision recorded + counsel sign-off (§5 checklist) — nothing below ships before this**
- [ ] Gated trading on eligible tokenized assets: Privy wallets, Jupiter swaps + fee account, per-asset eligibility checks, KYC + geo stack
- [ ] Confirm flow, orders + outcomes tables
- [ ] "Petyr said, you did, here's how it went" outcome cards

**Milestone: first thesis-linked order executed; first outcome card delivered.**

### Phase 4 — Compound (weeks 26+)
- [ ] Public verdict-accuracy page (the outcome data *is* the marketing)
- [ ] Thesis sharing + referral loop
- [ ] App Store launch out of beta
- [ ] Multi-chain (Ethereum/Base) research → execution for EVM-native RWAs; more asset classes; model-cost optimization

**Milestone: App Store launch with a public, verifiable track record.**

---

## 11. Metrics

**North star: Weekly-Active Researchers** — users who read ≥1 verdict or brief per week. (Not DAU — a calm companion is opened when it matters.)

| Metric | Watches |
|---|---|
| Verdict → expansion rate | Are bite-sizes landing, or too shallow? |
| Brief open rate | Is autonomous research wanted? |
| Watchlist size growth | Investment in the product |
| Tokenized-asset share of watchlists + wallets connected | Is the tokenized-home positioning landing? |
| D30 retention | Companion, or novelty? |
| Free → paid conversion | Tier-gate calibration |
| MRR + net revenue retention | Business health |
| Execution volume + bps revenue | Once Option B ships |
| Eligibility blocks / KYC completion rate | Is gating too strict or leaking? |
| **Thesis outcome accuracy** | Tracked from day one, public in Phase 4 |
| Cost per user per month (`usage_ledger`) | Unit economics (§8) staying true |

---

## 12. Competitive Positioning

| Competitor | What they do | Petyr's edge |
|---|---|---|
| Robinhood Cortex | AI insights inside one broker | Broker-agnostic; deeper methods; shows its work |
| eToro | Copy-trading | Social ≠ analytical — copying people isn't understanding |
| Magnifi | Chat-to-trade | Thin research behind the chat; Petyr's research *is* the product |
| Danelfin, Zacks, Toggle | Scores and ranks | Scores without reasoning; Petyr's DCF is one tap away |
| Bloomberg / Koyfin | Pro terminals | Wrong audience, wrong price, wrong language |
| rwa.xyz and similar RWA dashboards | Data and analytics on tokenized assets | Data, not interpretation — Petyr turns backing, NAV and liquidity data into a plain-English verdict for one holder |
| Ondo (app / Ondo Global Markets) | Issuer-run access to its own tokenized products | Single-issuer; Petyr is issuer-neutral and will say when a token trades at a premium |
| Backed / xStocks | Issuer of tokenized equities | Issuer, not companion; Petyr researches the underlying *and* the wrapper |
| Robinhood tokenized stocks (EU) | Broker-issued stock tokens for EU users | One broker's tokens; Petyr spans issuers and asset types with research attached |
| ChatGPT / Claude | General AI | No live financial pipeline, no watchlist memory, no autonomous briefs, no execution |

**The moat:** Petyr aims to be the only product where an institutional-method verdict — on a stock or on the token that wraps it, a treasury fund or a gold bar — its full reasoning, and the ability to act on it live in the same card — with a public track record of how those verdicts turned out.

---

*Research, not financial advice. Petyr explains markets; it does not know your situation.*
