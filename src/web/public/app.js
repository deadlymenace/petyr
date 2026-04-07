// Petyr Web UI — Client-side Logic
// =============================================================================

// =============================================================================
// Landing Page Logic
// =============================================================================

function initLandingPage() {
  // Chat overlay toggle
  const overlay = document.getElementById('chat-overlay');
  const chatClose = document.getElementById('chat-close');

  window.openChat = function(prefilledQuery) {
    document.body.style.overflow = 'hidden';
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
      });
    });
    if (prefilledQuery) {
      const input = document.getElementById('query-input');
      if (input) {
        input.value = prefilledQuery;
        // Hide welcome, show messages
        const welcomeEl = document.getElementById('welcome');
        if (welcomeEl) welcomeEl.classList.add('hidden');
        setTimeout(() => sendMessage(), 400);
      }
    } else {
      setTimeout(() => {
        const input = document.getElementById('query-input');
        if (input) input.focus();
      }, 350);
    }
  };

  window.closeChat = function() {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);
  };

  // CTA buttons
  document.getElementById('hero-cta')?.addEventListener('click', () => openChat());
  document.getElementById('nav-cta')?.addEventListener('click', () => openChat());
  document.getElementById('final-cta')?.addEventListener('click', () => openChat());
  chatClose?.addEventListener('click', closeChat);

  // Example query buttons
  document.querySelectorAll('.example-query').forEach(btn => {
    btn.addEventListener('click', () => openChat(btn.dataset.query));
  });

  // Smooth scroll for nav links
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Scroll animations (IntersectionObserver)
  const animateObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible');
        animateObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-animate]').forEach(el => {
    animateObserver.observe(el);
  });

  // Nav background on scroll
  const heroEl = document.getElementById('hero');
  if (heroEl) {
    const navObserver = new IntersectionObserver(([entry]) => {
      document.getElementById('nav')?.classList.toggle('nav-scrolled', !entry.isIntersecting);
    }, { threshold: 0.1 });
    navObserver.observe(heroEl);
  }

  // Escape key closes chat
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeChat();
    }
  });
}

// Boot landing page
initLandingPage();

// =============================================================================
// Chat Logic
// =============================================================================

const chatContainer = document.getElementById('chat-container');
const messagesEl = document.getElementById('messages');
const welcomeEl = document.getElementById('welcome');
const queryInput = document.getElementById('query-input');
const sendBtn = document.getElementById('send-btn');
const cancelBtn = document.getElementById('cancel-btn');
const modelBadge = document.getElementById('model-badge');

let isStreaming = false;

// Configure marked for rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

function sanitizeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('#')) return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;

  template.content
    .querySelectorAll('script, style, iframe, object, embed, link, meta')
    .forEach(el => el.remove());

  template.content.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || name === 'style' || name === 'srcdoc') {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === 'href' || name === 'src' || name === 'xlink:href') {
        const safeUrl = sanitizeUrl(attr.value);
        if (!safeUrl) {
          el.removeAttribute(attr.name);
          return;
        }
        el.setAttribute(attr.name, safeUrl);
      }
    });

    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer');
      if (!el.getAttribute('href')) {
        el.removeAttribute('target');
      }
    }
  });

  return template.innerHTML;
}

// =============================================================================
// Initialization
// =============================================================================

async function init() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    modelBadge.textContent = `${settings.model} · ${settings.provider}`;
  } catch {
    modelBadge.textContent = 'offline';
  }

  // Suggestion click handlers (inside chat welcome)
  document.querySelectorAll('.suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      queryInput.value = btn.dataset.query;
      sendMessage();
    });
  });

  // Input handlers
  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) sendMessage();
    }
  });

  queryInput.addEventListener('input', autoResize);
  sendBtn.addEventListener('click', () => { if (!isStreaming) sendMessage(); });
  cancelBtn.addEventListener('click', cancelQuery);
}

