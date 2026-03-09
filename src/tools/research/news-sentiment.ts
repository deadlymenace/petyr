import { DynamicStructuredTool } from '@langchain/core/tools';
import Exa from 'exa-js';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { logger } from '@/utils';

const NewsSentimentInputSchema = z.object({
  ticker: z
    .string()
    .describe("The stock ticker symbol to analyze news sentiment for. For example, 'AAPL' for Apple."),
  days: z
    .number()
    .default(7)
    .describe('Number of days of recent news to analyze (default: 7, max: 30).'),
  include_social: z
    .boolean()
    .default(true)
    .describe('Include X/Twitter social sentiment alongside news sentiment (default: true). Requires EXASEARCH_API_KEY.'),
});

export function createNewsSentiment(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'get_news_sentiment',
    description: `Analyzes recent news AND social media sentiment for a stock ticker. Searches for recent headlines and X/Twitter posts, then uses LLM-based scoring to classify each as bullish, bearish, or neutral. Returns an overall sentiment score, social buzz analysis, and an AI-generated summary combining both signals. Use for:
- Quick sentiment check before making investment decisions
- Detecting shifts in market narrative around a stock
- Identifying emerging positive or negative catalysts from news flow
- Gauging both institutional (news) and retail (social) sentiment`,
    schema: NewsSentimentInputSchema,
    func: async (input) => {
      const ticker = input.ticker.toUpperCase();
      const days = Math.min(input.days, 30);
      const startDate = new Date(Date.now() - days * 86400000);

      // Run news sentiment analysis and social sentiment in parallel
      const [newsSentiment, socialSentiment] = await Promise.all([
        analyzeNewsSentiment(ticker, days, model),
        input.include_social ? analyzeSocialSentiment(ticker, days, startDate) : null,
      ]);

      // Generate AI summary combining both signals
      const aiSummary = await generateAISummary(ticker, days, newsSentiment, socialSentiment, model);

      const result: Record<string, unknown> = {
        ticker,
        period_days: days,
        ...newsSentiment,
      };

      if (socialSentiment) {
        result.social = socialSentiment;
      }

      result.ai_summary = aiSummary;

      const urls = [
        ...((newsSentiment.headlines as any[]) || []).map((h: any) => h.url).filter(Boolean),
        ...((socialSentiment?.posts as any[]) || []).map((p: any) => p.url).filter(Boolean),
      ];

      return formatToolResult(result, urls);
    },
  });
}

async function analyzeNewsSentiment(
  ticker: string,
  days: number,
  model: string
): Promise<Record<string, unknown>> {
  const sentimentPrompt = `Search for recent news about ${ticker} stock from the last ${days} days. Then analyze the sentiment.

For each headline you find, classify it as:
- "bullish" (positive for stock price)
- "bearish" (negative for stock price)
- "neutral" (no clear directional impact)

Respond with a JSON object in this exact format:
{
  "headlines": [
    { "title": "headline text", "sentiment": "bullish|bearish|neutral", "confidence": 0.0-1.0, "source": "source name" }
  ],
  "news_sentiment": "bullish|bearish|neutral",
  "news_score": -1.0 to 1.0 (where -1 is very bearish, 0 is neutral, +1 is very bullish),
  "key_themes": ["theme1", "theme2"]
}

Include 5-10 of the most impactful recent headlines.`;

  const { response } = await callLlm(sentimentPrompt, {
    model,
    systemPrompt: 'You are a financial news sentiment analyst. Always respond with valid JSON only, no markdown or explanation.',
  });

  try {
    const text = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Could not parse news sentiment', headlines: [] };
  } catch {
    return { error: 'Failed to parse news sentiment analysis', headlines: [] };
  }
}

