/**
 * HTML report template builder for PDF generation.
 * Produces self-contained HTML with inline CSS, Chart.js, and markdown rendering.
 */

import type { ChartSpec } from './chart-types.js';
import { parseChartSpecs } from './chart-types.js';

const COLORS = ['#258bff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export interface ReportParams {
  title: string;
  markdown: string;
  ticker?: string;
  date: string;
}

/**
 * Lightweight server-side markdown-to-HTML converter.
 * Handles the subset of markdown used in reports (headers, bold, italic,
 * lists, tables, blockquotes, code, links, paragraphs).
 * Eliminates CDN dependency on marked.js inside Playwright.
 */
function markdownToHtml(md: string): string {
  // First escape all HTML in the input to prevent injection
  let html = escapeHtml(md);

  // Code blocks (``` ... ```) — already escaped, just wrap
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Tables
  html = html.replace(
    /(?:^|\n)(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)+)/g,
    (_m, headerRow: string, _sep: string, bodyRows: string) => {
      const headers = headerRow.split('|').filter((c: string) => c.trim()).map((c: string) => `<th>${c.trim()}</th>`).join('');
      const rows = bodyRows.trim().split('\n').map((row: string) => {
        const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('\n');
      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold and italic (using escaped ** and *)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links — already escaped, reconstruct safely
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, href: string) => {
    // Only allow http/https links
    if (!/^https?:\/\//.test(href)) return `${text} (${href})`;
    return `<a href="${href}">${text}</a>`;
  });

  // Unordered lists
  html = html.replace(/(?:^|\n)((?:- .+\n?)+)/g, (_m, block: string) => {
    const items = block.trim().split('\n').map((line: string) => `<li>${line.replace(/^- /, '')}</li>`).join('\n');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/(?:^|\n)((?:\d+\. .+\n?)+)/g, (_m, block: string) => {
    const items = block.trim().split('\n').map((line: string) => `<li>${line.replace(/^\d+\. /, '')}</li>`).join('\n');
    return `<ol>${items}</ol>`;
  });

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Paragraphs — wrap remaining loose lines
  html = html.replace(/^(?!<[a-z/])(.*\S.*)$/gm, '<p>$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

/**
 * Build a self-contained HTML document for PDF rendering.
 * Markdown is rendered server-side. Only Chart.js is loaded from CDN (needed for canvas).
 */
export function buildReportHtml(params: ReportParams): string {
  const { title, markdown, ticker, date } = params;
  const charts = parseChartSpecs(markdown);

  // Convert chart fences to numbered placeholders
  let processedMarkdown = markdown;
  charts.forEach((_, i) => {
    processedMarkdown = processedMarkdown.replace(
      /```chart\n[\s\S]*?```/,
      `<div id="chart-${i}" class="chart-slot" style="width:100%;height:350px;margin:20px 0;"></div>`
    );
  });

  // Render markdown to HTML server-side (no CDN dependency)
  const bodyHtml = markdownToHtml(processedMarkdown);

  const chartScript = charts.length > 0 ? `
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<script>
var charts = ${JSON.stringify(charts)};
charts.forEach(function(spec, i) {
  var container = document.getElementById('chart-' + i);
  if (!container) return;
  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  new Chart(canvas, ${buildChartConfigScript()});
});
</script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${getReportCSS()}
</style>
</head>
<body>

<!-- Cover Page -->
<div class="cover-page">
  <div class="cover-brand">PETYR</div>
  <div class="cover-subtitle">AI Financial Research</div>
  <h1 class="cover-title">${escapeHtml(title)}</h1>
  ${ticker ? `<div class="cover-ticker">${escapeHtml(ticker)}</div>` : ''}
  <div class="cover-date">${escapeHtml(date)}</div>
  <div class="cover-disclaimer">This report was generated by Petyr AI and is for informational purposes only. It does not constitute financial advice.</div>
</div>

<!-- Report Body (rendered server-side) -->
<div class="report-body">${bodyHtml}</div>

<!-- Footer -->
<div class="report-footer">
  Generated by Petyr AI &middot; ${escapeHtml(date)} &middot; Not financial advice
</div>

${chartScript}
</body>
</html>`;
}

function buildChartConfigScript(): string {
  return `{
    type: spec.type,
    data: {
      labels: spec.labels,
      datasets: spec.datasets.map(function(ds, j) {
        var colors = ${JSON.stringify(COLORS)};
        var isPie = spec.type === 'pie' || spec.type === 'doughnut';
        return {
          label: ds.label,
          data: ds.data,
          borderColor: isPie ? '#ddd' : colors[j % colors.length],
          backgroundColor: isPie
            ? colors.slice(0, ds.data.length).map(function(c) { return c + 'cc'; })
            : spec.type === 'line'
              ? colors[j % colors.length] + '18'
              : colors[j % colors.length] + '88',
          borderWidth: 2,
          tension: 0.3,
          fill: spec.type === 'line',
          pointRadius: spec.type === 'line' ? 3 : undefined,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        title: { display: !!spec.title, text: spec.title, font: { size: 14, weight: 'bold' } },
        legend: { display: spec.datasets.length > 1 || spec.type === 'pie' || spec.type === 'doughnut', labels: { font: { size: 10 } } },
      },
      scales: (spec.type !== 'pie' && spec.type !== 'doughnut') ? {
        x: { grid: { color: '#eee' } },
        y: { grid: { color: '#eee' } },
      } : undefined,
    },
  }`;
}

function getReportCSS(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px;
    }
    .cover-brand {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 6px;
      color: #258bff;
      margin-bottom: 8px;
    }
    .cover-subtitle {
      font-size: 12px;
      color: #888;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 40px;
    }
    .cover-title {
      font-size: 32px;
      font-weight: 700;
      color: #111;
      max-width: 600px;
      margin-bottom: 16px;
    }
    .cover-ticker {
      font-size: 20px;
      font-weight: 600;
      color: #258bff;
      margin-bottom: 24px;
    }
    .cover-date {
      font-size: 14px;
      color: #666;
      margin-bottom: 60px;
    }
    .cover-disclaimer {
      font-size: 10px;
      color: #999;
      max-width: 400px;
      line-height: 1.4;
    }

    /* Report Body */
    .report-body {
      padding: 40px 50px;
      max-width: 800px;
      margin: 0 auto;
    }
    .report-body h1 { font-size: 22px; font-weight: 700; margin: 32px 0 12px; color: #111; border-bottom: 2px solid #258bff; padding-bottom: 6px; }
    .report-body h2 { font-size: 17px; font-weight: 600; margin: 28px 0 10px; color: #222; page-break-after: avoid; }
    .report-body h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; color: #333; }
    .report-body p { margin: 8px 0; }
    .report-body ul, .report-body ol { margin: 8px 0 8px 24px; }
    .report-body li { margin: 4px 0; }
    .report-body strong { font-weight: 600; }
    .report-body blockquote { border-left: 3px solid #258bff; padding-left: 12px; color: #555; margin: 12px 0; }

    /* Tables */
    .report-body table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }
    .report-body th {
      background: #f5f5f5;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #ddd;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .report-body td {
      padding: 6px 10px;
      border: 1px solid #e5e5e5;
      font-variant-numeric: tabular-nums;
    }
    .report-body tr:nth-child(even) td { background: #fafafa; }

    /* Code */
    .report-body code {
      background: #f3f3f3;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 12px;
    }
    .report-body pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 12px 0;
    }

    /* Charts */
    .chart-slot {
      page-break-inside: avoid;
    }

    /* Footer */
    .report-footer {
      text-align: center;
      font-size: 10px;
      color: #999;
      padding: 20px;
      border-top: 1px solid #eee;
      margin-top: 40px;
    }

    /* Print */
    @media print {
      .cover-page { height: auto; min-height: 100vh; }
      .report-body h2 { page-break-after: avoid; }
      .chart-slot { page-break-inside: avoid; }
    }
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
