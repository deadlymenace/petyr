# Repository Guidelines

- Petyr is an AI agent for deep financial research — pivoting into a retail AI investing companion ("Know before you invest"). Built with TypeScript on Bun; LangChain is used only for model adapters and tool binding (the agent loop is custom). Product direction: `docs/product-plan.md`.

## Project Structure

- Source code: `src/`
  - Agent core: `src/agent/` (agent loop, prompts, scratchpad, token counting, types)
  - CLI interface: `src/cli.ts` (built on `@mariozechner/pi-tui`), entry point: `src/index.tsx`
  - Components: `src/components/` (terminal UI components for the CLI)
  - Controllers: `src/controllers/` (agent runner, model selection, input history)
  - Model/LLM: `src/model/llm.ts` (multi-provider LLM abstraction), `src/providers.ts`
  - Tools: `src/tools/` — registry at `src/tools/registry.ts` (19 tools, conditionally included by env vars)
  - Tool descriptions: `src/tools/descriptions/` (rich descriptions injected into system prompt)
  - Finance tools: `src/tools/finance/` (prices, fundamentals, filings, options, insider trades)
  - Macro tools: `src/tools/macro/` (FRED API economic indicators)
  - Research tools: `src/tools/research/` (SEC EDGAR search, supply chain, catalysts, x_research, news sentiment, screener)
  - Search tools: `src/tools/search/` (Exa → Perplexity → Tavily)
  - Browser: `src/tools/browser/` (Playwright-based web scraping)
  - Report: `src/tools/report/` (markdown/PDF report generation)
  - Portfolio: `src/tools/portfolio/` (watchlist)
  - Skills: `src/skills/` (23 SKILL.md-based workflows; registry: `src/skills/registry.ts`)
  - Web server: `src/web/` (Bun.serve + SSE; public landing + waitlist at `/`, invite-gated chat at `/app`)
  - WhatsApp gateway: `src/gateway/` (Baileys; channel abstraction in `src/gateway/channels/`)
  - Utils: `src/utils/` (env, config, caching, token estimation, chat history)
  - Evals: `src/evals/` (LangSmith evaluation runner)
- Config: `.petyr/settings.json` (persisted model/provider selection)
- Environment: `.env` (API keys; see `env.example`)
- Scripts: `scripts/release.sh`

## Build, Test, and Development Commands

- Runtime: Bun (primary). Use `bun` for all commands.
- Install deps: `bun install`
- Run CLI: `bun run start` — Dev (watch): `bun run dev`
- Run web server: `bun run web` (port `PETYR_WEB_PORT`, default 3000)
- Run WhatsApp gateway: `bun run gateway` (login: `bun run gateway:login`)
- Type-check: `bun run typecheck`
- Tests: `bun test`
- Evals: `bun run src/evals/run.ts` (full) or `--sample 10` (sampled)
- CI runs `bun run typecheck` and `bun test` on push/PR.

## Coding Style & Conventions

- Language: TypeScript (ESM, strict mode).
- Prefer strict typing; avoid `any`.
- Keep files concise; extract helpers rather than duplicating code.
- Add brief comments for tricky or non-obvious logic.
- Do not add logging unless explicitly asked.
- Do not create README or documentation files unless explicitly asked.

## LLM Providers

- Supported: Anthropic (default), OpenAI, Google, xAI (Grok), Moonshot, DeepSeek, OpenRouter, Ollama (local).
- Default model: `claude-sonnet-4-5` (Anthropic). Provider detection is prefix-based (`claude-` → Anthropic, `gemini-` → Google, `grok-` → xAI, `kimi-` → Moonshot, `deepseek-` → DeepSeek, `openrouter:` → OpenRouter, `ollama:` → Ollama; otherwise OpenAI).
- Fast models for lightweight tasks: see `FAST_MODELS` map in `src/model/llm.ts`.
- Anthropic uses explicit `cache_control` on system prompt for prompt caching cost savings.
- Users switch providers/models via `/model` command in the CLI.

## Tools

