import { join, resolve, relative } from 'path';
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { timingSafeEqual } from 'crypto';
import { runAgentForMessage } from '../gateway/agent-runner.js';
import { getSetting } from '../utils/config.js';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '../model/llm.js';
import { parseUploadedFile } from './upload-handler.js';
import type { AgentEvent } from '../agent/types.js';
import {
  loadInviteCodes,
  getAccessCookieValue,
  hasValidInviteCode,
  parseInviteCode,
  buildAccessCookie,
  renderInviteForm,
  renderClaimForm,
} from './invite-gate.js';
import { InviteStore } from './invite-store.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Track active requests for cancellation
const activeControllers = new Map<string, AbortController>();

// Limit concurrent SSE connections
const MAX_CONCURRENT_STREAMS = 20;

// Security headers applied to every response
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ---------------------------------------------------------------------------
// Rate limiting — in-memory, per IP, 20 requests per minute
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAP_CAP = 10_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Behind a trusted edge proxy (e.g. Railway) the socket peer is the proxy,
// which would collapse every client into ONE rate-limit bucket. When
// PETYR_TRUST_PROXY=1, key on the LAST X-Forwarded-For hop — appended by
// our own edge, so it can't be spoofed by client-supplied headers.
const TRUST_PROXY = process.env.PETYR_TRUST_PROXY === '1';

function clientIpFor(socketIp: string, req: Request): string {
  if (!TRUST_PROXY) return socketIp;
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return socketIp;
  const hops = xff.split(',').map(h => h.trim()).filter(Boolean);
  return hops[hops.length - 1] || socketIp;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    // Hard cap on map size to prevent memory exhaustion from spoofed IPs
    if (rateLimits.size >= RATE_LIMIT_MAP_CAP && !rateLimits.has(ip)) {
      return true; // Reject new IPs when map is full
    }
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up expired rate limits and upload entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now >= entry.resetAt) rateLimits.delete(ip);
  }
  // Also clean expired uploads periodically
  cleanExpiredUploads();
}, 5 * 60_000);

// ---------------------------------------------------------------------------
// Request size limit
// ---------------------------------------------------------------------------
const MAX_BODY_BYTES = 50_000; // 50 KB

// ---------------------------------------------------------------------------
// CORS — allow configured hosts
// ---------------------------------------------------------------------------
function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAllowedHostPattern(): RegExp {
  const hosts = (process.env.PETYR_ALLOWED_HOSTS || 'localhost,127.0.0.1')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);
  // Escape ALL regex metacharacters, join with |
  const escaped = hosts.map(h => escapeRegexChars(h)).join('|');
  return new RegExp(`^https?://(${escaped})(:\\d+)?$`);
}

const allowedHostRe = buildAllowedHostPattern();

// ---------------------------------------------------------------------------
// Invite codes — loaded once at startup
// ---------------------------------------------------------------------------
const inviteCodes = loadInviteCodes();

// ---------------------------------------------------------------------------
// Public paths — always reachable without an invite code.
// The marketing landing page + its assets and the waitlist API stay open;
// the research preview (/app) and chat APIs remain gated.
// ---------------------------------------------------------------------------
const PUBLIC_PATHS = new Set([
  '/', '/index.html', '/landing.js', '/bird.svg', '/favicon.ico',
  '/api/waitlist', '/api/waitlist/export',
  // Admin-token-authenticated — carry their own (stronger) auth:
  '/api/invites', '/api/invites/generate',
]);

// ---------------------------------------------------------------------------
// Waitlist — JSONL on disk, deduped in memory.
// PETYR_DATA_DIR should point at persistent storage in production
// (e.g. a Railway volume mounted at /data); falls back to .petyr/ locally.
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.PETYR_DATA_DIR || join(process.cwd(), '.petyr');
const WAITLIST_PATH = join(DATA_DIR, 'waitlist.jsonl');
const MAX_WAITLIST_BODY_BYTES = 1024;
const MAX_WAITLIST_ENTRIES = 100_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const waitlistEmails = new Set<string>();

