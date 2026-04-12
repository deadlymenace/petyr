import { join, resolve, relative } from 'path';
import { existsSync, readFileSync } from 'fs';
import { runAgentForMessage } from '../gateway/agent-runner.js';
import { getSetting } from '../utils/config.js';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '../model/llm.js';
import type { AgentEvent } from '../agent/types.js';
import {
  loadInviteCodes,
  hasValidAccess,
  parseInviteCode,
  buildAccessCookie,
  renderInviteForm,
} from './invite-gate.js';

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

// ---------------------------------------------------------------------------
// Rate limiting — in-memory, per IP, 20 requests per minute
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now >= entry.resetAt) rateLimits.delete(ip);
  }
}, 5 * 60_000);

// ---------------------------------------------------------------------------
// Request size limit
// ---------------------------------------------------------------------------
const MAX_BODY_BYTES = 50_000; // 50 KB

// ---------------------------------------------------------------------------
// CORS — allow configured hosts
// ---------------------------------------------------------------------------
function buildAllowedHostPattern(): RegExp {
  const hosts = (process.env.PETYR_ALLOWED_HOSTS || 'localhost,127.0.0.1')
    .split(',')
    .map(h => h.trim())
    .filter(Boolean);
  // Escape dots for regex, join with |
  const escaped = hosts.map(h => h.replace(/\./g, '\\.')).join('|');
  return new RegExp(`^https?://(${escaped})(:\\d+)?$`);
}

const allowedHostRe = buildAllowedHostPattern();

// ---------------------------------------------------------------------------
// Invite codes — loaded once at startup
// ---------------------------------------------------------------------------
const inviteCodes = loadInviteCodes();

export function startServer(port: number) {
  const publicDir = join(import.meta.dir, 'public');

  if (inviteCodes.length > 0) {
    console.log(`  Invite gate active (${inviteCodes.length} code(s) configured)`);
  }

  Bun.serve({
    port,
    idleTimeout: 255, // Max allowed — agent calls can take minutes
    async fetch(req) {
      const url = new URL(req.url);
      const ip = this.requestIP?.(req)?.address ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

      // CORS headers
      const origin = req.headers.get('Origin') || '';
      const allowedOrigin = allowedHostRe.test(origin) ? origin : '';
      const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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

      // --- Invite gate ---
      if (inviteCodes.length > 0) {
        // Check for invite code submission (GET /?code=XXX)
        const submittedCode = parseInviteCode(url);
        if (submittedCode) {
          if (inviteCodes.includes(submittedCode)) {
            const isSecure = url.protocol === 'https:';
            return new Response(null, {
              status: 302,
              headers: {
                'Location': '/',
                'Set-Cookie': buildAccessCookie(submittedCode, isSecure),
                ...corsHeaders,
              },
            });
          }
          // Invalid code — show form with error
          return new Response(renderInviteForm('Invalid invite code.'), {
            status: 200,
            headers: { 'Content-Type': 'text/html', ...corsHeaders },
          });
        }

        // Check cookie on all other requests
        if (!hasValidAccess(req, inviteCodes)) {
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

      // API routes
      if (url.pathname === '/api/chat' && req.method === 'POST') {
        return handleChat(req, corsHeaders);
      }

      if (url.pathname === '/api/chat/cancel' && req.method === 'POST') {
        return handleCancel(req, corsHeaders);
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

  console.log(`\n  Petyr Web UI running at http://localhost:${port}\n`);
}

async function handleChat(req: Request, corsHeaders: Record<string, string>): Promise<Response> {
  // Enforce request size limit
  const contentLength = parseInt(req.headers.get('Content-Length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'Request body too large (max 50 KB)' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let body: { query: string; session_id?: string };
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
          onEvent: (event) => {
            sendEvent(event);
          },
        });
      } catch (error) {
        if (controller.signal.aborted) {
          sendEvent({ type: 'done', answer: 'Query cancelled.', toolCalls: [], iterations: 0, totalTime: 0 });
        } else {
          const message = error instanceof Error ? error.message : String(error);
          sendEvent({ type: 'done', answer: `Error: ${message}`, toolCalls: [], iterations: 0, totalTime: 0 });
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