async function analyzeSocialSentiment(
  ticker: string,
  days: number,
  startDate: Date
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.EXASEARCH_API_KEY;
  if (!apiKey) {
    return { note: 'Social sentiment unavailable — EXASEARCH_API_KEY not set', posts: [] };
  }

  try {
    const exa = new Exa(apiKey);

    const searchResult = await exa.searchAndContents(`${ticker} stock`, {
      numResults: 10,
      text: true,
      includeDomains: ['twitter.com', 'x.com'],
      startPublishedDate: startDate.toISOString(),
      category: 'tweet' as any,
    });

    const posts = (searchResult.results || []).map((r: any) => ({
      text: r.text?.slice(0, 300) || '',
      url: r.url || '',
      author: extractAuthor(r.url),
      date: r.publishedDate || null,
    }));

    // Calculate basic sentiment counts from post text
    const bullishKeywords = /bull|buy|long|moon|rocket|calls|breakout|upgrade|beat|surge|rally/i;
    const bearishKeywords = /bear|sell|short|crash|puts|breakdown|downgrade|miss|drop|plunge/i;

    let positive = 0, negative = 0, neutral = 0;
    for (const post of posts) {
      const text = post.text;
      const hasBullish = bullishKeywords.test(text);
      const hasBearish = bearishKeywords.test(text);
      if (hasBullish && !hasBearish) positive++;
      else if (hasBearish && !hasBullish) negative++;
      else neutral++;
    }

    return {
      platform: 'X/Twitter',
      post_count: posts.length,
      sentiment_breakdown: { positive, negative, neutral },
      social_score: posts.length > 0 ? Number(((positive - negative) / posts.length).toFixed(2)) : 0,
      posts: posts.slice(0, 5),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`[Social Sentiment] error: ${msg}`);
    return { error: `Social sentiment search failed: ${msg}`, posts: [] };
  }
}

async function generateAISummary(
  ticker: string,
  days: number,
  newsSentiment: Record<string, unknown>,
  socialSentiment: Record<string, unknown> | null,
  model: string
): Promise<string> {
  const newsHeadlines = ((newsSentiment.headlines as any[]) || [])
    .map((h: any) => `- [${h.sentiment}] ${h.title} (${h.source})`)
    .join('\n');

  const socialPosts = socialSentiment?.posts
    ? ((socialSentiment.posts as any[]) || [])
        .map((p: any) => `- @${p.author}: ${p.text.slice(0, 200)}`)
        .join('\n')
    : 'No social data available.';

  const socialBreakdown = socialSentiment?.sentiment_breakdown
    ? JSON.stringify(socialSentiment.sentiment_breakdown)
    : 'N/A';

  const summaryPrompt = `Provide a concise AI summary combining news and social media sentiment for ${ticker} over the last ${days} days.

NEWS SENTIMENT:
Score: ${newsSentiment.news_score ?? 'unknown'}
Direction: ${newsSentiment.news_sentiment ?? 'unknown'}
Key themes: ${JSON.stringify(newsSentiment.key_themes ?? [])}
Headlines:
${newsHeadlines || 'None available.'}

SOCIAL SENTIMENT (X/Twitter):
Score: ${socialSentiment?.social_score ?? 'N/A'}
Breakdown: ${socialBreakdown}
Sample posts:
${socialPosts}

Write a 3-5 sentence summary that:
1. States the overall sentiment direction (bullish/bearish/mixed)
2. Highlights any divergence between news and social sentiment
3. Identifies the dominant narrative driving sentiment
4. Notes any emerging risks or catalysts from social buzz
5. Gives a conviction level (high/medium/low) for the sentiment signal

Respond with plain text only, no JSON.`;

  const { response } = await callLlm(summaryPrompt, {
    model,
    systemPrompt: 'You are a financial sentiment analyst. Write clear, actionable summaries combining institutional and retail sentiment signals.',
  });

  return typeof response.content === 'string'
    ? response.content
    : JSON.stringify(response.content);
}

function extractAuthor(url: string): string {
  if (!url) return 'unknown';
  const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)/);
  return match ? match[1] : 'unknown';
}