- `financial_search`: primary tool for all financial data queries (prices, metrics, filings, crypto). Delegates to sub-fetchers internally.
- `financial_metrics`: direct metric lookups. `read_filings`: 10-K/10-Q/8-K reader. `stock_screener`: criteria-based ranking.
- `macro_search`: economic data (rates, inflation, GDP). Requires `FRED_API_KEY` — tool absent without it.
- `supply_chain_search` / `catalyst_search`: SEC EDGAR full-text analysis.
- `web_search`: Exa if `EXASEARCH_API_KEY`, else Perplexity, else Tavily; absent if none set.
- `x_research`: multi-platform social research (Exa only). `get_news_sentiment`: LLM-scored sentiment.
- `web_fetch` / `browser`: page reading and Playwright scraping (SSRF-guarded).
- `generate_report`: markdown/PDF reports. `manage_watchlist`: persisted watchlist.
- `get_options_data`: LLM knowledge only — no live options API.
- `read_file` / `write_file` / `edit_file`: sandboxed; write/edit require user approval.
- `skill`: invokes SKILL.md workflows. Each skill runs at most once per query.
- Tool registry: `src/tools/registry.ts`. Tools are conditionally included based on env vars.

## Skills

- Skills live as `SKILL.md` files with YAML frontmatter (`name`, `description`) and markdown body (instructions).
- 23 built-in skills under `src/skills/<slug>/SKILL.md` (dcf, comps, ddm, sotp, residual-income, altman-z, piotroski-f, beneish-m, magic-formula, dupont, quality-of-earnings, working-capital, roic-analysis, technical-analysis, beta-sharpe, investment-thesis, macro-outlook, channel-checks, competitive-analysis, regulatory-scan, earnings-analysis, earnings-surprise, analyst-ratings).
- Discovery: `src/skills/registry.ts` scans builtin, `~/.petyr/skills/`, and `./.petyr/skills/` (later overrides earlier).
- Skills are exposed to the LLM as metadata in the system prompt; the LLM invokes them via the `skill` tool by frontmatter name.

## Agent Architecture

- Agent loop: `src/agent/agent.ts`. Iterative tool-calling loop with configurable max iterations (default 6).
- Scratchpad: `src/agent/scratchpad.ts`. Single source of truth for all tool results within a query.
- Context management: Anthropic-style. Full tool results kept in context; oldest results cleared when token threshold exceeded.
- Final answer: generated in a separate LLM call with full scratchpad context (no tools bound).
- Events: agent yields typed events (`tool_start`, `tool_end`, `thinking`, `answer_start`, `done`, etc.) for real-time UI updates.
- All chat surfaces (web, WhatsApp) funnel into `runAgentForMessage()` in `src/gateway/agent-runner.ts`.

## Environment Variables

- LLM keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`, `MOONSHOT_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`
- Ollama: `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- Finance: `FINANCIAL_DATASETS_API_KEY`
- Macro: `FRED_API_KEY`
- Search: `EXASEARCH_API_KEY` (preferred), `PERPLEXITY_API_KEY`, `TAVILY_API_KEY` (fallbacks)
- Web server: `PETYR_WEB_PORT`, `PETYR_INVITE_CODES`, `PETYR_ALLOWED_HOSTS`, `PETYR_DATA_DIR` (persistent waitlist storage), `PETYR_ADMIN_TOKEN` (waitlist export)
- Tracing: `LANGSMITH_API_KEY`, `LANGSMITH_ENDPOINT`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING`
- Never commit `.env` files or real API keys.

## Version & Release

- Version format: CalVer `YYYY.M.D` (no zero-padding). Tag prefix: `v`.
- Release script: `bash scripts/release.sh [version]` (defaults to today's date).
- Release flow: bump version in `package.json`, create git tag, push tag, create GitHub release via `gh`.
- Do not push or publish without user confirmation.

## Testing

- Framework: Bun's built-in test runner (primary), Jest config exists for legacy compatibility.
- Tests colocated as `*.test.ts`.
- Run `bun test` before pushing when you touch logic.

## Security

- API keys stored in `.env` (gitignored). Users can also enter keys interactively via the CLI.
- Config stored in `.petyr/settings.json` (gitignored).
- Never commit or expose real API keys, tokens, or credentials.
