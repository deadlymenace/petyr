import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { callApi } from '../finance/api.js';
import { formatToolResult } from '../types.js';

const PETYR_DIR = resolve(process.cwd(), '.petyr');
const WATCHLIST_PATH = join(PETYR_DIR, 'watchlist.json');

// Sandbox validation — ensure write path stays within .petyr/
const resolvedWatchlistPath = resolve(WATCHLIST_PATH);
if (!resolvedWatchlistPath.startsWith(PETYR_DIR)) {
  throw new Error('Watchlist path resolves outside .petyr/ directory');
}

interface WatchlistEntry {
  ticker: string;
  added_at: string;
  notes?: string;
}

function loadWatchlist(): WatchlistEntry[] {
  if (!existsSync(WATCHLIST_PATH)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(WATCHLIST_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveWatchlist(entries: WatchlistEntry[]): void {
  const dir = join(process.cwd(), '.petyr');
  mkdirSync(dir, { recursive: true });
  writeFileSync(WATCHLIST_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

const WatchlistInputSchema = z.object({
  action: z
    .enum(['add', 'remove', 'list', 'snapshot'])
    .describe("Action to perform: 'add' a ticker, 'remove' a ticker, 'list' all tickers, or 'snapshot' to get current prices for all watchlist stocks."),
  ticker: z
    .string()
    .optional()
    .describe("Stock ticker symbol (required for 'add' and 'remove' actions)."),
  notes: z
    .string()
    .optional()
    .describe("Optional notes to attach when adding a ticker (e.g., 'watching for Q3 earnings')."),
});

export const watchlistTool = new DynamicStructuredTool({
  name: 'manage_watchlist',
  description: `Manages a persistent stock watchlist stored locally. Add, remove, list tickers, or get a price snapshot of all watchlist stocks. Use for:
- Tracking stocks the user is interested in across sessions
- Getting quick price updates on followed stocks
- Maintaining a research universe`,
  schema: WatchlistInputSchema,
  func: async (input) => {
    const entries = loadWatchlist();

    switch (input.action) {
      case 'add': {
        if (!input.ticker) {
          return formatToolResult({ error: 'Ticker is required for add action' }, []);
        }
        const ticker = input.ticker.toUpperCase();
        if (entries.some((e) => e.ticker === ticker)) {
          return formatToolResult({ message: `${ticker} is already in the watchlist`, watchlist: entries.map((e) => e.ticker) }, []);
        }
        entries.push({ ticker, added_at: new Date().toISOString(), notes: input.notes });
        saveWatchlist(entries);
        return formatToolResult({ message: `Added ${ticker} to watchlist`, watchlist: entries.map((e) => e.ticker) }, []);
      }

      case 'remove': {
        if (!input.ticker) {
          return formatToolResult({ error: 'Ticker is required for remove action' }, []);
        }
        const ticker = input.ticker.toUpperCase();
        const filtered = entries.filter((e) => e.ticker !== ticker);
        if (filtered.length === entries.length) {
          return formatToolResult({ message: `${ticker} was not in the watchlist`, watchlist: entries.map((e) => e.ticker) }, []);
        }
        saveWatchlist(filtered);
        return formatToolResult({ message: `Removed ${ticker} from watchlist`, watchlist: filtered.map((e) => e.ticker) }, []);
      }

      case 'list': {
        return formatToolResult({
          count: entries.length,
          watchlist: entries.map((e) => ({ ticker: e.ticker, added_at: e.added_at, notes: e.notes })),
        }, []);
      }

      case 'snapshot': {
        if (entries.length === 0) {
          return formatToolResult({ message: 'Watchlist is empty. Add tickers first.' }, []);
        }

        const snapshots = await Promise.all(
          entries.map(async (entry) => {
            try {
              const { data } = await callApi('/prices/snapshot/', { ticker: entry.ticker });
              const snapshot = data.snapshot as Record<string, unknown> | undefined;
              return {
                ticker: entry.ticker,
                price: snapshot?.price,
                change: snapshot?.day_change,
                change_percent: snapshot?.day_change_percent,
                volume: snapshot?.volume,
                notes: entry.notes,
              };
            } catch {
              return { ticker: entry.ticker, error: 'Failed to fetch price', notes: entry.notes };
            }
          })
        );

        return formatToolResult({ count: snapshots.length, snapshots }, []);
      }
    }
  },
});
