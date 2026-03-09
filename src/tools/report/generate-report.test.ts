import { describe, test, expect } from 'bun:test';
import { createGenerateReport } from './generate-report.js';

describe('generate-report tool', () => {
  test('creates tool with correct name', () => {
    const tool = createGenerateReport('gpt-4o');
    expect(tool.name).toBe('generate_report');
  });

  test('has schema with title and format fields', () => {
    const tool = createGenerateReport('gpt-4o');
    const schema = tool.schema as any;
    expect(schema.shape.title).toBeDefined();
    expect(schema.shape.format).toBeDefined();
  });

  test('returns error when no scratchpad data is available', async () => {
    const tool = createGenerateReport('gpt-4o');
    // Call without scratchpad in config metadata
    const result = await tool.invoke({ format: 'markdown' });
    const parsed = JSON.parse(result);
    expect(parsed.data.error).toContain('No analysis data available');
  });
});
