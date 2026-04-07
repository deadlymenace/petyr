/**
 * Server-side chart rendering via Playwright.
 * Renders chart specs to PNG images for PDFs and messaging channels.
 */

import { chromium, type Browser } from 'playwright';
import type { ChartSpec } from './chart-types.js';

let chartBrowser: Browser | null = null;

const COLORS = ['#258bff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

async function ensureChartBrowser(): Promise<Browser> {
  if (!chartBrowser) {
    chartBrowser = await chromium.launch({ headless: true });
  }
  return chartBrowser;
}

/**
 * Render a chart spec to a PNG buffer.
 */
export async function renderChartToPng(
  spec: ChartSpec,
  width = 800,
  height = 400
): Promise<Buffer> {
  const browser = await ensureChartBrowser();
  const page = await browser.newPage({ viewport: { width, height } });

  const config = buildChartJSConfig(spec);
  const html = `<!DOCTYPE html>
<html><head>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
  body { margin: 0; background: #0a0a0a; display: flex; align-items: center; justify-content: center; width: ${width}px; height: ${height}px; }
  canvas { width: 100%; height: 100%; }
</style>
</head><body>
<canvas id="c"></canvas>
<script>
  new Chart(document.getElementById('c'), ${JSON.stringify(config)});
</script>
</body></html>`;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500); // Allow Chart.js animation to complete

  const screenshot = await page.locator('canvas').screenshot({ type: 'png' });
  await page.close();

  return Buffer.from(screenshot);
}

/**
 * Close the chart browser instance (cleanup).
 */
export async function closeChartBrowser(): Promise<void> {
  if (chartBrowser) {
    await chartBrowser.close();
    chartBrowser = null;
  }
}

function buildChartJSConfig(spec: ChartSpec): Record<string, unknown> {
  const isPie = spec.type === 'pie' || spec.type === 'doughnut';

  return {
    type: spec.type,
    data: {
      labels: spec.labels,
      datasets: spec.datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        borderColor: isPie ? '#1a1a1a' : COLORS[i % COLORS.length],
        backgroundColor: isPie
          ? COLORS.slice(0, ds.data.length).map(c => c + 'cc')
          : spec.type === 'line'
            ? COLORS[i % COLORS.length] + '18'
            : COLORS[i % COLORS.length] + '99',
        borderWidth: isPie ? 1 : 2,
        tension: 0.3,
        fill: spec.type === 'line',
        pointRadius: spec.type === 'line' ? 3 : undefined,
      })),
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: !!spec.title,
          text: spec.title,
          color: '#e8e8e8',
          font: { size: 14, weight: 'bold' },
        },
        legend: {
          display: spec.datasets.length > 1 || isPie,
          labels: { color: '#999', font: { size: 11 }, boxWidth: 12 },
        },
      },
      scales: !isPie ? {
        x: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      } : undefined,
    },
  };
}
