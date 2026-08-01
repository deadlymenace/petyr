/**
 * Invite code gate for Petyr web UI.
 * When PETYR_INVITE_CODES is set, requires a valid code to access the app.
 * Stores access in an HttpOnly cookie for 7 days.
 */
import { timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'petyr_access';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/** Parse invite codes from env var. Empty array = gate disabled. */
export function loadInviteCodes(): string[] {
  const raw = process.env.PETYR_INVITE_CODES || '';
  return raw.split(',').map(c => c.trim()).filter(Boolean);
}

/** Constant-time string comparison to prevent timing attacks. */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against same-length dummy to avoid length leakage
    timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Check if a submitted code matches any valid code (timing-safe). */
export function hasValidInviteCode(submitted: string, validCodes: string[]): boolean {
  return validCodes.some(code => safeCompare(submitted, code));
}

/** Check if request has a valid invite cookie. */
export function hasValidAccess(req: Request, validCodes: string[]): boolean {
  const cookieHeader = req.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const submitted = decodeURIComponent(match[1]);
  return validCodes.some(code => safeCompare(submitted, code));
}

/** Parse invite code from query string (?code=XXX). */
export function parseInviteCode(url: URL): string | null {
  return url.searchParams.get('code');
}

/** Build Set-Cookie header for a valid invite code. */
export function buildAccessCookie(code: string, isSecure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(code)}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
  ];
  if (isSecure) parts.push('Secure');
  return parts.join('; ');
}

/** Render the invite code form page. */
export function renderInviteForm(error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Petyr — Research Preview</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    background: #07080B;
    color: #F4F4F0;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gate {
    text-align: center;
    max-width: 380px;
    padding: 40px;
  }
  .gate-logo {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -0.02em;
    background: linear-gradient(120deg, #F3D08A, #E6B860);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 8px;
  }
  .gate-subtitle {
    font-size: 13px;
    color: #9AA1AD;
    margin-bottom: 32px;
  }
  .gate-label {
    font-size: 14px;
    color: #9AA1AD;
    margin-bottom: 12px;
    display: block;
  }
  .gate-input {
    width: 100%;
    padding: 12px 16px;
    font-size: 16px;
    font-family: monospace;
    letter-spacing: 4px;
    text-align: center;
    background: #0E1118;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    color: #F4F4F0;
    outline: none;
    margin-bottom: 16px;
  }
  .gate-input:focus { border-color: #E6B860; }
  .gate-btn {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
    background: linear-gradient(120deg, #F3D08A, #E6B860);
    color: #1A1404;
    border: none;
    border-radius: 10px;
    cursor: pointer;
  }
  .gate-btn:hover { filter: brightness(1.06); }
  .gate-error {
    color: #FF6B6B;
    font-size: 13px;
    margin-top: 12px;
  }
  .gate-back {
    display: inline-block;
    margin-top: 24px;
    font-size: 13px;
    color: #646B78;
    text-decoration: none;
  }
  .gate-back:hover { color: #9AA1AD; }
</style>
</head>
<body>
<div class="gate">
  <div class="gate-logo">Petyr</div>
  <div class="gate-subtitle">Research preview — invite only</div>
  <form method="GET" action="/">
    <label class="gate-label">Enter your invite code</label>
    <input class="gate-input" type="text" name="code" placeholder="XXXXXX" autocomplete="off" autofocus required maxlength="32">
    <button class="gate-btn" type="submit">Access Petyr</button>
  </form>
  ${error ? `<div class="gate-error">${error.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</div>` : ''}
  <a class="gate-back" href="/">← Back to petyr.ai</a>
</div>
</body>
</html>`;
}
