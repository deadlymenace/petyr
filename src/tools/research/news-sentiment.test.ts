import { describe, test, expect } from 'bun:test';
import { createNewsSentiment } from './news-sentiment.js';

describe('news-sentiment tool', () => {
  test('creates tool with correct name', () => {
    const tool = createNewsSentiment('gpt-4o');
    expect(tool.name).toBe('get_news_sentiment');
  });

  test('has schema with ticker, days, and include_social fields', () => {
    const tool = createNewsSentiment('gpt-4o');
    const schema = tool.schema as any;
    expect(schema.shape.ticker).toBeDefined();
    expect(schema.shape.days).toBeDefined();
    expect(schema.shape.include_social).toBeDefined();
  });

  test('description mentions social sentiment', () => {
    const tool = createNewsSentiment('gpt-4o');
    expect(tool.description).toContain('social');
  });
});
