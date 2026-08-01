import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { InviteStore } from './invite-store.js';

let dir: string;
let storePath: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'petyr-invites-'));
  storePath = join(dir, 'invites.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('InviteStore', () => {
  test('generates the requested number of unique, well-formed codes', () => {
    const store = new InviteStore(storePath);
    const codes = store.generate(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) {
      // Exact ambiguity-free alphabet — no 0/O, 1/I/L
      expect(code).toMatch(/^PETYR-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  test('refuses to generate beyond the code cap', () => {
    const store = new InviteStore(storePath, { maxCodes: 3 });
    expect(store.generate(2)).toHaveLength(2);
    expect(() => store.generate(2)).toThrow(/full/);
    // Under the cap still works
    expect(store.generate(1)).toHaveLength(1);
  });

  test('peek reports unused codes without consuming them', () => {
    const store = new InviteStore(storePath);
    const [code] = store.generate(1);

    expect(store.peek(code)).toBe(true);
    expect(store.peek(code)).toBe(true); // still unused — peek never consumes
    expect(store.peek('PETYR-ZZZZZZ')).toBe(false);

    store.redeem(code);
    expect(store.peek(code)).toBe(false); // used codes no longer peek
  });

  test('persists codes to disk and reloads them in a fresh instance', () => {
    const store = new InviteStore(storePath);
    const [code] = store.generate(1);

    const reloaded = new InviteStore(storePath);
    expect(reloaded.hasAnyCodes()).toBe(true);
    expect(reloaded.list().map(c => c.code)).toContain(code);
  });

  test('redeems an unused code exactly once', () => {
    const store = new InviteStore(storePath);
    const [code] = store.generate(1);

    const token = store.redeem(code);
    expect(token).toStartWith('tok_');

    // Second redemption of the same code fails
    expect(store.redeem(code)).toBeNull();

    // Also fails after a reload (persistence of used_at)
    const reloaded = new InviteStore(storePath);
    expect(reloaded.redeem(code)).toBeNull();
  });

  test('rejects unknown codes', () => {
    const store = new InviteStore(storePath);
    store.generate(3);
    expect(store.redeem('PETYR-ZZZZZZ')).toBeNull();
    expect(store.redeem('')).toBeNull();
    expect(store.redeem('nonsense')).toBeNull();
  });

  test('issued grant tokens validate, including after reload', () => {
    const store = new InviteStore(storePath);
    const [code] = store.generate(1);
    const token = store.redeem(code)!;

    expect(store.isValidGrant(token)).toBe(true);
    expect(new InviteStore(storePath).isValidGrant(token)).toBe(true);
  });

  test('rejects unknown or malformed grant values', () => {
    const store = new InviteStore(storePath);
    const [code] = store.generate(1);
    store.redeem(code);

    expect(store.isValidGrant('tok_' + 'a'.repeat(48))).toBe(false);
    expect(store.isValidGrant('not-a-token')).toBe(false);
    expect(store.isValidGrant('')).toBe(false);
    // The code itself is not a grant
    expect(store.isValidGrant(code)).toBe(false);
  });

  test('expired grants are pruned while live grants survive', () => {
    const store = new InviteStore(storePath);
    const [expiredCode, liveCode] = store.generate(2);
    const expiredToken = store.redeem(expiredCode)!;
    const liveToken = store.redeem(liveCode)!;

    // Rewrite only the first grant with a past expiry
    const data = JSON.parse(readFileSync(storePath, 'utf8'));
    const expiredGrant = data.grants.find((g: { token: string }) => g.token === expiredToken);
    expiredGrant.expires_at = new Date(Date.now() - 1000).toISOString();
    writeFileSync(storePath, JSON.stringify(data));

    const reloaded = new InviteStore(storePath);
    expect(reloaded.isValidGrant(expiredToken)).toBe(false);
    expect(reloaded.isValidGrant(liveToken)).toBe(true); // live grant survives the prune
    const after = JSON.parse(readFileSync(storePath, 'utf8'));
    expect(after.grants).toHaveLength(1);
    expect(after.grants[0].token).toBe(liveToken);
  });

  test('FAILS CLOSED on a corrupt store file', () => {
    // Seed a valid store, then corrupt it
    const seed = new InviteStore(storePath);
    const [code] = seed.generate(1);
    writeFileSync(storePath, '{not json');

    const store = new InviteStore(storePath);
    // Gate stays active, nothing redeems or validates, writes are refused
    expect(store.isCorrupt()).toBe(true);
    expect(store.hasAnyCodes()).toBe(true);
    expect(store.redeem(code)).toBeNull();
    expect(store.isValidGrant('tok_' + 'a'.repeat(48))).toBe(false);
    expect(store.peek(code)).toBe(false);
    expect(() => store.generate(1)).toThrow(/corrupt/);
    // The corrupt file is preserved on disk (never clobbered)
    expect(readFileSync(storePath, 'utf8')).toBe('{not json');
  });

  test('FAILS CLOSED on valid JSON of the wrong shape', () => {
    for (const bad of ['{}', '[]', '42', '"str"', 'null', '{"codes":[]}', '{"grants":[]}']) {
      rmSync(storePath, { force: true });
      writeFileSync(storePath, bad);
      const store = new InviteStore(storePath);
      // Anything that isn't {codes:[],grants:[]} locks the gate rather than
      // silently opening it — hasAnyCodes() stays true, generate() refuses.
      expect(store.isCorrupt()).toBe(true);
      expect(store.hasAnyCodes()).toBe(true);
      expect(() => store.generate(1)).toThrow(/corrupt/);
    }
  });

  test('a legitimately empty store leaves the gate OFF', () => {
    // This is exactly what save() writes for an empty store
    writeFileSync(storePath, JSON.stringify({ codes: [], grants: [] }));
    const store = new InviteStore(storePath);
    expect(store.isCorrupt()).toBe(false);
    expect(store.hasAnyCodes()).toBe(false);
  });

  test('drops malformed entries but keeps valid ones', () => {
    writeFileSync(storePath, JSON.stringify({
      codes: [
        { code: 'PETYR-AAAAAA', created_at: new Date().toISOString(), used_at: null },
        null,
        { bogus: true },
        { code: 123, created_at: 'x', used_at: null },
      ],
      grants: [{}, { token: 42 }],
    }));

    const store = new InviteStore(storePath);
    expect(store.isCorrupt()).toBe(false);
    expect(store.list()).toHaveLength(1);
    expect(store.peek('PETYR-AAAAAA')).toBe(true);
    // Malformed grant entries never validate (and never throw)
    expect(store.isValidGrant('tok_' + 'a'.repeat(48))).toBe(false);
  });

  test('list never exposes grant tokens', () => {
    const store = new InviteStore(storePath);
    const [code] = store.generate(2);
    store.redeem(code);
    const listed = store.list();
    expect(listed).toHaveLength(2);
    for (const entry of listed) {
      expect(Object.keys(entry).sort()).toEqual(['code', 'created_at', 'used_at']);
    }
  });
});
