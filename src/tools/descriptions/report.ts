export const GENERATE_REPORT_DESCRIPTION = `
Generates a structured research report from the current analysis session and saves it to disk.

## When to Use

- After completing a multi-step analysis to produce a deliverable report
- When the user asks to "write up", "summarize", or "generate a report" from the analysis
- To create a persistent record of research findings
- After running skills like DCF, comps, or investment-thesis
- When the user asks for a PDF report with charts and branding

## When NOT to Use

- Before gathering any data (run analysis tools first)
- For simple single-metric queries (just answer directly)
- When the user hasn't asked for a formal report

## Usage Notes

- Reports are saved to .petyr/reports/ with date-stamped filenames
- Supports markdown (default), plain text, and PDF formats
- PDF reports include a branded cover page, embedded Chart.js charts, and professional layout
- PDF reports also save the markdown source alongside the PDF
- Use the ticker parameter for PDF reports to show the ticker on the cover page
- Compiles all tool results from the current session into a structured report
- Sections: Executive Summary, Data Gathered, Analysis, Key Findings, Risks, Sources
- PDF reports can be downloaded via /api/reports/{filename}
`.trim();
