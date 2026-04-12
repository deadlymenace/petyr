/**
 * PDF report renderer using Playwright.
 * Converts markdown + charts into a branded PDF document.
 */

import { chromium, type Browser } from 'playwright';
import { buildReportHtml, type ReportParams } from './report-template.js';

let pdfBrowser: Browser | null = null;

async function ensurePdfBrowser(): Promise<Browser> {
  if (!pdfBrowser) {
    pdfBrowser = await chromium.launch({ headless: true });
  }
  return pdfBrowser;
}

/**
 * Render a report to PDF buffer.
 * Uses Playwright to load the self-contained HTML and print to PDF.
 */
export async function renderReportToPdf(params: ReportParams): Promise<Buffer> {
  let browser: Browser;
  try {
    browser = await ensurePdfBrowser();
  } catch (err) {
    // Reset cached browser on failure so next attempt retries
    pdfBrowser = null;
    throw new Error(`Failed to launch PDF browser: ${err instanceof Error ? err.message : String(err)}`);
  }

  const page = await browser.newPage();
  try {
    const html = buildReportHtml(params);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Give Chart.js time to render canvases (only needed when charts exist)
    await page.waitForTimeout(1500);

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: false,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Close the PDF browser instance (cleanup).
 */
export async function closePdfBrowser(): Promise<void> {
  if (pdfBrowser) {
    await pdfBrowser.close();
    pdfBrowser = null;
  }
}
