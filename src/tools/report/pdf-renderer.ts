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
  const browser = await ensurePdfBrowser();
  const page = await browser.newPage();

  const html = buildReportHtml(params);
  await page.setContent(html, { waitUntil: 'networkidle' });

  // Wait for Chart.js and marked.js to finish rendering
  await page.waitForTimeout(1000);

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    displayHeaderFooter: false,
  });

  await page.close();
  return Buffer.from(pdfBuffer);
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
