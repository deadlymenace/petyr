import { describe, test, expect } from 'bun:test';
import { createXResearch } from './x-research.js';

describe('x-research tool', () => {
  test('creates tool with correct name', () => {
    const tool = createXResearch('gpt-4o');
    expect(tool.name).toBe('x_research');
  });

  test('has schema with query, days, and max_results fields', () => {
    const tool = createXResearch('gpt-4o');
    const schema = tool.schema as any;
    expect(schema.shape.query).toBeDefined();
    expect(schema.shape.days).toBeDefined();
    expect(schema.shape.max_results).toBeDefined();
  });

  test('description mentions X/Twitter research', () => {
    const tool = createXResearch('gpt-4o');
    expect(tool.description).toContain('X/Twitter');
  });

  test('returns error when EXASEARCH_API_KEY is not set', async () => {
    const originalKey = process.env.EXASEARCH_API_KEY;
    delete process.env.EXASEARCH_API_KEY;

    try {
      const tool = createXResearch('gpt-4o');
      const result = await tool.invoke({ query: 'test query' });
      const parsed = JSON.parse(result);
      expect(parsed.data.error).toContain('EXASEARCH_API_KEY');
    } finally {
      if (originalKey) process.env.EXASEARCH_API_KEY = originalKey;
    }
  });
});
