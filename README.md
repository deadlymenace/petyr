# Petyr

Petyr is an autonomous financial research agent that thinks, plans, and learns as it works. It performs analysis using task planning, self-reflection, and real-time market data.

## Table of Contents

- [Overview](#overview)
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
- **Real-Time Financial Data**: Access to income statements, balance sheets, cash flow statements, and stock prices
- **Macro & Economic Intelligence**: Interest rates, inflation, GDP, yield curves via FRED API
- **Supply Chain Analysis**: SEC EDGAR full-text search for supplier/customer/competitor mapping
- **Catalyst Tracking**: Management changes, insider trading patterns, activist investors
- **Safety Features**: Built-in loop detection and step limits to prevent runaway execution


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
git clone <your-repo-url>
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

# Edit .env and add your API keys (if using cloud providers)
# OPENAI_API_KEY=your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-api-key (optional)
# GOOGLE_API_KEY=your-google-api-key (optional)
# XAI_API_KEY=your-xai-api-key (optional)
# OPENROUTER_API_KEY=your-openrouter-api-key (optional)

# Institutional-grade market data for agents; AAPL, NVDA, MSFT are free
# FINANCIAL_DATASETS_API_KEY=your-financial-datasets-api-key

# (Optional) If using Ollama locally
# OLLAMA_BASE_URL=http://127.0.0.1:11434

# Web Search (Exa preferred, Tavily fallback)
# EXASEARCH_API_KEY=your-exa-api-key
# TAVILY_API_KEY=your-tavily-api-key

# Macro economic data (optional)
# FRED_API_KEY=your-fred-api-key
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
