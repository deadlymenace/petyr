import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { callLlm } from '../../model/llm.js';
import { formatToolResult } from '../types.js';

const GenerateReportInputSchema = z.object({
  title: z
    .string()
    .optional()
    .describe('Report title. If omitted, a title will be generated from the analysis context.'),
  format: z
    .enum(['markdown', 'text'])
    .default('markdown')
    .describe('Output format for the report (default: markdown).'),
});

export function createGenerateReport(model: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'generate_report',
    description: `Generates a structured research report from the current analysis session. Compiles all tool results and findings into a professional report saved to disk. Use after completing a research workflow to produce a deliverable.`,
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

      const reportPrompt = `Generate a professional financial research report from the following analysis data.

${input.title ? `Report title: ${input.title}` : 'Generate an appropriate title from the data.'}
Format: ${input.format}

Analysis data:
${contextData}

Structure the report as:
1. **Executive Summary** — 2-3 sentence overview of key findings
2. **Data Gathered** — What data sources were consulted
3. **Analysis** — Detailed findings organized by topic
4. **Key Findings** — Bulleted list of the most important takeaways
5. **Risks & Caveats** — Important limitations or risk factors
6. **Sources** — List of data sources used

${input.format === 'text' ? 'Use plain text formatting.' : 'Use markdown formatting with headers, tables, and bullet points.'}`;

      const { response } = await callLlm(reportPrompt, {
        model,
        systemPrompt: 'You are a financial research analyst. Generate clear, professional reports from raw data.',
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
      const ext = input.format === 'text' ? 'txt' : 'md';
      const filename = `${dateStr}_${slug}.${ext}`;

      // Save to .petyr/reports/
      const reportsDir = join(process.cwd(), '.petyr', 'reports');
      mkdirSync(reportsDir, { recursive: true });
      const filepath = join(reportsDir, filename);
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
