import { readCache, writeCache, describeRequest } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

const BASE_URL = 'https://api.stlouisfed.org/fred';

export interface FredApiResponse {
  data: Record<string, unknown>;
  url: string;
}

export async function callFredApi(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  options?: { cacheable?: boolean }
): Promise<FredApiResponse> {
  const label = describeRequest(endpoint, params);

  // Check local cache first
  if (options?.cacheable) {
    const cached = readCache(`fred${endpoint}`, params);
    if (cached) {
      return cached as FredApiResponse;
    }
  }

  // Read API key lazily at call time (after dotenv has loaded)
  const FRED_API_KEY = process.env.FRED_API_KEY;

  if (!FRED_API_KEY) {
    logger.warn(`[FRED API] call without key: ${label}`);
    throw new Error('[FRED API] FRED_API_KEY not found in environment variables');
  }

  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', FRED_API_KEY);
  url.searchParams.append('file_type', 'json');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[FRED API] network error: ${label} — ${message}`);
    throw new Error(`[FRED API] request failed for ${label}: ${message}`);
  }

  if (!response.ok) {
    const detail = `${response.status} ${response.statusText}`;
    logger.error(`[FRED API] error: ${label} — ${detail}`);
    throw new Error(`[FRED API] request failed: ${detail}`);
  }

  const data = await response.json().catch(() => {
    const detail = `invalid JSON (${response.status} ${response.statusText})`;
    logger.error(`[FRED API] parse error: ${label} — ${detail}`);
    throw new Error(`[FRED API] request failed: ${detail}`);
  });

  // Strip API key from URL before storing/returning
  const cleanUrl = new URL(url.toString());
  cleanUrl.searchParams.delete('api_key');

  if (options?.cacheable) {
    writeCache(`fred${endpoint}`, params, data, cleanUrl.toString());
  }

  return { data, url: cleanUrl.toString() };
}