function loadWaitlist() {
  try {
    if (!existsSync(WAITLIST_PATH)) return;
    for (const line of readFileSync(WAITLIST_PATH, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as { email?: string };
        if (entry.email) waitlistEmails.add(entry.email);
      } catch {
        // Skip malformed lines
      }
    }
  } catch (err) {
    console.error('[waitlist] Failed to load existing entries:', err);
  }
}

/** Constant-time comparison for the admin token. */
function safeTokenCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Admin-token auth for management endpoints. Returns null when authorized,
 * otherwise the error Response to send (404 when no token is configured —
 * the endpoints don't exist unless PETYR_ADMIN_TOKEN is set).
 */
function requireAdmin(req: Request, corsHeaders: Record<string, string>): Response | null {
  const adminToken = process.env.PETYR_ADMIN_TOKEN || '';
  if (!adminToken) {
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
  const auth = req.headers.get('Authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!provided || !safeTokenCompare(provided, adminToken)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  return null;
}

// ---------------------------------------------------------------------------
// One-time invite codes — generated via admin API, redeemable once.
// Stored in the persistent data dir alongside the waitlist.
// ---------------------------------------------------------------------------
const inviteStore = new InviteStore(join(DATA_DIR, 'invites.json'));

// ── Upload storage ──────────────────────────────────────────────────────────
type ParsedFile = { filename: string; text: string; uploadedAt: number };
const uploadStore = new Map<string, ParsedFile>();

const UPLOAD_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_FILES_PER_UPLOAD = 5;
const MAX_UPLOAD_STORE_ENTRIES = 500;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.xls', '.txt', '.md', '.json']);

function cleanExpiredUploads() {
  const now = Date.now();
  for (const [key, entry] of uploadStore) {
    if (now - entry.uploadedAt > UPLOAD_TTL_MS) {
      uploadStore.delete(key);
    }
  }
  // Hard cap: evict oldest entries if over limit
  if (uploadStore.size > MAX_UPLOAD_STORE_ENTRIES) {
    const sorted = [...uploadStore.entries()].sort((a, b) => a[1].uploadedAt - b[1].uploadedAt);
    const toEvict = sorted.slice(0, uploadStore.size - MAX_UPLOAD_STORE_ENTRIES);
    for (const [key] of toEvict) uploadStore.delete(key);
  }
}

/** Build the file context block that gets prepended to the user query. */
function buildFileContext(sessionId: string, fileIds: string[]): string | undefined {
  const sections: string[] = [];
  for (const fileId of fileIds) {
    const entry = uploadStore.get(`${sessionId}:${fileId}`);
    if (entry) {
      sections.push(`### [${entry.filename}]\n${entry.text}`);
    }
  }
  if (sections.length === 0) return undefined;
  return `## Uploaded Documents\n\n${sections.join('\n\n')}`;
}

export function startServer(port: number) {
  const publicDir = join(import.meta.dir, 'public');

  if (inviteCodes.length > 0) {
    console.log(`  Invite gate active (${inviteCodes.length} code(s) configured)`);
  }

  loadWaitlist();
  console.log(`  Waitlist storage: ${WAITLIST_PATH} (${waitlistEmails.size} signup(s))`);
  const inviteList = inviteStore.list();
  if (inviteStore.isCorrupt()) {
    console.error('  WARNING: invite store is CORRUPT — gate is failing closed; one-time codes and grants are disabled until the store file is repaired or removed.');
  } else if (inviteList.length > 0) {
    console.log(`  One-time invites: ${inviteList.filter(c => !c.used_at).length} unused / ${inviteList.length} total`);
  }
  if (inviteCodes.length === 0 && inviteStore.hasAnyCodes()) {
    console.log('  Invite gate active (one-time codes)');
  }
  if (process.env.RAILWAY_ENVIRONMENT && !process.env.PETYR_DATA_DIR) {
    console.warn('  WARNING: PETYR_DATA_DIR is not set — waitlist signups will be lost on redeploy. Mount a volume and set PETYR_DATA_DIR.');
  }

  const server = Bun.serve({
    port,
    idleTimeout: 255, // Max allowed — agent calls can take minutes
    // Never surface stack traces or the dev error overlay to clients
    error() {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
      });
    },
    async fetch(req) {
      const url = new URL(req.url);
      const socketIp = this.requestIP?.(req)?.address ?? 'unknown';
      const ip = clientIpFor(socketIp, req);

      // CORS + security headers
      const origin = req.headers.get('Origin') || '';
      const allowedOrigin = allowedHostRe.test(origin) ? origin : '';
      const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...SECURITY_HEADERS,
      };

      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Rate limit check (applies to all non-OPTIONS requests)
      if (isRateLimited(ip)) {
        return new Response(JSON.stringify({ error: 'Too many requests' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...corsHeaders },
        });
      }

      // --- Invite gate (marketing page + waitlist stay public) ---
      // Active when reusable master codes (PETYR_INVITE_CODES) or any
      // one-time codes exist. A corrupt invite store keeps the gate ACTIVE
      // (fail closed) — see InviteStore.
      if (inviteCodes.length > 0 || inviteStore.hasAnyCodes()) {
        // Explicit redemption endpoint. One-time codes are consumed ONLY by
        // this POST — never by a GET — so link-preview/prefetch bots that
        // fetch a shared invite link can't burn the code.
        if (url.pathname === '/invite/claim' && req.method === 'POST') {
          return handleInviteClaim(req, url, corsHeaders);
        }

        // GET with ?code=XXX (typed links / legacy master-code links)
        const submittedCode = parseInviteCode(url);
        if (submittedCode) {
          const code = submittedCode.trim();
          // Master codes (reusable) redeem directly — nothing is consumed
          if (hasValidInviteCode(code, inviteCodes)) {
            const isSecure = url.protocol === 'https:';
            return new Response(null, {
              status: 302,
              headers: {
                'Location': '/app',
                'Set-Cookie': buildAccessCookie(code, isSecure),
                ...corsHeaders,
              },
            });
          }
          // One-time codes: show the claim page WITHOUT consuming the code
          const oneTime = code.toUpperCase();
          if (inviteStore.peek(oneTime)) {
            return new Response(renderClaimForm(oneTime), {
              status: 200,
              headers: { 'Content-Type': 'text/html', ...corsHeaders },
            });
          }
          // Invalid or already-used code — show form with error
          return new Response(renderInviteForm('Invalid or already-used invite code.'), {
            status: 200,
            headers: { 'Content-Type': 'text/html', ...corsHeaders },
          });
        }

        // Check cookie on all other requests (public paths skip the gate)
        if (!PUBLIC_PATHS.has(url.pathname)) {
          const cookieValue = getAccessCookieValue(req);
          const authorized = !!cookieValue && (
            hasValidInviteCode(cookieValue, inviteCodes) ||
            inviteStore.isValidGrant(cookieValue)
          );
          if (!authorized) {
            // API routes return 401 JSON
            if (url.pathname.startsWith('/api/')) {
              return new Response(JSON.stringify({ error: 'Unauthorized — valid invite code required' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              });
            }
            // HTML routes show the invite form
            return new Response(renderInviteForm(), {
              status: 200,
              headers: { 'Content-Type': 'text/html', ...corsHeaders },
            });
          }
        }
      }

      // API routes
      if (url.pathname === '/api/invites/generate' && req.method === 'POST') {
        return handleInvitesGenerate(req, url, corsHeaders);
      }

      if (url.pathname === '/api/invites' && req.method === 'GET') {
        return handleInvitesList(req, corsHeaders);
      }

      if (url.pathname === '/api/waitlist' && req.method === 'POST') {
        return handleWaitlist(req, corsHeaders);
      }

      if (url.pathname === '/api/waitlist/export' && req.method === 'GET') {
        return handleWaitlistExport(req, url, corsHeaders);
      }

      if (url.pathname === '/api/chat' && req.method === 'POST') {
        return handleChat(req, corsHeaders);
      }

      if (url.pathname === '/api/chat/cancel' && req.method === 'POST') {
        return handleCancel(req, corsHeaders);
      }

      if (url.pathname === '/api/upload' && req.method === 'POST') {
        return handleUpload(req, corsHeaders);
      }

      if (url.pathname === '/api/settings' && req.method === 'GET') {
        return handleSettings(corsHeaders);
      }

      // PDF/report download route
      if (url.pathname.startsWith('/api/reports/') && req.method === 'GET') {
        return handleReportDownload(url.pathname, corsHeaders);
      }

      // Static file serving (with path traversal protection)
      let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
      // Research preview (gated chat UI) lives at /app
      if (url.pathname === '/app' || url.pathname === '/app/') filePath = '/app.html';
      const fullPath = resolve(publicDir, '.' + filePath);

      // Block path traversal — resolved path must stay within publicDir
      const rel = relative(publicDir, fullPath);
      if (rel.startsWith('..') || resolve(fullPath) !== fullPath) {
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }

      if (existsSync(fullPath)) {
        const ext = filePath.substring(filePath.lastIndexOf('.'));
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = readFileSync(fullPath);
        return new Response(content, {
          headers: { 'Content-Type': contentType, ...corsHeaders },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    },
  });

  console.log(`\n  Petyr Web UI running at http://localhost:${server.port}\n`);
  return server;
}

// ── Invite claim handler ────────────────────────────────────────────────────

/**
 * POST /invite/claim — the only path that consumes a one-time code.
 * Accepts form posts (from the gate form and the claim page).
 */
async function handleInviteClaim(req: Request, url: URL, corsHeaders: Record<string, string>): Promise<Response> {
  const htmlHeaders = { 'Content-Type': 'text/html', ...corsHeaders };

  const contentLength = parseInt(req.headers.get('Content-Length') || '0', 10);
  if (contentLength > 4096) {
    return new Response(renderInviteForm('Invalid request.'), { status: 413, headers: htmlHeaders });
  }

  let code = '';
  try {
    const form = await req.formData();
    code = String(form.get('code') || '').trim();
  } catch {
    // Not a parseable form body — fall through to the error form
  }
  if (!code || code.length > 64) {
    return new Response(renderInviteForm('Please enter an invite code.'), { status: 200, headers: htmlHeaders });
  }

  // Master codes (reusable) first; otherwise consume a one-time code,
  // which issues a single-user grant token.
  const cookieValue = hasValidInviteCode(code, inviteCodes)
    ? code
    : inviteStore.redeem(code.toUpperCase());

  if (cookieValue) {
    const isSecure = url.protocol === 'https:';
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/app',
        'Set-Cookie': buildAccessCookie(cookieValue, isSecure),
        ...corsHeaders,
      },
    });
  }

  return new Response(renderInviteForm('Invalid or already-used invite code.'), {
    status: 200, headers: htmlHeaders,
  });
}

// ── Invite admin handlers ───────────────────────────────────────────────────

function handleInvitesGenerate(req: Request, url: URL, corsHeaders: Record<string, string>): Response {
  const denied = requireAdmin(req, corsHeaders);
  if (denied) return denied;
  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

  const rawCount = parseInt(url.searchParams.get('count') || '1', 10);
  const count = Math.min(Math.max(Number.isFinite(rawCount) ? rawCount : 1, 1), 50);
  const note = (url.searchParams.get('note') || '').slice(0, 100) || undefined;

  try {
    const codes = inviteStore.generate(count, note);
    return new Response(JSON.stringify({ ok: true, count: codes.length, codes }), {
      headers: jsonHeaders,
    });
  } catch (err) {
    console.error('[invites] Failed to generate codes:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate invite codes' }), {
      status: 500, headers: jsonHeaders,
    });
  }
}

