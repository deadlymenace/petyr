# Petyr

Petyr is an autonomous financial research agent that thinks, plans, and learns as it works. It performs deep analysis using task planning, self-reflection, real-time market data, macroeconomic intelligence, and 20 built-in financial analysis skills.

## Table of Contents

- [Overview](#overview)
- [Tools](#tools)
- [Skills](#skills)
- [Prerequisites](#prerequisites)
- [How to Install](#how-to-install)
- [How to Run](#how-to-run)
- [How to Evaluate](#how-to-evaluate)
- [How to Debug](#how-to-debug)
- [How to Use with WhatsApp](#how-to-use-with-whatsapp)
- [How to Contribute](#how-to-contribute)
- [License](#license)


## Overview

Petyr takes complex financial questions and turns them into clear, step-by-step research plans. It runs those tasks using live market data, checks its own work, and refines the results until it has a confident, data-backed answer.

**Key Capabilities:**
- **Intelligent Task Planning**: Automatically decomposes complex queries into structured research steps
- **Autonomous Execution**: Selects and executes the right tools to gather financial data
- **Self-Validation**: Checks its own work and iterates until tasks are complete
- **Real-Time Financial Data**: Income statements, balance sheets, cash flow statements, stock prices (OHLCV), key ratios, insider trades, and segmented revenues
- **Macro & Economic Intelligence**: Interest rates, inflation, GDP, yield curves, unemployment, and volatility via the FRED API
- **Supply Chain & Industry Analysis**: SEC EDGAR full-text search for supplier/customer/competitor mapping across all public filings
- **Catalyst Tracking**: Management changes (8-K Item 5.02), insider trading patterns, activist investor filings (13D/13G)
- **20 Built-in Analysis Skills**: From DCF valuation to Altman Z-Score to competitive moat analysis
- **Safety Features**: Built-in loop detection and step limits to prevent runaway execution


## Tools

Petyr has 7 core tools that the agent selects from autonomously:

| Tool | Description | Data Source |
|------|-------------|-------------|
| `financial_search` | Stock prices, fundamentals, filings, insider trades, key ratios, segmented revenues | [Financial Datasets API](https://financialdatasets.ai) |
| `financial_metrics` | Direct metric lookups (revenue, market cap, EPS, etc.) | Financial Datasets API |
| `read_filings` | SEC filing reader for 10-K, 10-Q, 8-K documents | Financial Datasets API |
| `macro_search` | Economic indicators — fed funds rate, 10Y yield, CPI, GDP, unemployment, VIX, yield curve | [FRED API](https://fred.stlouisfed.org) |
| `supply_chain_search` | Industry analysis — supplier/customer discovery, competitive positioning, revenue concentration | [SEC EDGAR EFTS](https://efts.sec.gov) (free) |
| `catalyst_search` | Event-driven signals — management changes, insider trading patterns, activist investors, proxy fights | SEC EDGAR + Financial Datasets API |
| `web_search` | General web search for news, analysis, and context | [Exa](https://exa.ai) / [Tavily](https://tavily.com) |

Additional utilities: `web_fetch` (lightweight page reader), `browser` (Playwright-based scraping), `skill` (invokes analysis workflows), `read_file` / `write_file` / `edit_file` (workspace management).


## Skills

Skills are structured analysis workflows that Petyr follows step-by-step. Each skill uses the tools above to gather data, perform calculations, and produce a formatted result. The agent automatically selects the right skill based on your question.

### Valuation Models

| Skill | Description |
|-------|-------------|
| **DCF** | Discounted Cash Flow — projects free cash flows 5-10 years, calculates terminal value, discounts to present value |
| **Comps** | Comparable Company Analysis — identifies peer group, compares EV/EBITDA, P/E, EV/Revenue multiples |
| **DDM** | Dividend Discount Model — values dividend-paying stocks using Gordon Growth or multi-stage models |
| **SOTP** | Sum-of-the-Parts — values each business segment independently for conglomerates |
| **Residual Income** | EVA / Residual Income — measures value creation above cost of capital |

### Scoring & Screening

| Skill | Description |
|-------|-------------|
| **Altman Z-Score** | Bankruptcy risk prediction using 5 financial ratios (Z > 2.99 = safe, Z < 1.81 = distress) |
| **Piotroski F-Score** | Financial strength scoring (0-9) based on profitability, leverage, and efficiency signals |
| **Beneish M-Score** | Earnings manipulation detection using 8 financial ratios (M > -1.78 = potential manipulation) |
| **Magic Formula** | Greenblatt's ranking system combining earnings yield and return on capital |

### Profitability & Efficiency

| Skill | Description |
|-------|-------------|
| **DuPont Analysis** | ROE decomposition into profit margin, asset turnover, and financial leverage |
| **Quality of Earnings** | Accruals analysis, cash flow vs. net income comparison, revenue quality assessment |
| **Working Capital** | Cash conversion cycle analysis — DSO, DIO, DPO trends and peer comparison |
| **ROIC Analysis** | Return on Invested Capital with WACC comparison and economic profit calculation |

### Technical & Quantitative

| Skill | Description |
|-------|-------------|
| **Technical Analysis** | Moving averages (SMA/EMA), RSI, MACD, Bollinger Bands, volume analysis, support/resistance |
| **Beta & Sharpe** | Risk metrics — beta vs. benchmark, Sharpe ratio, volatility, max drawdown |

### Forward-Looking Intelligence

| Skill | Description |
|-------|-------------|
| **Investment Thesis** | Full Buy/Sell/Hold thesis with bull/bear cases, catalysts, risks, and conviction level |
| **Macro Outlook** | Economic environment assessment — rates, inflation, growth cycle, sector implications |
| **Channel Checks** | Alternative data signals — hiring trends, web traffic, patent filings, app downloads |
| **Competitive Analysis** | Moat assessment, market share trends, Porter's Five Forces, peer benchmarking |
| **Regulatory Scan** | Regulatory risk scanning — pending legislation, agency actions, compliance exposure |


## Prerequisites

- [Bun](https://bun.com) runtime (v1.0 or higher)
- OpenAI API key (get [here](https://platform.openai.com/api-keys))
- Financial Datasets API key (get [here](https://financialdatasets.ai))
- Exa API key (get [here](https://exa.ai)) - optional, for web search
- FRED API key (get [here](https://fred.stlouisfed.org/docs/api/api_key.html)) - optional, for macro data

#### Installing Bun

If you don't have Bun installed, you can install it using curl:

**macOS/Linux:**
```bash
curl -fsSL https://bun.com/install | bash
```

**Windows:**
```bash
powershell -c "irm bun.sh/install.ps1|iex"
```

After installation, restart your terminal and verify Bun is installed:
```bash
bun --version
```

## How to Install

1. Clone the repository:
```bash
git clone https://github.com/deadlymenace/petyr.git
cd petyr
```

2. Install dependencies with Bun:
```bash
bun install
```

3. Set up your environment variables:
```bash
# Copy the example environment file
cp env.example .env

# Edit .env and add your API keys
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key (optional)
# GOOGLE_API_KEY=your-google-api-key (optional)
# XAI_API_KEY=your-xai-api-key (optional)
# OPENROUTER_API_KEY=your-openrouter-api-key (optional)

# Institutional-grade market data; AAPL, NVDA, MSFT are free
# FINANCIAL_DATASETS_API_KEY=your-financial-datasets-api-key

# Macro economic data (optional)
# FRED_API_KEY=your-fred-api-key

# Web Search (Exa preferred, Tavily fallback)
# EXASEARCH_API_KEY=your-exa-api-key
# TAVILY_API_KEY=your-tavily-api-key

# (Optional) If using Ollama locally
# OLLAMA_BASE_URL=http://127.0.0.1:11434
```

## How to Run

Run Petyr in interactive mode:
```bash
bun start
```

Or with watch mode for development:
```bash
bun dev
```

### Example Queries

```
What is NVIDIA's fair value using a DCF model?
Run a Piotroski F-Score on Tesla
Who are Apple's top 5 suppliers by revenue exposure?
What's the macro outlook for rate-sensitive sectors?
Build a full investment thesis for Microsoft — buy, sell, or hold?
Has there been any insider selling at CrowdStrike in the last 6 months?
Run an Altman Z-Score on WeWork to assess bankruptcy risk
Compare Amazon's working capital efficiency to Walmart
```

## How to Evaluate

Petyr includes an evaluation suite that tests the agent against a dataset of financial questions. Evals use LangSmith for tracking and an LLM-as-judge approach for scoring correctness.

**Run on all questions:**
```bash
bun run src/evals/run.ts
```

**Run on a random sample of data:**
```bash
bun run src/evals/run.ts --sample 10
```

The eval runner displays a real-time UI showing progress, current question, and running accuracy statistics. Results are logged to LangSmith for analysis.

## How to Debug

Petyr logs all tool calls to a scratchpad file for debugging and history tracking. Each query creates a new JSONL file in `.petyr/scratchpad/`.

**Scratchpad location:**
```
.petyr/scratchpad/
├── 2026-01-30-111400_9a8f10723f79.jsonl
├── 2026-01-30-143022_a1b2c3d4e5f6.jsonl
└── ...
```

Each file contains newline-delimited JSON entries tracking:
- **init**: The original query
- **tool_result**: Each tool call with arguments, raw result, and LLM summary
- **thinking**: Agent reasoning steps

## How to Use with WhatsApp

Chat with Petyr through WhatsApp by linking your phone to the gateway. Messages you send to yourself are processed by Petyr and responses are sent back to the same chat.

**Quick start:**
```bash
# Link your WhatsApp account (scan QR code)
bun run gateway:login

# Start the gateway
bun run gateway
```

Then open WhatsApp, go to your own chat (message yourself), and ask Petyr a question.

For detailed setup instructions, configuration options, and troubleshooting, see the [WhatsApp Gateway README](src/gateway/channels/whatsapp/README.md).

## How to Contribute

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

**Important**: Please keep your pull requests small and focused. This will make it easier to review and merge.


## License

This project is licensed under the MIT License.
