/**
 * Shared chart spec types used by both client-side (charts.js) and server-side (chart-renderer.ts).
 */

export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartSpec {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Extract chart specs from markdown text by parsing ```chart code fences.
 */
export function parseChartSpecs(markdown: string): ChartSpec[] {
  const regex = /```chart\n([\s\S]*?)```/g;
  const specs: ChartSpec[] = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.type && parsed.labels && parsed.datasets) {
        specs.push(parsed);
      }
    } catch {
      // Skip malformed chart blocks
    }
  }
  return specs;
}

/**
 * Strip chart code fences from markdown, replacing with a placeholder.
 */
export function stripChartFences(markdown: string): string {
  return markdown.replace(/```chart\n[\s\S]*?```/g, '[chart]');
}
