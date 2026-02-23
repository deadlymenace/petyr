---
name: technical-analysis
description: Performs technical analysis with moving averages, RSI, Bollinger Bands, and volume analysis. Triggers when user asks for technical analysis, moving averages, RSI, support/resistance, Bollinger Bands, golden cross, death cross, or overbought/oversold signals.
---

# Technical Analysis Skill

## Workflow Checklist

Copy and track progress:
```
Technical Analysis Progress:
- [ ] Step 1: Get 1 year of daily price data
- [ ] Step 2: Calculate moving averages (50-day, 200-day SMA)
- [ ] Step 3: Detect golden cross / death cross
- [ ] Step 4: Calculate RSI (14-day)
- [ ] Step 5: Calculate Bollinger Bands
- [ ] Step 6: Volume trend analysis
```

## Step 1: Get Price Data

Call the `financial_search` tool:

**Query:** `"[TICKER] daily stock prices for the last 1 year"`

This will use `get_stock_prices` to fetch daily OHLCV data.

**Extract:** Array of `{ date, open, high, low, close, volume }`

Also get current price:
**Query:** `"[TICKER] price snapshot"`

## Step 2: Moving Averages

### 50-Day Simple Moving Average (SMA)
- Average of last 50 closing prices
- Represents medium-term trend

### 200-Day Simple Moving Average (SMA)
- Average of last 200 closing prices
- Represents long-term trend

### Current Position
- Price > 50-SMA > 200-SMA: **Strong uptrend**
- Price > 200-SMA but < 50-SMA: **Possible pullback in uptrend**
- Price < 50-SMA < 200-SMA: **Strong downtrend**
- Price < 200-SMA but > 50-SMA: **Possible recovery from downtrend**

## Step 3: Golden Cross / Death Cross

- **Golden Cross**: 50-SMA crosses ABOVE 200-SMA → bullish signal
- **Death Cross**: 50-SMA crosses BELOW 200-SMA → bearish signal
- Check if either occurred in the last 90 days

## Step 4: RSI (Relative Strength Index)

14-day RSI calculation:
1. Calculate daily price changes
2. Separate gains and losses
3. Average gain = SMA of gains over 14 days
4. Average loss = SMA of losses over 14 days
5. RS = Average Gain / Average Loss
6. RSI = 100 - (100 / (1 + RS))

**Interpretation:**
- RSI > 70: **Overbought** — potential reversal or pullback
- RSI 30-70: **Neutral** — normal trading range
- RSI < 30: **Oversold** — potential bounce or recovery

## Step 5: Bollinger Bands

20-day period, 2 standard deviations:
1. Middle Band = 20-day SMA
2. Upper Band = 20-day SMA + (2 × 20-day StdDev)
3. Lower Band = 20-day SMA - (2 × 20-day StdDev)

**Interpretation:**
- Price near upper band: Potential overbought / resistance
- Price near lower band: Potential oversold / support
- Bandwidth narrowing: **Squeeze** — expect increased volatility
- Price outside bands: Strong momentum (but often mean-reverts)

## Step 6: Volume Analysis

- Calculate 20-day average volume
- Compare recent volume to average:
  - Volume > 1.5× average on up days: Bullish confirmation
  - Volume > 1.5× average on down days: Bearish confirmation
  - Declining volume on price rise: Weakening momentum

## Output Format

Present a structured summary including:
1. **Technical Summary**: Current price, trend direction, key signals
2. **Moving Averages Table**: 50-SMA, 200-SMA, current price vs each
3. **Signals**: Golden/Death cross (if recent), RSI level, Bollinger Band position
4. **RSI**: Current value with interpretation
5. **Volume**: Recent vs average, trend
6. **Key Levels**: Approximate support (recent lows, lower BB) and resistance (recent highs, upper BB)
7. **Caveats**: Technical analysis is backward-looking and works best in trending markets. Combine with fundamental analysis for investment decisions. Past patterns do not guarantee future movement.
