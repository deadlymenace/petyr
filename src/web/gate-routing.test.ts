/**
 * Integration tests for the invite gate at the HTTP/routing layer.
 *
 * These guard the headline security behaviors that unit tests on InviteStore
 * cannot: that a GET ?code= NEVER consumes a one-time code (only POST
 * /invite/claim does), that the gate blocks the app/API without a valid
 * cookie, and that the public landing stays open.
 *
 * Env is set BEFORE importing server.ts because it binds PETYR_DATA_DIR /
 * PETYR_ADMIN_TOKEN into module-level singletons at import time.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const dir = mkdtempSync(join(tmpdir(), 'petyr-gate-'));
process.env.PETYR_DATA_DIR = dir;
process.env.PETYR_ADMIN_TOKEN = 'test-admin-token';
delete process.env.PETYR_INVITE_CODES; // gate driven purely by one-time codes
// Lets the waitlist tests use their own rate-limit bucket via X-Forwarded-For;
// requests without the header still key on the socket IP as before.
process.env.PETYR_TRUST_PROXY = '1';

const { startServer } = await import('./server.js');
const server = startServer(0);
const base = `http://localhost:${server.port}`;
const ADMIN = { Authorization: 'Bearer test-admin-token' };

beforeAll(async () => {
  // Activate the gate. In a real deployment it is active because master
  // codes (PETYR_INVITE_CODES) or previously-issued one-time codes exist;
  // here we prime it with one code so the gated-route assertions are valid.
  await fetch(`${base}/api/invites/generate?count=1`, { method: 'POST', headers: ADMIN });
});

afterAll(() => {
  server.stop(true);
  rmSync(dir, { recursive: true, force: true });
});

async function generateCode(): Promise<string> {
  const res = await fetch(`${base}/api/invites/generate?count=1`, { method: 'POST', headers: ADMIN });
  const body = await res.json();
  return body.codes[0];
}

async function unusedCount(): Promise<number> {
  const res = await fetch(`${base}/api/invites`, { headers: ADMIN });
  return (await res.json()).unused;
}

/** Pull the petyr_access value out of a Set-Cookie header. */
function cookieFrom(res: Response): string | null {
  const sc = res.headers.get('set-cookie') || '';
  const m = sc.match(/petyr_access=([^;]+)/);
  return m ? `petyr_access=${m[1]}` : null;
}

describe('gate routing', () => {
  test('public landing is reachable without a code', async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Know');
  });

  test('landing page scripts are reachable without a code', async () => {
    // Own rate-limit bucket: the other gate tests use most of the per-IP budget.
    const headers = { 'X-Forwarded-For': '203.0.113.8' };
    for (const path of ['/landing.js', '/companion.js']) {
      const res = await fetch(`${base}${path}`, { headers });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('javascript');
    }
  });

  test('/app is gated without a cookie', async () => {
    const res = await fetch(`${base}/app`);
    const html = await res.text();
    expect(html).toContain('invite code'); // the gate form, not the app
    expect(html).not.toContain('AI Financial Research Agent');
  });

  test('chat API is 401 without a cookie', async () => {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'hi' }),
    });
    expect(res.status).toBe(401);
  });

  test('GET ?code= shows the claim page and does NOT consume the code', async () => {
    const code = await generateCode();
    const before = await unusedCount();

    // Three GETs simulating link-preview bots
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${base}/?code=${code}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('Activate invite');
    }

    expect(await unusedCount()).toBe(before); // still unused — bots can't burn it
  });

  test('POST /invite/claim consumes the code once and grants access', async () => {
    const code = await generateCode();
    const before = await unusedCount();

    const res = await fetch(`${base}/invite/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `code=${encodeURIComponent(code)}`,
      redirect: 'manual',
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/app');

    const cookie = cookieFrom(res);
    expect(cookie).toBeTruthy();

    // The grant cookie opens /app
    const appRes = await fetch(`${base}/app`, { headers: { Cookie: cookie! } });
    expect(await appRes.text()).toContain('AI Financial Research Agent');

    // Code is now consumed
    expect(await unusedCount()).toBe(before - 1);

    // Second claim of the same code is rejected
    const again = await fetch(`${base}/invite/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `code=${encodeURIComponent(code)}`,
    });
    expect(await again.text()).toContain('Invalid or already-used');
  });

  test('a malformed cookie fails closed without a 500', async () => {
    const res = await fetch(`${base}/app`, { headers: { Cookie: 'petyr_access=%' } });
    expect(res.status).toBe(200); // gate form, not a crash
    expect(await res.text()).toContain('invite code');
  });

  test('admin endpoints require the bearer token', async () => {
    expect((await fetch(`${base}/api/invites`)).status).toBe(401);
    expect((await fetch(`${base}/api/invites/generate`, { method: 'POST' })).status).toBe(401);
  });
});

describe('waitlist', () => {
  // The gate tests above use most of the per-IP request budget.
  const CLIENT = { 'X-Forwarded-For': '203.0.113.7' };

  async function join(body: Record<string, unknown>): Promise<Response> {
    return fetch(`${base}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...CLIENT },
      body: JSON.stringify(body),
    });
  }

  async function storedEntry(email: string): Promise<Record<string, unknown> | undefined> {
    const res = await fetch(`${base}/api/waitlist/export?format=jsonl`, { headers: { ...ADMIN, ...CLIENT } });
    return (await res.text())
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line) as Record<string, unknown>)
      .find(e => e.email === email);
  }

  test('stores allowlisted interests and region, dropping unknown values', async () => {
    const res = await join({
      email: 'context@example.com',
      source: 'vault-hero',
      region: 'non-us',
      interests: ['treasuries', 'gold', 'gold', 'meme-coins', 42],
    });
    expect(res.status).toBe(200);

    const entry = await storedEntry('context@example.com');
    expect(entry?.region).toBe('non-us');
    expect(entry?.interests).toEqual(['treasuries', 'gold']);
    expect(entry?.source).toBe('vault-hero');
  });

  test('signup without context still works and stores no context fields', async () => {
    expect((await join({ email: 'plain@example.com', region: 'mars' })).status).toBe(200);

    const entry = await storedEntry('plain@example.com');
    expect(entry).toBeDefined();
    expect(entry).not.toHaveProperty('region');
    expect(entry).not.toHaveProperty('interests');
  });

  test('CSV export includes region and interests columns', async () => {
    const res = await fetch(`${base}/api/waitlist/export`, { headers: { ...ADMIN, ...CLIENT } });
    const lines = (await res.text()).trim().split('\n');
    expect(lines[0]).toBe('email,ts,source,region,interests');
    const row = lines.find(l => l.startsWith('"context@example.com"'));
    expect(row).toContain('"non-us","treasuries;gold"');
  });
});
