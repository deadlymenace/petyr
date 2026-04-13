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
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const attachmentChips = document.getElementById('attachment-chips');
const dropZoneOverlay = document.getElementById('drop-zone-overlay');

let isStreaming = false;
let activeAbortController = null;
let pendingFiles = []; // Files selected but not yet uploaded

// Unique session ID per browser tab — cryptographically random
const SESSION_ID = 'web-' + crypto.randomUUID();

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
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'strong', 'em', 'del', 'img', 'div', 'span',
      'sup', 'sub', 'canvas',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'target', 'rel', 'width', 'height',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['rel'],
  });
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

  // File attachment handlers
  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileSelect);

  // Drag-and-drop on the chat container
  initDragDrop();
}

function autoResize() {
  queryInput.style.height = 'auto';
  queryInput.style.height = Math.min(queryInput.scrollHeight, 120) + 'px';
}

// =============================================================================
// File Attachment
// =============================================================================

const ALLOWED_EXTENSIONS = ['.pdf', '.csv', '.xlsx', '.xls', '.txt', '.md', '.json'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_FILES = 5;

function handleFileSelect(e) {
  addFiles(Array.from(e.target.files));
  fileInput.value = ''; // Reset so re-selecting same file works
}

function addFiles(files) {
  for (const file of files) {
    if (pendingFiles.length >= MAX_FILES) break;

    // Extension check
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXTENSIONS.includes(ext)) continue;

    // Size check
    if (file.size > MAX_FILE_SIZE) continue;

    // Deduplicate by name
    if (pendingFiles.some(f => f.name === file.name)) continue;

    pendingFiles.push(file);
  }
  renderAttachmentChips();
}

function removeFile(index) {
  pendingFiles.splice(index, 1);
  renderAttachmentChips();
}

function renderAttachmentChips() {
  attachmentChips.innerHTML = '';
  pendingFiles.forEach((file, i) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = `
      <span class="chip-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
      </span>
      <span class="chip-name">${escapeHtml(file.name)}</span>
      <button class="chip-remove" data-index="${i}" title="Remove">&times;</button>
    `;
    chip.querySelector('.chip-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      removeFile(i);
    });
    attachmentChips.appendChild(chip);
  });
}

function clearAttachments() {
  pendingFiles = [];
  attachmentChips.innerHTML = '';
}

// =============================================================================
// Drag and Drop
// =============================================================================

function initDragDrop() {
  let dragCounter = 0;
  const appEl = document.querySelector('.app');

  appEl.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropZoneOverlay.classList.remove('hidden');
  });

  appEl.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropZoneOverlay.classList.add('hidden');
    }
  });

  appEl.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  appEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropZoneOverlay.classList.add('hidden');
    if (e.dataTransfer?.files?.length) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  });
}

// =============================================================================
// Upload Files
// =============================================================================

async function uploadFiles() {
  if (pendingFiles.length === 0) return [];

  const formData = new FormData();
  formData.append('session_id', SESSION_ID);
  pendingFiles.forEach(f => formData.append('files', f));

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `Upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.files.map(f => f.id);
}

// =============================================================================
// Send Message
// =============================================================================

async function sendMessage() {
  const query = queryInput.value.trim();
  if (!query) return;

  // Hide welcome, show messages
  welcomeEl.classList.add('hidden');

  // Capture file names for the user message display
  const attachedFileNames = pendingFiles.map(f => f.name);

  // Add user message
  appendUserMessage(query, attachedFileNames);
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

  // Client-side abort controller — allows cancel button to immediately stop the fetch
  const abortController = new AbortController();
  activeAbortController = abortController;

  try {
    // Upload files first if any are attached
    let fileIds = [];
    if (pendingFiles.length > 0) {
      fileIds = await uploadFiles();
      clearAttachments();
    }

    const chatBody = { query, session_id: SESSION_ID };
    if (fileIds.length > 0) chatBody.file_ids = fileIds;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatBody),
      signal: abortController.signal,
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
    if (error.name === 'AbortError') {
      contentEl.innerHTML = renderMarkdown('*Query cancelled.*');
    } else {
      contentEl.innerHTML = renderMarkdown(`**Error:** Something went wrong. Please try again.`);
    }
    clearAttachments();
  }

  activeAbortController = null;
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

    case 'tool_limit':
    case 'tool_approval':
    case 'tool_denied':
    case 'context_cleared':
      // Acknowledged but not displayed in UI
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

function appendUserMessage(text, fileNames) {
  const div = document.createElement('div');
  div.className = 'message message-user';

  let attachmentsHtml = '';
  if (fileNames && fileNames.length > 0) {
    const tags = fileNames.map(name =>
      `<span class="message-attachment-tag">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        ${escapeHtml(name)}
      </span>`
    ).join('');
    attachmentsHtml = `<div class="message-attachments">${tags}</div>`;
  }

  div.innerHTML = `<div class="message-content">${attachmentsHtml}${escapeHtml(text)}</div>`;
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
  // Immediately abort the client-side fetch (stops the reader loop)
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  // Also tell the server to abort (cleans up server-side resources)
  try {
    await fetch('/api/chat/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID }),
    });
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
  attachBtn.disabled = streaming;
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
