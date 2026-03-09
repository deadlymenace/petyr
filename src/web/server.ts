import { join, resolve, relative } from 'path';
import { existsSync, readFileSync } from 'fs';
import { runAgentForMessage } from '../gateway/agent-runner.js';
import { getSetting } from '../utils/config.js';
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from '../model/llm.js';
import type { AgentEvent } from '../agent/types.js';

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

export function startServer(port: number) {
  const publicDir = join(import.meta.dir, 'public');

  Bun.serve({
    port,
    idleTimeout: 255, // Max allowed — agent calls can take minutes
    async fetch(req) {
      const url = new URL(req.url);

      // CORS headers — restricted to same-origin and localhost
      const origin = req.headers.get('Origin') || '';
      const allowedOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : '';
      const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };

      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
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
  let body: { query: string; session_id?: string };
  try {
    body = await req.json();
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

function handleCancel(req: Request, corsHeaders: Record<string, string>): Response {
  // Cancel the active request
  const sessionId = 'web-default';
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