function handleInvitesList(req: Request, corsHeaders: Record<string, string>): Response {
  const denied = requireAdmin(req, corsHeaders);
  if (denied) return denied;

  const codes = inviteStore.list();
  const unused = codes.filter(c => !c.used_at).length;
  return new Response(JSON.stringify({
    total: codes.length,
    unused,
    used: codes.length - unused,
    ...(inviteStore.isCorrupt() ? { corrupt: true, warning: 'Invite store file is unreadable — gate failing closed. Repair or remove it.' } : {}),
    codes,
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// ── Waitlist handlers ───────────────────────────────────────────────────────

async function handleWaitlist(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

  // CSRF defense: require JSON Content-Type (blocks <form> submissions)
  const ct = req.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 415, headers: jsonHeaders,
    });
  }

  let body: { email?: string; source?: string };
  try {
    const rawText = await req.text();
    if (rawText.length > MAX_WAITLIST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Request body too large' }), {
        status: 413, headers: jsonHeaders,
      });
    }
    body = JSON.parse(rawText);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: jsonHeaders,
    });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'Please enter a valid email address' }), {
      status: 400, headers: jsonHeaders,
    });
  }

  if (waitlistEmails.has(email)) {
    return new Response(JSON.stringify({ ok: true, already: true }), { headers: jsonHeaders });
  }

  if (waitlistEmails.size >= MAX_WAITLIST_ENTRIES) {
    return new Response(JSON.stringify({ error: 'Waitlist is full' }), {
      status: 503, headers: jsonHeaders,
    });
  }

  const source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'unknown';
  const entry = {
    email,
    ts: new Date().toISOString(),
    source,
    ua: (req.headers.get('User-Agent') || '').slice(0, 200),
  };

  try {
    mkdirSync(DATA_DIR, { recursive: true });
    appendFileSync(WAITLIST_PATH, JSON.stringify(entry) + '\n', 'utf8');
    waitlistEmails.add(email);
  } catch (err) {
    console.error('[waitlist] Failed to persist signup:', err);
    return new Response(JSON.stringify({ error: 'Could not save your signup — please try again' }), {
      status: 500, headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
}

function handleWaitlistExport(req: Request, url: URL, corsHeaders: Record<string, string>): Response {
  const denied = requireAdmin(req, corsHeaders);
  if (denied) return denied;

  const raw = existsSync(WAITLIST_PATH) ? readFileSync(WAITLIST_PATH, 'utf8') : '';

  if (url.searchParams.get('format') === 'jsonl') {
    return new Response(raw, {
      headers: {
        'Content-Type': 'application/jsonl; charset=utf-8',
        'Content-Disposition': 'attachment; filename="waitlist.jsonl"',
        ...corsHeaders,
      },
    });
  }

  // Default: CSV
  const rows = ['email,ts,source'];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line) as { email?: string; ts?: string; source?: string };
      const csv = [e.email || '', e.ts || '', e.source || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
      rows.push(csv);
    } catch {
      // Skip malformed lines
    }
  }
  return new Response(rows.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="waitlist.csv"',
      ...corsHeaders,
    },
  });
}

