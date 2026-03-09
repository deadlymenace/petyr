export const GENERATE_REPORT_DESCRIPTION = `
Generates a structured research report from the current analysis session and saves it to disk.

## When to Use

- After completing a multi-step analysis to produce a deliverable report
- When the user asks to "write up", "summarize", or "generate a report" from the analysis
- To create a persistent record of research findings
- After running skills like DCF, comps, or investment-thesis

## When NOT to Use

- Before gathering any data (run analysis tools first)
- For simple single-metric queries (just answer directly)
- When the user hasn't asked for a formal report

## Usage Notes

- Reports are saved to .petyr/reports/ with date-stamped filenames
- Supports markdown (default) and plain text formats
- Compiles all tool results from the current session into a structured report
- Sections: Executive Summary, Data Gathered, Analysis, Key Findings, Risks, Sources
`.trim();
