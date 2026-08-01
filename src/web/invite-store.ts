/**
 * One-time invite codes for the research preview gate.
 *
 * Codes are generated via the admin API, stored as JSON in the persistent
 * data dir (PETYR_DATA_DIR), and can be redeemed exactly once. Redemption
 * marks the code used and issues a random access-grant token which is set
 * as the gate cookie — so a used code can never be redeemed (or replayed
 * as a cookie) by anyone else.
 *
 * Failure posture: the store FAILS CLOSED. If the on-disk file exists but
 * cannot be parsed, the gate stays active, redemptions and grants are
 * refused, and writes are blocked (the corrupt file is backed up, never
 * overwritten) until an operator intervenes.
 *
 * Reusable "master" codes from PETYR_INVITE_CODES continue to work
 * alongside these (see invite-gate.ts / server.ts).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, copyFileSync } from 'fs';
import { dirname } from 'path';
import { randomBytes, timingSafeEqual } from 'crypto';

// No ambiguous characters (0/O, 1/I/L) — codes get read aloud and typed.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_PREFIX = 'PETYR-';
const GRANT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // matches the gate cookie lifetime
const DEFAULT_MAX_CODES = 10_000;

export interface OneTimeInvite {
  code: string;
  created_at: string;
  used_at: string | null;
  note?: string;
}

export interface AccessGrant {
  token: string;
  code: string;
  granted_at: string;
  expires_at: string;
}

interface StoreData {
  codes: OneTimeInvite[];
  grants: AccessGrant[];
}

/** Constant-time string comparison (byte-length guarded). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function randomCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return CODE_PREFIX + out;
}

/** Element validation — the store never trusts its own persisted file. */
function isInviteEntry(value: unknown): value is OneTimeInvite {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return typeof e.code === 'string'
    && typeof e.created_at === 'string'
    && (e.used_at === null || typeof e.used_at === 'string')
    && (e.note === undefined || typeof e.note === 'string');
}

function isGrantEntry(value: unknown): value is AccessGrant {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return typeof e.token === 'string'
    && typeof e.code === 'string'
    && typeof e.granted_at === 'string'
    && typeof e.expires_at === 'string'
    && Number.isFinite(Date.parse(e.expires_at));
}

export class InviteStore {
  private data: StoreData | null = null;
  private corrupt = false;
  private readonly maxCodes: number;

  constructor(
    private readonly filePath: string,
    opts?: { maxCodes?: number },
  ) {
    this.maxCodes = opts?.maxCodes ?? DEFAULT_MAX_CODES;
  }

  /** True when the on-disk store exists but could not be read — gate fails closed. */
  isCorrupt(): boolean {
    this.load();
    return this.corrupt;
  }

  private load(): StoreData {
    if (this.data) return this.data;
    let loaded: StoreData = { codes: [], grants: [] };
    if (existsSync(this.filePath)) {
      try {
        const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
        // The file must be our exact shape: an object with `codes` and
        // `grants` arrays. Anything else ({}, [], 42, "str") is treated as
        // corruption and fails CLOSED — we never write those, so seeing one
        // means tampering or a bad write, not an empty store.
        if (
          !parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          !Array.isArray((parsed as Record<string, unknown>).codes) ||
          !Array.isArray((parsed as Record<string, unknown>).grants)
        ) {
          throw new Error('Invite store has an unexpected shape (expected {codes:[],grants:[]})');
        }
        const rawCodes = (parsed as { codes: unknown[] }).codes;
        const rawGrants = (parsed as { grants: unknown[] }).grants;
        loaded = {
          codes: rawCodes.filter(isInviteEntry),
          grants: rawGrants.filter(isGrantEntry),
        };
        const dropped = (rawCodes.length - loaded.codes.length) + (rawGrants.length - loaded.grants.length);
        if (dropped > 0) {
          console.error(`[invites] Dropped ${dropped} malformed entr(ies) from ${this.filePath}`);
        }
      } catch (err) {
        // FAIL CLOSED: keep the corrupt file in place (so restarts stay
        // closed too), back it up for forensics, refuse reads and writes.
        this.corrupt = true;
        console.error(
          `[invites] SECURITY: invite store at ${this.filePath} is unreadable — ` +
          `failing CLOSED (gate stays active, one-time codes and grants disabled, writes refused). ` +
          `Repair or remove the file to recover. Error:`, err,
        );
        try {
          const backup = `${this.filePath}.corrupt-${Date.now()}`;
          copyFileSync(this.filePath, backup);
          console.error(`[invites] Corrupt store backed up to ${backup}`);
        } catch {
          // Backup is best-effort
        }
      }
    }
    this.data = loaded;
    if (!this.corrupt) this.pruneExpiredGrants();
    return this.data;
  }

