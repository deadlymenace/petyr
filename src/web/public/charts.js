/**
 * Petyr client-side chart renderer.
 * Parses chart JSON specs from markdown code fences and renders via Chart.js.
 */

const CHART_COLORS = ['#258bff', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

/**
 * Convert a simplified chart spec (LLM output) to a full Chart.js config.
 */
function chartSpecToConfig(spec) {
  const isPie = spec.type === 'pie' || spec.type === 'doughnut';

  return {
    type: spec.type,
    data: {
      labels: spec.labels,
      datasets: spec.datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        borderColor: isPie ? '#1a1a1a' : CHART_COLORS[i % CHART_COLORS.length],
        backgroundColor: isPie
          ? CHART_COLORS.slice(0, ds.data.length).map(c => c + 'cc')
          : spec.type === 'line'
            ? CHART_COLORS[i % CHART_COLORS.length] + '18'
            : CHART_COLORS[i % CHART_COLORS.length] + '99',
        borderWidth: isPie ? 1 : 2,
        tension: 0.3,
        fill: spec.type === 'line',
        pointRadius: spec.type === 'line' ? 3 : undefined,
        pointBackgroundColor: spec.type === 'line' ? CHART_COLORS[i % CHART_COLORS.length] : undefined,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!spec.title,
          text: spec.title,
          color: '#e8e8e8',
          font: { size: 14, family: "'Inter', sans-serif", weight: '600' },
          padding: { bottom: 16 },
        },
        legend: {
          display: spec.datasets.length > 1 || isPie,
          labels: { color: '#999', font: { size: 11, family: "'Inter', sans-serif" }, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: '#1a1a1a',
          borderColor: '#333',
          borderWidth: 1,
          titleColor: '#e8e8e8',
          bodyColor: '#ccc',
          cornerRadius: 6,
          padding: 10,
        },
      },
      scales: !isPie ? {
        x: {
          ticks: { color: '#666', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: '#333' },
        },
        y: {
          ticks: { color: '#666', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          border: { color: '#333' },
        },
      } : undefined,
    },
  };
}

/**
 * Render a chart from a JSON spec string into a container element.
 * Falls back to showing raw JSON on parse/render error.
 */
function renderChartBlock(jsonString, container) {
  if (!container) return;

  try {
    const spec = JSON.parse(jsonString);
    if (!spec.type || !spec.labels || !spec.datasets) {
      throw new Error('Invalid chart spec');
    }

    const canvas = container.querySelector('canvas') || document.createElement('canvas');
    if (!container.contains(canvas)) container.appendChild(canvas);

    const config = chartSpecToConfig(spec);
    new Chart(canvas, config);
  } catch (e) {
    container.classList.add('chart-error');
    container.innerHTML = '<pre style="color:#ef4444;font-size:12px;margin:0;">Chart error: ' +
      e.message + '\n\n' + jsonString.slice(0, 500) + '</pre>';
  }
}

/**
 * Render an inline SVG sparkline.
 * Usage: renderSparkline([1,3,2,5,4,6], container)
 */
function renderSparkline(data, container) {
  if (!data || !data.length || !container) return;

  const w = 64, h = 18, pad = 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) =>
    `${pad + (i / (data.length - 1)) * (w - 2 * pad)},${pad + (h - 2 * pad) - ((v - min) / range) * (h - 2 * pad)}`
  ).join(' ');

  const color = data[data.length - 1] >= data[0] ? '#22c55e' : '#ef4444';

  container.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="vertical-align:middle">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
