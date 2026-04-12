import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';
import { renderReportToPdf } from './pdf-renderer.js';

const PETYR_DIR = resolve(process.cwd(), '.petyr');

/** Assert that a file path stays within .petyr/ before writing. */
function assertWritePathSafe(filePath: string): void {
  const resolved = resolve(filePath);
  if (!resolved.startsWith(PETYR_DIR)) {
    throw new Error('Write path resolves outside .petyr/ directory');
  }
}

const GenerateReportInputSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('Report title. If omitted, a title will be generated from the analysis context.'),
  ticker: z
    .string()
    .optional()
    .describe('Primary ticker symbol for the report cover page (e.g. "AAPL"). Used for PDF reports.'),
  format: z
    .enum(['markdown', 'text', 'pdf'])
    .default('markdown')
    .describe('Output format: markdown (default), text, or pdf (branded PDF with charts).'),
});

export function createGenerateReport(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'generate_report',
    description: `Generates a structured research report from the current analysis session. Compiles all tool results and findings into a professional report saved to disk. Supports markdown, text, and PDF formats. PDF reports include a branded cover page and embedded charts. Use after completing a research workflow to produce a deliverable.`,
    schema: GenerateReportInputSchema,
    func: async (input, _runManager, config) => {
      const scratchpad = config?.metadata?.scratchpad;
      let contextData = '';

      if (scratchpad && typeof scratchpad.getFullContexts === 'function') {
        const contexts = scratchpad.getFullContexts();
        contextData = contexts
          .map((c: { toolName: string; args: Record<string, unknown>; result: string }) =>
            `### ${c.toolName}\n**Args:** ${JSON.stringify(c.args)}\n**Result:** ${c.result}`)
          .join('\n\n');
      }

      if (!contextData.trim()) {
        return formatToolResult({ error: 'No analysis data available. Run some analysis tools first before generating a report.' }, []);
      }

      const chartInstructions = input.format === 'pdf' || input.format === 'markdown'
        ? `\n\nWhen presenting numerical trends (3+ data points) or comparisons, include chart blocks using this format:

\`\`\`chart
{"type":"line","title":"Chart Title","labels":["Label1","Label2"],"datasets":[{"label":"Series","data":[100,120]}]}
\`\`\`

Chart types: "line" for trends, "bar" for comparisons, "pie" or "doughnut" for breakdowns.
Always include the same data as a table alongside the chart.`
        : '';

      const reportPrompt = `Generate a professional financial research report from the following analysis data.

${input.title ? `Report title: ${input.title}` : 'Generate an appropriate title from the data.'}
Format: ${input.format === 'pdf' ? 'markdown' : input.format}

Analysis data:
${contextData}

Structure the report as:
1. **Executive Summary** — 2-3 sentence overview of key findings
2. **Data Gathered** — What data sources were consulted
3. **Analysis** — Detailed findings organized by topic
4. **Key Findings** — Bulleted list of the most important takeaways
5. **Risks & Caveats** — Important limitations or risk factors
6. **Sources** — List of data sources used

${input.format === 'text' ? 'Use plain text formatting.' : 'Use markdown formatting with headers, tables, and bullet points.'}${chartInstructions}`;

      const { response } = await callLlm(reportPrompt, {
        model,
        systemPrompt: 'You are a financial research analyst. Generate clear, professional reports from raw data. When data supports it, include chart code blocks for visual presentation.',
      });

      const reportText = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      // Generate filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const slug = (input.title || 'research-report')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50);

      // Save to .petyr/reports/
      const reportsDir = join(process.cwd(), '.petyr', 'reports');
      mkdirSync(reportsDir, { recursive: true });

      if (input.format === 'pdf') {
        const pdfFilename = `${dateStr}_${slug}.pdf`;
        const pdfBuffer = await renderReportToPdf({
          title: input.title || 'Research Report',
          markdown: reportText,
          ticker: input.ticker,
          date: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        });
        const pdfPath = join(reportsDir, pdfFilename);
        assertWritePathSafe(pdfPath);
        writeFileSync(pdfPath, pdfBuffer);

        // Also save the markdown source
        const mdFilename = `${dateStr}_${slug}.md`;
        const mdPath = join(reportsDir, mdFilename);
        assertWritePathSafe(mdPath);
        writeFileSync(mdPath, reportText, 'utf-8');

        return formatToolResult({
          path: pdfPath,
          filename: pdfFilename,
          format: 'pdf',
          markdown_path: mdPath,
          size_bytes: pdfBuffer.length,
          download_url: `/api/reports/${pdfFilename}`,
        }, []);
      }

      const ext = input.format === 'text' ? 'txt' : 'md';
      const filename = `${dateStr}_${slug}.${ext}`;
      const filepath = join(reportsDir, filename);
      assertWritePathSafe(filepath);
      writeFileSync(filepath, reportText, 'utf-8');

      return formatToolResult({
        path: filepath,
        filename,
        format: input.format,
        length: reportText.length,
        report_text: reportText,
      }, []);
    },
  });
}
