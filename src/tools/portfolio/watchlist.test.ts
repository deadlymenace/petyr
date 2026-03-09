import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

// Watchlist uses process.cwd() + '.petyr/watchlist.json'
const WATCHLIST_DIR = join(process.cwd(), '.petyr');
const WATCHLIST_PATH = join(WATCHLIST_DIR, 'watchlist.json');

// We test the watchlist tool's behavior by importing it and calling .invoke()
// Since watchlistTool uses callApi for snapshots (external), we only test
// add, remove, and list actions which are pure local logic.

describe('watchlist tool', () => {
  let originalWatchlist: string | null = null;

  beforeEach(() => {
    // Backup existing watchlist if present
    if (existsSync(WATCHLIST_PATH)) {
      originalWatchlist = readFileSync(WATCHLIST_PATH, 'utf-8');
    }
    // Start clean
    if (existsSync(WATCHLIST_PATH)) {
      rmSync(WATCHLIST_PATH);
    }
  });

  afterEach(() => {
    // Restore or clean up
    if (originalWatchlist !== null) {
      mkdirSync(WATCHLIST_DIR, { recursive: true });
      writeFileSync(WATCHLIST_PATH, originalWatchlist, 'utf-8');
      originalWatchlist = null;
    } else if (existsSync(WATCHLIST_PATH)) {
      rmSync(WATCHLIST_PATH);
    }
  });

  test('list returns empty watchlist when file does not exist', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    const result = await watchlistTool.invoke({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.data.count).toBe(0);
    expect(parsed.data.watchlist).toEqual([]);
  });

  test('add creates watchlist file and adds ticker', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    const result = await watchlistTool.invoke({ action: 'add', ticker: 'AAPL' });
    const parsed = JSON.parse(result);
    expect(parsed.data.message).toContain('Added AAPL');
    expect(parsed.data.watchlist).toContain('AAPL');
    expect(existsSync(WATCHLIST_PATH)).toBe(true);
  });

  test('add with notes stores notes', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    await watchlistTool.invoke({ action: 'add', ticker: 'NVDA', notes: 'watching for earnings' });
    const data = JSON.parse(readFileSync(WATCHLIST_PATH, 'utf-8'));
    expect(data[0].ticker).toBe('NVDA');
    expect(data[0].notes).toBe('watching for earnings');
  });

  test('add duplicate ticker returns already-in-watchlist message', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    await watchlistTool.invoke({ action: 'add', ticker: 'AAPL' });
    const result = await watchlistTool.invoke({ action: 'add', ticker: 'AAPL' });
    const parsed = JSON.parse(result);
    expect(parsed.data.message).toContain('already in the watchlist');
  });

  test('add normalizes ticker to uppercase', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    await watchlistTool.invoke({ action: 'add', ticker: 'aapl' });
    const result = await watchlistTool.invoke({ action: 'list' });
    const parsed = JSON.parse(result);
    expect(parsed.data.watchlist[0].ticker).toBe('AAPL');
  });

  test('remove deletes ticker from watchlist', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    await watchlistTool.invoke({ action: 'add', ticker: 'AAPL' });
    await watchlistTool.invoke({ action: 'add', ticker: 'MSFT' });
    const result = await watchlistTool.invoke({ action: 'remove', ticker: 'AAPL' });
    const parsed = JSON.parse(result);
    expect(parsed.data.message).toContain('Removed AAPL');
    expect(parsed.data.watchlist).toEqual(['MSFT']);
  });

  test('remove non-existent ticker returns not-in-watchlist message', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    const result = await watchlistTool.invoke({ action: 'remove', ticker: 'AAPL' });
    const parsed = JSON.parse(result);
    expect(parsed.data.message).toContain('was not in the watchlist');
  });

  test('add without ticker returns error', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    const result = await watchlistTool.invoke({ action: 'add' });
    const parsed = JSON.parse(result);
    expect(parsed.data.error).toContain('Ticker is required');
  });

  test('snapshot on empty watchlist returns empty message', async () => {
    const { watchlistTool } = await import('./watchlist.js');
    const result = await watchlistTool.invoke({ action: 'snapshot' });
    const parsed = JSON.parse(result);
    expect(parsed.data.message).toContain('empty');
  });
});