  /** Atomic write: temp file + rename, so a crash mid-write never truncates. */
  private save() {
    if (!this.data) return;
    if (this.corrupt) throw new Error('Invite store is corrupt — refusing to overwrite');
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    renameSync(tmp, this.filePath);
  }

  private pruneExpiredGrants() {
    if (!this.data || this.corrupt) return;
    const now = Date.now();
    const before = this.data.grants.length;
    this.data.grants = this.data.grants.filter(g => Date.parse(g.expires_at) > now);
    if (this.data.grants.length !== before) this.save();
  }

  /** Generate `count` new unused one-time codes. Throws if the store is corrupt or full. */
  generate(count: number, note?: string): string[] {
    const data = this.load();
    if (this.corrupt) throw new Error('Invite store is corrupt — refusing to generate codes');
    if (data.codes.length + count > this.maxCodes) {
      throw new Error(`Invite store is full (max ${this.maxCodes} codes)`);
    }
    const existing = new Set(data.codes.map(c => c.code));
    const created: string[] = [];
    while (created.length < count) {
      const code = randomCode();
      if (existing.has(code)) continue; // collision — extremely unlikely, retry
      existing.add(code);
      created.push(code);
      data.codes.push({ code, created_at: new Date().toISOString(), used_at: null, ...(note ? { note } : {}) });
    }
    this.save();
    return created;
  }

  /** Non-consuming check: is this an existing, unused one-time code? */
  peek(code: string): boolean {
    const data = this.load();
    if (this.corrupt) return false;
    let found = false;
    for (const invite of data.codes) {
      if (safeEqual(invite.code, code) && !invite.used_at) {
        found = true;
      }
    }
    return found;
  }

  /**
   * Redeem an unused one-time code. Marks it used and returns a fresh
   * access-grant token to set as the gate cookie. Returns null if the
   * code is unknown, already used, or the store cannot persist the
   * redemption (in-memory state is rolled back so the code stays usable).
   */
  redeem(code: string): string | null {
    const data = this.load();
    if (this.corrupt) return null;
    // Compare against every code (timing-safe per comparison, no early exit)
    let match: OneTimeInvite | null = null;
    for (const invite of data.codes) {
      if (safeEqual(invite.code, code) && !invite.used_at) {
        match = invite;
      }
    }
    if (!match) return null;

    match.used_at = new Date().toISOString();
    const token = 'tok_' + randomBytes(24).toString('hex');
    const now = Date.now();
    const grant: AccessGrant = {
      token,
      code: match.code,
      granted_at: new Date(now).toISOString(),
      expires_at: new Date(now + GRANT_TTL_MS).toISOString(),
    };
    data.grants.push(grant);
    try {
      this.save();
    } catch (err) {
      // Roll back so disk and memory stay consistent and the code remains usable
      match.used_at = null;
      data.grants.pop();
      console.error('[invites] Failed to persist redemption, rolled back:', err);
      return null;
    }
    return token;
  }

  /** Check whether a cookie value is a live (unexpired) access grant. */
  isValidGrant(value: string): boolean {
    if (!value.startsWith('tok_')) return false;
    const data = this.load();
    if (this.corrupt) return false;
    const now = Date.now();
    let valid = false;
    for (const grant of data.grants) {
      if (safeEqual(grant.token, value) && Date.parse(grant.expires_at) > now) {
        valid = true;
      }
    }
    return valid;
  }

  /**
   * True if any one-time codes exist (used or not) — activates the gate.
   * A corrupt store also returns true: the gate must not silently open
   * because its state file broke.
   */
  hasAnyCodes(): boolean {
    const data = this.load();
    return this.corrupt || data.codes.length > 0;
  }

  /** Code list for the admin API (never exposes grant tokens). */
  list(): OneTimeInvite[] {
    const data = this.load();
    if (this.corrupt) return [];
    return data.codes.map(c => ({ ...c }));
  }
}
