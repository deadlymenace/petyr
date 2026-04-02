# Petyr Test Prompts & Stress Tests

A comprehensive set of prompts to test every capability and push Petyr to its limits. Start simple, then escalate.

---

## Level 1 — Single Tool Tests

These test one tool at a time to verify each works independently.

1. **financial_search** — "What was Apple's revenue for the last 4 quarters?"
2. **financial_metrics** — "Give me NVIDIA's key financial ratios — P/E, P/S, debt-to-equity, and ROE."
3. **read_filings** — "Summarize the risk factors from Tesla's most recent 10-K filing."
4. **get_options_data** — "What does the options chain look like for AAPL? What's the implied volatility and put/call ratio telling us?"
5. **news_sentiment** — "What's the current news and social media sentiment around Microsoft?"
6. **x_research** — "What are people saying on X/Twitter about the AI chip shortage?"
7. **supply_chain_search** — "Who are the major suppliers and customers in NVIDIA's supply chain?"
8. **catalyst_search** — "What upcoming catalysts could move Amazon's stock in the next 3 months?"
9. **macro_search** — "What are the latest US inflation and unemployment numbers? How are they trending?"
10. **stock_screener** — "Screen for large-cap tech stocks with the highest revenue growth over the past year."
11. **manage_watchlist** — "Add AAPL, MSFT, NVDA, GOOGL, and AMZN to my watchlist."
12. **manage_watchlist (snapshot)** — "Show me a snapshot of my entire watchlist with current prices."

---

## Level 2 — Individual Skill Tests

These test Petyr's analytical skills one at a time.

13. **DCF** — "Run a discounted cash flow analysis on Microsoft. Use a 10% discount rate and 3% terminal growth."
14. **Comps** — "Do a comparable company analysis for Shopify against its e-commerce peers."
15. **DDM** — "Run a dividend discount model on Coca-Cola. Is it fairly valued based on its dividend?"
16. **SOTP** — "Do a sum-of-the-parts valuation of Alphabet — break out Search, YouTube, Cloud, and Waymo."
17. **Piotroski F-Score** — "Calculate the Piotroski F-Score for Intel. Is it financially healthy?"
18. **Altman Z-Score** — "Run an Altman Z-Score on Boeing. Is there bankruptcy risk?"
19. **Beneish M-Score** — "Calculate the Beneish M-Score for Super Micro Computer. Any signs of earnings manipulation?"
20. **DuPont Analysis** — "Do a DuPont decomposition of JPMorgan's ROE. What's driving their returns?"
21. **Investment Thesis** — "Build a bull and bear investment thesis for Palantir Technologies."
22. **Competitive Analysis** — "Do a competitive analysis of the cloud computing market — AWS vs Azure vs GCP."
23. **Earnings Analysis** — "Analyze Netflix's most recent earnings report. What were the key takeaways?"
24. **Earnings Surprise** — "Has AMD had any major earnings surprises in the last 4 quarters?"
25. **Analyst Ratings** — "What do Wall Street analysts think about Tesla? Show me the consensus."
26. **Technical Analysis** — "Do a technical analysis of the S&P 500. What are the key support and resistance levels?"
27. **Magic Formula** — "Screen for the top 10 Magic Formula stocks right now."
28. **ROIC Analysis** — "Analyze return on invested capital for Costco vs Walmart over the last 5 years."

---

## Level 3 — Multi-Tool Chain Prompts

These force Petyr to use multiple tools together in one query.

29. "Compare NVIDIA and AMD — give me their financials, recent news sentiment, what Twitter is saying about both, and any upcoming catalysts."

30. "I'm thinking about investing in CrowdStrike. Pull the financials, check the news sentiment, look at the options flow, and screen it against other cybersecurity stocks."

31. "What's going on with the semiconductor industry? Check macro data, supply chain for TSMC, social sentiment, and screen me the top 5 chip stocks by revenue growth."

32. "Add COST, WMT, and TGT to my watchlist, then run a comparative analysis on all three — financials, valuation, and recent sentiment."

33. "Look at Disney's 10-K risk factors, check recent news sentiment, search Twitter for what people think about their streaming strategy, and find any upcoming catalysts."

---

## Level 4 — Complex Research Requests

These simulate real-world analyst workflows with deep multi-step analysis.

34. "I have $50,000 to invest and I want exposure to AI. Research the top AI companies, compare their valuations, check sentiment, and give me a recommended portfolio allocation with reasoning."

35. "Build me a complete research report on NVIDIA — DCF valuation, comparable company analysis, earnings trends, supply chain risks, macro headwinds, options sentiment, social buzz, and a final investment recommendation."

36. "I'm worried about a recession. Analyze the current macro environment — inflation, unemployment, yield curve, Fed policy. Then screen for defensive stocks that would hold up well, and build a recession-proof watchlist."

37. "Do a deep dive into the EV market. Compare Tesla, Rivian, Lucid, and BYD across financials, valuation models, supply chain, sentiment, and catalysts. Who wins in 5 years?"

38. "Run a quality screen: find stocks with Piotroski F-Score above 7, Altman Z-Score in the safe zone, and negative Beneish M-Score (no manipulation). Then run a DCF on the top 3 results."

39. "Analyze the impact of rising interest rates on the banking sector. Check macro data, compare JPM, BAC, WFC, and GS on financials, do a DuPont analysis on each, and check what Twitter is saying about bank stocks."

40. "I want to find undervalued dividend stocks. Screen for stocks with dividend yield above 3%, run DDM on the top 5, check their Piotroski scores for financial health, and analyze recent earnings for any red flags."

---

## Level 5 — Edge Cases & Stress Tests

These test error handling, ambiguity, and unusual requests.

41. "What can you do?" *(Tests if Petyr explains its own capabilities)*

42. "Analyze a stock that doesn't exist — ticker ZZZZZ." *(Tests error handling for invalid tickers)*

43. "Compare Bitcoin to Apple stock." *(Tests handling of crypto vs equity — Bitcoin isn't a stock)*

44. "What's your opinion on the market?" *(Tests if it researches before forming opinions vs making things up)*

45. "Run every single valuation model you have on Microsoft." *(Tests running DCF + Comps + DDM + SOTP + Residual Income all at once)*

46. "Tell me about the financial health of a private company — SpaceX." *(Tests handling of companies without public filings)*

47. "What happened to Silicon Valley Bank?" *(Tests handling of delisted/bankrupt companies)*

48. "Analyze all the FAANG stocks, generate a report, and add the best one to my watchlist." *(Tests end-to-end workflow with report generation)*

49. "What will NVIDIA's stock price be in 6 months?" *(Tests if it avoids making specific price predictions vs doing proper analysis)*

50. "Run a DCF on AAPL, but use a 25% discount rate and 0% terminal growth." *(Tests if it flags unreasonable assumptions)*

---

## Level 6 — Rapid Fire Conversational Tests

Send these in quick succession to test context and session memory.

51. "Add TSLA to my watchlist."
52. "Now pull its financials."
53. "What's the sentiment?"
54. "Run a DCF on it."
55. "Actually, remove it from my watchlist and add RIVN instead."
56. "Compare RIVN to what we just looked at." *(Tests if it remembers the TSLA context)*

---

## Scoring Guide

| Result | Rating |
|--------|--------|
| Completes with accurate, sourced data | Excellent |
| Completes but data is sparse or partially wrong | Good — needs tool tuning |
| Uses wrong tools or misunderstands the request | Fair — needs prompt tuning |
| Errors out or hangs indefinitely | Fail — needs debugging |
| Makes up data without using tools | Critical — needs guardrails |

---

*Generated for Petyr v2 testing — March 2026*