function autoResize() {
  queryInput.style.height = 'auto';
  queryInput.style.height = Math.min(queryInput.scrollHeight, 120) + 'px';
}

// =============================================================================
// Send Message
// =============================================================================

async function sendMessage() {
  const query = queryInput.value.trim();
  if (!query) return;

  // Hide welcome, show messages
  welcomeEl.classList.add('hidden');

  // Add user message
  appendUserMessage(query);
  queryInput.value = '';
  queryInput.style.height = 'auto';

  // Switch to streaming state
  setStreaming(true);

  // Create assistant message container
  const msgEl = createAssistantMessage();
  const toolsEl = msgEl.querySelector('.tool-events');
  const contentEl = msgEl.querySelector('.message-content');
  const statsEl = msgEl.querySelector('.stats-bar');

  // Track tool events for click-to-expand
  const toolEvents = new Map();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const event = JSON.parse(data);
          handleEvent(event, toolsEl, contentEl, statsEl, toolEvents);
        } catch {
          // Skip malformed events
        }
      }
    }
  } catch (error) {
    contentEl.innerHTML = renderMarkdown(`**Error:** ${error.message}`);
  }

  setStreaming(false);
  scrollToBottom();
}

// =============================================================================
// Event Handling
// =============================================================================

function handleEvent(event, toolsEl, contentEl, statsEl, toolEvents) {
  switch (event.type) {
    case 'thinking':
      showThinking(contentEl, event.message);
      break;

    case 'tool_start':
      addToolEvent(toolsEl, event, toolEvents);
      break;

    case 'tool_progress':
      updateToolProgress(event, toolEvents);
      break;

    case 'tool_end':
      completeToolEvent(event, toolEvents);
      break;

    case 'tool_error':
      errorToolEvent(event, toolEvents);
      break;

    case 'answer_start':
      clearThinking(contentEl);
      break;

    case 'done':
      clearThinking(contentEl);
      if (event.answer) {
        contentEl.innerHTML = renderMarkdown(event.answer);
      }
      if (event.totalTime || event.iterations || event.tokenUsage) {
        showStats(statsEl, event);
      }
      break;
  }

  scrollToBottom();
}

// =============================================================================
// Tool Event UI
// =============================================================================

function addToolEvent(toolsEl, event, toolEvents) {
  const el = document.createElement('div');
  el.className = 'tool-event running';

  const argsStr = formatToolArgs(event.args);
  el.innerHTML = `
    <div class="tool-icon"><div class="spinner"></div></div>
    <span class="tool-name">${escapeHtml(event.tool)}</span>
    <span class="tool-args">${escapeHtml(argsStr)}</span>
    <span class="tool-duration"></span>
  `;

  // Create expandable detail section
  const detail = document.createElement('div');
  detail.className = 'tool-detail';
  detail.textContent = JSON.stringify(event.args, null, 2);

  el.addEventListener('click', () => {
    detail.classList.toggle('expanded');
  });

  toolsEl.appendChild(el);
  toolsEl.appendChild(detail);

  const key = `${event.tool}-${JSON.stringify(event.args)}`;
  toolEvents.set(key, { el, detail });
}

function updateToolProgress(event, toolEvents) {
  for (const [, state] of toolEvents) {
    if (state.el.querySelector('.tool-name')?.textContent === event.tool && state.el.classList.contains('running')) {
      const argsEl = state.el.querySelector('.tool-args');
      if (argsEl) argsEl.textContent = event.message;
      break;
    }
  }
}

function completeToolEvent(event, toolEvents) {
  const key = `${event.tool}-${JSON.stringify(event.args)}`;
  const state = toolEvents.get(key);
  if (!state) return;

  state.el.className = 'tool-event completed';
  state.el.querySelector('.tool-icon').innerHTML = '<span class="check">&#10003;</span>';

  if (event.duration) {
    const sec = (event.duration / 1000).toFixed(1);
    state.el.querySelector('.tool-duration').textContent = `${sec}s`;
  }

  try {
    const resultObj = JSON.parse(event.result);
    state.detail.textContent = JSON.stringify(resultObj, null, 2);
  } catch {
    state.detail.textContent = event.result || '';
  }
}