// ── Upload handler ──────────────────────────────────────────────────────────

async function handleUpload(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid multipart body' }), {
      status: 400, headers: jsonHeaders,
    });
  }

  const sessionId = (formData.get('session_id') as string) || 'web-default';
  const files = formData.getAll('files') as File[];

  if (files.length === 0) {
    return new Response(JSON.stringify({ error: 'No files provided' }), {
      status: 400, headers: jsonHeaders,
    });
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return new Response(JSON.stringify({ error: `Maximum ${MAX_FILES_PER_UPLOAD} files per upload` }), {
      status: 400, headers: jsonHeaders,
    });
  }

  // Clean expired entries on each upload
  cleanExpiredUploads();

  const results: { id: string; name: string; size: number; type: string; preview: string }[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: `File "${file.name}" exceeds 25 MB limit` }), {
        status: 413, headers: jsonHeaders,
      });
    }

    // Extension check
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return new Response(JSON.stringify({ error: `File type "${ext}" is not supported` }), {
        status: 400, headers: jsonHeaders,
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseUploadedFile(buffer, file.type, file.name);

    const fileId = crypto.randomUUID();
    uploadStore.set(`${sessionId}:${fileId}`, {
      filename: file.name,
      text: parsed.text,
      uploadedAt: Date.now(),
    });

    results.push({
      id: fileId,
      name: file.name,
      size: file.size,
      type: parsed.type,
      preview: parsed.text.slice(0, 200),
    });
  }

  return new Response(JSON.stringify({ files: results }), {
    headers: jsonHeaders,
  });
}

