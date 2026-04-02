# Petyr — API Keys Guide

All keys go in the `.env` file at the root of the project (`C:\Users\EDOpsAF\dexter\.env`).

---

## Required (at least one LLM provider)

| Key | Provider | Purpose | Get It |
|-----|----------|---------|--------|
| ANTHROPIC_API_KEY | Anthropic | Claude models (default if set) | https://console.anthropic.com/settings/keys |
| OPENAI_API_KEY | OpenAI | GPT models | https://platform.openai.com/api-keys |
| GOOGLE_API_KEY | Google | Gemini models | https://aistudio.google.com/app/apikey |

You only need ONE of these. Anthropic (Claude) or OpenAI (GPT) are recommended.

---

## Required for Financial Data

| Key | Provider | Purpose | Get It |
|-----|----------|---------|--------|
| FINANCIAL_DATASETS_API_KEY | Financial Datasets | Stock prices, income statements, balance sheets, cash flows, SEC filings, insider trades, key ratios, analyst estimates | https://financialdatasets.ai — free tier covers AAPL, NVDA, MSFT |

This is the core data source. Without it, most financial tools won't return data.

---

## Optional (unlocks additional tools)

| Key | Provider | Purpose | Tools Unlocked | Get It |
|-----|----------|---------|----------------|--------|
| EXASEARCH_API_KEY | Exa | Web search + X/Twitter research | web_search, x_research | https://exa.ai — sign up for API key |
| FRED_API_KEY | Federal Reserve (FRED) | Economic/macro data (rates, GDP, inflation, yield curves) | macro_search | https://fred.stlouisfed.org/docs/api/api_key.html — free |
| PERPLEXITY_API_KEY | Perplexity | Alternative web search (fallback if no Exa key) | web_search | https://docs.perplexity.ai |
| TAVILY_API_KEY | Tavily | Alternative web search (fallback if no Exa or Perplexity) | web_search | https://tavily.com |

---

## Optional (observability)

| Key | Provider | Purpose | Get It |
|-----|----------|---------|--------|
| LANGCHAIN_API_KEY | LangSmith | Trace and debug agent tool calls | https://smith.langchain.com |
| LANGCHAIN_TRACING_V2 | — | Set to "true" to enable tracing | — |
| LANGSMITH_PROJECT | — | Project name (default: "petyr") | — |

---

## Capability Matrix

| Capability | Keys Needed |
|-----------|-------------|
| Chat with Petyr | Any LLM key |
| Stock prices, financials, ratios | LLM + FINANCIAL_DATASETS_API_KEY |
| SEC filing analysis | LLM + FINANCIAL_DATASETS_API_KEY |
| News sentiment (with social) | LLM + EXASEARCH_API_KEY |
| X/Twitter research | LLM + EXASEARCH_API_KEY |
| Macro/economic data | LLM + FRED_API_KEY |
| Web search | LLM + EXASEARCH_API_KEY (or PERPLEXITY or TAVILY) |
| Watchlist, reports, screener | LLM only (local tools) |
| All 23 skills (DCF, thesis, etc.) | LLM + FINANCIAL_DATASETS_API_KEY |
| Full capabilities | All keys above |

---

## Quick Start

Minimum to get started and test:
1. ANTHROPIC_API_KEY (you already have this)
2. FINANCIAL_DATASETS_API_KEY (free tier at financialdatasets.ai)

For full capabilities, also add:
3. EXASEARCH_API_KEY (enables web + social search)
4. FRED_API_KEY (free, enables macro data)
