import { describe, test, expect } from 'bun:test';
import { createStockScreener } from './stock-screener.js';

describe('stock-screener tool', () => {
  test('creates tool with correct name', () => {
    const tool = createStockScreener('gpt-4o');
    expect(tool.name).toBe('stock_screener');
  });

  test('has schema with query field', () => {
    const tool = createStockScreener('gpt-4o');
    const schema = tool.schema as any;
    expect(schema.shape.query).toBeDefined();
  });

  test('description mentions ranking and comparing', () => {
    const tool = createStockScreener('gpt-4o');
    expect(tool.description).toContain('rank');
  });
});