// ── Chat handler ────────────────────────────────────────────────────────────

async function handleChat(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

  // CSRF defense: require JSON Content-Type (blocks <form> submissions)
  const ct = req.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) {
    return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
      status: 415, headers: jsonHeaders,
    });
  }

  // Limit concurrent SSE streams
  if (activeControllers.size >= MAX_CONCURRENT_STREAMS) {
    return new Response(JSON.stringify({ error: 'Too many concurrent requests' }), {
      status: 503, headers: jsonHeaders,
    });
  }

  // Enforce request size limit
  const contentLength = parseInt(req.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request body too large (max 50 KB)' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let body: { query: string; session_id?: string; file_ids?: string[] };
  try {
    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return new Response(JSON.stringify({ error: 'Request body too large (max 50 KB)' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    body = JSON.parse(rawText);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!body.query?.trim()) {
    return new Response(JSON.stringify({ error: 'Query is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const sessionId = body.session_id || 'web-default';
  const model = getSetting('modelId', DEFAULT_MODEL);
  const provider = getSetting('provider', DEFAULT_PROVIDER);

  // Build file context from uploaded file IDs
  const fileContext = body.file_ids?.length
    ? buildFileContext(sessionId, body.file_ids)
    : undefined;

  // Set up abort controller for this session
  const controller = new AbortController();
  activeControllers.set(sessionId, controller);

  // Stream response as SSE
  const stream = new ReadableStream({
    async start(streamController) {
      const encoder = new TextEncoder();

      function sendEvent(event: AgentEvent) {
        const data = JSON.stringify(event);
        streamController.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      try {
        await runAgentForMessage({
          sessionKey: sessionId,
          query: body.query,
          model,
          modelProvider: provider,
          signal: controller.signal,
          fileContext,
          onEvent: (event) => {
            sendEvent(event);
          },
        });
      } catch (error) {
        if (controller.signal.aborted) {
          sendEvent({ type: 'done', answer: 'Query cancelled.', toolCalls: [], iterations: 0, totalTime: 0 });
        } else {
          // Log full error internally but send generic message to client
          const internal = error instanceof Error ? error.message : String(error);
          console.error(`[chat] Error for session ${sessionId}: ${internal}`);
          sendEvent({ type: 'done', answer: 'An error occurred while processing your query. Please try again.', toolCalls: [], iterations: 0, totalTime: 0 });
        }
      } finally {
        activeControllers.delete(sessionId);
        streamController.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...corsHeaders,
    },
  });
}

async function handleCancel(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  let sessionId = 'web-default';
  try {
    const body = await req.json() as { session_id?: string };
    if (body.session_id) sessionId = body.session_id;
  } catch {
    // Fall back to default session
  }

  const controller = activeControllers.get(sessionId);
  if (controller) {
    controller.abort();
    activeControllers.delete(sessionId);
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function handleSettings(corsHeaders: Record<string, string>): Response {
  const model = getSetting('modelId', DEFAULT_MODEL);
  const provider = getSetting('provider', DEFAULT_PROVIDER);
  return new Response(JSON.stringify({ model, provider }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function handleReportDownload(pathname: string, corsHeaders: Record<string, string>): Response {
  const filename = pathname.replace('/api/reports/', '');

  // Sanitize: only allow alphanumeric, dashes, underscores, dots
  if (!/^[\w\-\.]+$/.test(filename) || filename.includes('..')) {
    return new Response('Bad request', { status: 400, headers: corsHeaders });
  }

  const reportsDir = join(process.cwd(), '.petyr', 'reports');
  const filePath = resolve(reportsDir, filename);

  // Path traversal protection
  const rel = relative(reportsDir, filePath);
  if (rel.startsWith('..') || rel.includes('/') || rel.includes('\\')) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  if (!existsSync(filePath)) {
    return new Response('Not found', { status: 404, headers: corsHeaders });
  }

  const content = readFileSync(filePath);
  const isPdf = filename.endsWith('.pdf');
  const contentType = isPdf ? 'application/pdf' : 'text/markdown; charset=utf-8';

  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      ...corsHeaders,
    },
  });
}
