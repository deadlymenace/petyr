---
name: beta-sharpe
description: Calculates beta, Sharpe ratio, and risk-adjusted return metrics. Triggers when user asks for beta, Sharpe ratio, risk-adjusted returns, volatility analysis, or stock risk metrics.
---

# Beta & Sharpe Ratio Skill

## Workflow Checklist

Copy and track progress:
```
Beta & Sharpe Analysis Progress:
- [ ] Step 1: Get 3 years of monthly prices (stock + S&P 500)
- [ ] Step 2: Calculate monthly returns
- [ ] Step 3: Calculate Beta
- [ ] Step 4: Calculate Sharpe Ratio
- [ ] Step 5: Calculate additional risk metrics
- [ ] Step 6: Present results
```

## Step 1: Get Price Data

Call the `financial_search` tool:

### 1.1 Stock Prices (3 years, monthly)
**Query:** `"[TICKER] monthly stock prices for the last 3 years"`

### 1.2 S&P 500 Prices (3 years, monthly)
**Query:** `"SPY monthly stock prices for the last 3 years"`

SPY is used as the market proxy (S&P 500 ETF).

### 1.3 Risk-Free Rate
Use current 3-month Treasury rate. A reasonable default is 4-5% annualized (current environment).

Optionally query `macro_search` for current FEDFUNDS or DGS3MO if available.

## Step 2: Calculate Monthly Returns

For both stock and SPY:
**Monthly Return = (Price_t - Price_t-1) / Price_t-1**

Should produce ~35 monthly returns from 36 monthly prices.

## Step 3: Calculate Beta

**Beta = Cov(R_stock, R_market) / Var(R_market)**

Where:
- Cov = covariance of stock and market monthly returns
- Var = variance of market monthly returns

**Interpretation:**
- Beta > 1: Stock is more volatile than the market
- Beta = 1: Stock moves with the market
- Beta < 1: Stock is less volatile than the market
- Beta < 0: Stock moves inversely to market (rare)

## Step 4: Calculate Sharpe Ratio

**Sharpe = (Annualized Return - Risk-Free Rate) / Annualized Volatility**

Where:
- Annualized Return = Average Monthly Return × 12
- Annualized Volatility = StdDev of Monthly Returns × √12
- Risk-Free Rate = Current 3-month Treasury rate (annualized)

**Interpretation:**
- Sharpe > 1.0: **Excellent** risk-adjusted returns
- Sharpe 0.5-1.0: **Good** risk-adjusted returns
- Sharpe 0.0-0.5: **Mediocre** — risk may not be adequately compensated
- Sharpe < 0: **Negative** — underperforming risk-free rate

## Step 5: Additional Risk Metrics

### Annualized Volatility
**Volatility = StdDev(Monthly Returns) × √12**

### Maximum Drawdown
Find the largest peak-to-trough decline in the price series.

### Sortino Ratio (optional)
Like Sharpe but only penalizes downside volatility:
**Sortino = (Annualized Return - Risk-Free Rate) / Downside Deviation**

Where Downside Deviation only uses negative returns in the StdDev calculation.

### Alpha (Jensen's Alpha)
**Alpha = Annualized Stock Return - [Risk-Free Rate + Beta × (Market Return - Risk-Free Rate)]**

- Alpha > 0: Stock outperformed on a risk-adjusted basis
- Alpha < 0: Stock underperformed on a risk-adjusted basis

## Step 6: Output Format

Present a structured summary including:
1. **Risk Metrics Summary**: Beta, Sharpe, Volatility, Max Drawdown
2. **Detailed Metrics Table**: Metric, Stock, S&P 500, Interpretation
3. **Beta Analysis**: Value, meaning, sector context
4. **Risk-Adjusted Returns**: Sharpe ratio with interpretation, Alpha
5. **Volatility Context**: Annualized vol vs market, max drawdown period
6. **Caveats**: Beta is backward-looking and can change. 3-year monthly data is standard but different windows may give different results. Sharpe ratio assumes normally distributed returns (doesn't capture tail risk well).
