import { DynamicStructuredTool } from '@langchain/core/tools';
import Exa from 'exa-js';
import { z } from 'zod';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { logger } from '@/utils';

const PLATFORM_DOMAINS: Record<string, string[]> = {
  twitter: ['twitter.com', 'x.com'],
  reddit: ['reddit.com'],
  stocktwits: ['stocktwits.com'],
  hackernews: ['news.ycombinator.com'],
  youtube: ['youtube.com'],
  substack: ['substack.com'],
  linkedin: ['linkedin.com'],
};

const ALL_DOMAINS = Object.values(PLATFORM_DOMAINS).flat();

const XResearchInputSchema = z.object({
  query: z
    .string()
    .describe('The topic to research across social media. Examples: "NVDA earnings reaction", "what are developers saying about Rust", "AI regulation debate", "community reaction to OpenAI announcement"'),
  days: z
    .number()
    .default(7)
    .describe('Number of days to look back (default: 7, max: 30).'),
  max_results: z
    .number()
    .default(15)
    .describe('Maximum number of posts to retrieve (default: 15, max: 25).'),
  platforms: z
    .array(z.enum(['twitter', 'reddit', 'stocktwits', 'hackernews', 'youtube', 'substack', 'linkedin']))
    .optional()
    .describe('Filter to specific platforms. If omitted, searches all platforms. Examples: ["twitter", "reddit"] for just those two.'),
  focus: z
    .enum(['sentiment', 'expert_opinions', 'community_reaction', 'breaking_news', 'general'])
    .default('general')
    .describe('Analysis focus area. "sentiment" for bullish/bearish scoring, "expert_opinions" for notable voices, "community_reaction" for consensus/dissent, "breaking_news" for developing stories, "general" for broad synthesis.'),
});

export function createXResearch(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'x_research',
    description: `Multi-platform social media research agent. Searches X/Twitter, Reddit, StockTwits, HackerNews, YouTube, Substack, and LinkedIn for real-time perspectives, expert opinions, community sentiment, and breaking news reactions. Synthesizes posts into structured insights with themes, sentiment, notable voices, and consensus analysis. Supports platform filtering and focus modes (sentiment, expert_opinions, community_reaction, breaking_news). Use for any query where social discourse adds context — financial sentiment, tech opinions, community reactions, expert takes, or breaking news.`,
    schema: XResearchInputSchema,
    func: async (input) => {
      const apiKey = process.env.EXASEARCH_API_KEY;
      if (!apiKey) {
        return formatToolResult({ error: 'EXASEARCH_API_KEY is required for X/Twitter research. Set it in your .env file.' }, []);
      }

      const days = Math.min(input.days, 30);
      const maxResults = Math.min(input.max_results, 25);
      const startDate = new Date(Date.now() - days * 86400000);

      // Resolve platform filter to domains
      const domains = input.platforms?.length
        ? input.platforms.flatMap(p => PLATFORM_DOMAINS[p] ?? [])
        : ALL_DOMAINS;

      try {
        const exa = new Exa(apiKey);

        // Search social media using Exa's domain filtering
        const searchResult = await exa.searchAndContents(input.query, {
          numResults: maxResults,
          text: true,
          includeDomains: domains,
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

        // Build focus-specific synthesis instructions
        const focusInstructions = buildFocusInstructions(input.focus);
        const platformSummary = [...new Set(posts.map((p: any) => p.platform))].join(', ');

        // Use LLM to synthesize the posts into insights
        const synthesisPrompt = `Analyze these ${posts.length} social media posts from ${platformSummary} about "${input.query}" (last ${days} days).

${focusInstructions}

Posts:
${posts.map((p: any, i: number) => `[${i + 1}] [${p.platform}] @${p.author}${p.published_date ? ` (${p.published_date})` : ''}: ${p.text}`).join('\n\n')}

Respond with a JSON object:
{
  "query": "${input.query}",
  "period_days": ${days},
  "post_count": ${posts.length},
  "platforms_searched": "${platformSummary}",
  "key_themes": ["theme1", "theme2", "theme3"],
  "sentiment_breakdown": { "positive": 0, "negative": 0, "neutral": 0, "score": -1.0 to 1.0 },
  "notable_voices": ["@handle1 — key point", "@handle2 — key point"],
  "consensus": "brief description of the dominant view",
  "contrarian_takes": "any notable dissenting opinions",
  "platform_differences": "how sentiment/discussion differs across platforms (if applicable)",
  "momentum": "is sentiment strengthening, weakening, or stable over the period?",
  "confidence": "high/medium/low — how reliable is this signal given post volume and quality?",
  "summary": "3-4 sentence synthesis of what the social discourse reveals"
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
  if (url.includes('news.ycombinator.com')) return 'HackerNews';
  if (url.includes('youtube.com')) return 'YouTube';
  if (url.includes('substack.com')) return 'Substack';
  if (url.includes('linkedin.com')) return 'LinkedIn';
  return 'Web';
}

function buildFocusInstructions(focus: string): string {
  switch (focus) {
    case 'sentiment':
      return `FOCUS: Sentiment analysis. Pay close attention to bullish vs. bearish signals, emotional intensity, and whether sentiment is shifting. Score each post and provide a weighted overall sentiment score from -1.0 (very negative) to +1.0 (very positive). Flag any sentiment divergence between platforms.`;
    case 'expert_opinions':
      return `FOCUS: Expert and influencer opinions. Prioritize posts from verified accounts, known analysts, developers, or domain experts. Identify who the notable voices are, what their track record suggests, and where experts agree or disagree. Weight expert opinions higher than general discussion.`;
    case 'community_reaction':
      return `FOCUS: Community reaction analysis. Look for consensus vs. dissent, how the community is splitting on the topic, what the majority view is, and what contrarian takes exist. Identify if the reaction is evolving over time. Note any echo chamber effects or genuine debate.`;
    case 'breaking_news':
      return `FOCUS: Breaking news and developing story. Prioritize the most recent posts, track how the narrative is evolving in real-time, identify the earliest reports, and flag any unverified claims vs. confirmed information. Note the speed and breadth of the reaction.`;
    default:
      return `Provide a balanced synthesis covering sentiment, key themes, notable voices, and any consensus or contrarian views.`;
  }
}
