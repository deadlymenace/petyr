import { DynamicStructuredTool } from '@langchain/core/tools';
import Exa from 'exa-js';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { logger } from '@/utils';

const XResearchInputSchema = z.object({
  query: z
    .string()
    .describe('The topic to research on X/Twitter. Examples: "NVDA earnings reaction", "what are developers saying about Rust", "AI regulation debate"'),
  days: z
    .number()
    .default(7)
    .describe('Number of days to look back (default: 7, max: 30).'),
  max_results: z
    .number()
    .default(10)
    .describe('Maximum number of tweets/posts to retrieve (default: 10, max: 25).'),
});

export function createXResearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'x_research',
    description: `General-purpose social media research agent. Searches X/Twitter, Reddit, StockTwits, and forums for real-time perspectives, dev discussions, product feedback, cultural takes, breaking news, and expert opinions. Use when:
- User says "search x for", "what are people saying about", "what's twitter saying", "check social media"
- User wants to find what devs/experts/community thinks about a topic
- Social sentiment would add context to financial analysis (e.g., retail investor sentiment)
- Breaking news or reactions to events are unfolding on social media
NOT for: posting tweets or account management. Uses recent search (last 7-30 days).`,
    schema: XResearchInputSchema,
    func: async (input) => {
      const apiKey = process.env.EXASEARCH_API_KEY;
      if (!apiKey) {
        return formatToolResult({ error: 'EXASEARCH_API_KEY is required for X/Twitter research. Set it in your .env file.' }, []);
      }

      const days = Math.min(input.days, 30);
      const maxResults = Math.min(input.max_results, 25);
      const startDate = new Date(Date.now() - days * 86400000);

      try {
        const exa = new Exa(apiKey);

        // Search social media using Exa's domain filtering
        const searchResult = await exa.searchAndContents(input.query, {
          numResults: maxResults,
          text: true,
          includeDomains: ['reddit.com', 'stocktwits.com', 'twitter.com', 'x.com'],
          startPublishedDate: startDate.toISOString(),
        });

        const posts = (searchResult.results || []).map((r: any) => ({
          text: r.text?.slice(0, 500) || '',
          url: r.url || '',
          author: r.author || extractAuthorFromUrl(r.url),
          platform: extractPlatform(r.url),
          published_date: r.publishedDate || null,
          score: r.score || null,
        }));

        if (posts.length === 0) {
          return formatToolResult({
            query: input.query,
            period_days: days,
            posts: [],
            summary: `No X/Twitter posts found for "${input.query}" in the last ${days} days.`,
          }, []);
        }

        // Use LLM to synthesize the posts into insights
        const synthesisPrompt = `Analyze these social media posts about "${input.query}" and provide a synthesis.

Posts:
${posts.map((p: any, i: number) => `[${i + 1}] [${p.platform}] @${p.author}: ${p.text}`).join('\n\n')}

Respond with a JSON object:
{
  "query": "${input.query}",
  "period_days": ${days},
  "post_count": ${posts.length},
  "key_themes": ["theme1", "theme2", "theme3"],
  "sentiment_breakdown": { "positive": 0, "negative": 0, "neutral": 0 },
  "notable_voices": ["@handle1 — key point", "@handle2 — key point"],
  "consensus": "brief description of the dominant view",
  "contrarian_takes": "any notable dissenting opinions",
  "summary": "2-3 sentence synthesis of what X/Twitter is saying"
}`;

        const { response } = await callLlm(synthesisPrompt, {
          model,
          systemPrompt: 'You are a social media analyst. Synthesize X/Twitter discourse into structured insights. Respond with JSON only.',
        });

        let analysis: Record<string, unknown>;
        try {
          const text = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: text };
        } catch {
          analysis = { summary: 'Could not parse synthesis', post_count: posts.length };
        }

        // Include raw posts for transparency
        analysis.posts = posts.slice(0, 5).map((p: any) => ({
          author: p.author,
          text: p.text.slice(0, 280),
          url: p.url,
        }));

        const urls = posts.map((p: any) => p.url).filter(Boolean);
        return formatToolResult(analysis, urls);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[X Research] error: ${message}`);
        return formatToolResult({ error: `X/Twitter search failed: ${message}`, query: input.query }, []);
      }
    },
  });
}

function extractAuthorFromUrl(url: string): string {
  if (!url) return 'unknown';
  const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/([^/]+)/);
  if (twitterMatch) return twitterMatch[1];
  const redditMatch = url.match(/reddit\.com\/(?:r\/\w+\/comments\/\w+\/\w+\/(\w+)|user\/(\w+))/);
  if (redditMatch) return redditMatch[1] || redditMatch[2] || 'reddit_user';
  return 'unknown';
}

function extractPlatform(url: string): string {
  if (!url) return 'unknown';
  if (url.includes('reddit.com')) return 'Reddit';
  if (url.includes('stocktwits.com')) return 'StockTwits';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'X/Twitter';
  return 'Web';
}
