import { describe, test, expect } from 'bun:test';
import { hasValidInviteCode, getAccessCookieValue, renderClaimForm, renderInviteForm } from './invite-gate.js';

describe('hasValidInviteCode', () => {
  test('accepts an exact match and rejects others', () => {
    expect(hasValidInviteCode('ABC123', ['ABC123'])).toBe(true);
    expect(hasValidInviteCode('WRONG1', ['ABC123'])).toBe(false);
    expect(hasValidInviteCode('', ['ABC123'])).toBe(false);
  });

  test('never throws on multibyte input (same string length, different byte length)', () => {
    // 'ÿ'×6 is string-length 6 but 12 UTF-8 bytes vs a 6-byte code
    expect(hasValidInviteCode('ÿÿÿÿÿÿ', ['ABC123'])).toBe(false);
    expect(hasValidInviteCode('😀😀😀', ['ABC123'])).toBe(false);
    expect(hasValidInviteCode('ABC12é', ['ABC123'])).toBe(false);
  });
});

describe('getAccessCookieValue', () => {
  const reqWithCookie = (cookie: string) =>
    new Request('http://localhost/', { headers: { Cookie: cookie } });

  test('extracts the gate cookie', () => {
    expect(getAccessCookieValue(reqWithCookie('petyr_access=ABC123'))).toBe('ABC123');
    expect(getAccessCookieValue(reqWithCookie('other=x; petyr_access=tok_abc'))).toBe('tok_abc');
  });

  test('returns null when absent', () => {
    expect(getAccessCookieValue(new Request('http://localhost/'))).toBeNull();
    expect(getAccessCookieValue(reqWithCookie('other=x'))).toBeNull();
  });

  test('malformed percent-encoding fails closed instead of throwing', () => {
    expect(getAccessCookieValue(reqWithCookie('petyr_access=%'))).toBeNull();
    expect(getAccessCookieValue(reqWithCookie('petyr_access=%zz'))).toBeNull();
  });

  test('anchored name — a cookie merely ending in the gate name cannot shadow it', () => {
    expect(getAccessCookieValue(reqWithCookie('evil_petyr_access=ATTACKER; petyr_access=REAL'))).toBe('REAL');
    expect(getAccessCookieValue(reqWithCookie('xpetyr_access=ATTACKER'))).toBeNull();
  });
});

describe('claim/invite form rendering', () => {
  test('claim form escapes the code and posts to /invite/claim', () => {
    const html = renderClaimForm('PETYR-AB<script>');
    expect(html).toContain('action="/invite/claim"');
    expect(html).toContain('method="POST"');
    expect(html).not.toContain('<script>');
    expect(html).toContain('PETYR-AB&lt;script&gt;');
  });

  test('invite form posts to /invite/claim and escapes errors', () => {
    const html = renderInviteForm('<img src=x onerror=alert(1)>');
    expect(html).toContain('action="/invite/claim"');
    expect(html).not.toContain('<img src=x');
  });
});