function errorToolEvent(event, toolEvents) {
  for (const [, state] of toolEvents) {
    if (state.el.querySelector('.tool-name')?.textContent === event.tool && state.el.classList.contains('running')) {
      state.el.className = 'tool-event errored';
      state.el.querySelector('.tool-icon').innerHTML = '<span class="cross">&#10007;</span>';
      state.detail.textContent = event.error;
      break;
    }
  }
}

function formatToolArgs(args) {
  if (!args) return '';
  const entries = Object.entries(args);
  if (entries.length === 0) return '';
  if (entries.length === 1) return String(entries[0][1]).slice(0, 80);
  return entries.map(([k, v]) => `${k}=${String(v).slice(0, 30)}`).join(', ');
}

// =============================================================================
// Thinking UI
// =============================================================================

function showThinking(contentEl, message) {
  let thinkingEl = contentEl.querySelector('.thinking');
  if (!thinkingEl) {
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'thinking';
    thinkingEl.innerHTML = `
      <div class="thinking-dots"><span></span><span></span><span></span></div>
      <span class="thinking-text"></span>
    `;
    contentEl.appendChild(thinkingEl);
  }
  thinkingEl.querySelector('.thinking-text').textContent = message || 'Thinking...';
}

function clearThinking(contentEl) {
  const thinkingEl = contentEl.querySelector('.thinking');
  if (thinkingEl) thinkingEl.remove();
}

// =============================================================================
// Message Elements
// =============================================================================

function appendUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'message message-user';
  div.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(div);
}

function createAssistantMessage() {
  const div = document.createElement('div');
  div.className = 'message message-assistant';
  div.innerHTML = `
    <div class="tool-events"></div>
    <div class="message-content"></div>
    <div class="stats-bar hidden"></div>
  `;
  messagesEl.appendChild(div);
  return div;
}

function showStats(statsEl, event) {
  const parts = [];
  if (event.totalTime) parts.push(`${(event.totalTime / 1000).toFixed(1)}s`);
  if (event.iterations) parts.push(`${event.iterations} iterations`);
  if (event.tokenUsage?.totalTokens) parts.push(`${event.tokenUsage.totalTokens.toLocaleString()} tokens`);
  if (event.tokensPerSecond) parts.push(`${event.tokensPerSecond.toFixed(0)} tok/s`);

  if (parts.length > 0) {
    statsEl.textContent = parts.join(' · ');
    statsEl.classList.remove('hidden');
  }
}

// =============================================================================
// Cancel
// =============================================================================

async function cancelQuery() {
  try {
    await fetch('/api/chat/cancel', { method: 'POST' });
  } catch {
    // Ignore cancel errors
  }
}

// =============================================================================
// Helpers
// =============================================================================

function setStreaming(streaming) {
  isStreaming = streaming;
  sendBtn.classList.toggle('hidden', streaming);
  cancelBtn.classList.toggle('hidden', !streaming);
  sendBtn.disabled = streaming;
  queryInput.disabled = streaming;
  if (!streaming) queryInput.focus();
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Custom marked renderer: intercept ```chart code fences and render as Chart.js
marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === 'chart') {
        const id = 'chart-' + Math.random().toString(36).slice(2, 9);
        setTimeout(() => {
          const el = document.getElementById(id);
          if (el && typeof renderChartBlock === 'function') renderChartBlock(text, el);
        }, 50);
        return '<div class="chart-container" id="' + id + '"><canvas></canvas></div>';
      }
      return false; // fall through to default
    }
  }
});

function renderMarkdown(text) {
  return sanitizeHtml(marked.parse(text || ''));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Boot chat
init();
