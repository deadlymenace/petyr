import { PDFParse } from 'pdf-parse';
// @ts-ignore — papaparse has no bundled types
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const MAX_TEXT_LENGTH = 100_000;
const MAX_TABLE_ROWS = 500;
const PDF_TIMEOUT_MS = 30_000; // 30 second timeout for PDF parsing

const SUPPORTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
  'text/plain': 'text',
  'text/markdown': 'text',
  'application/json': 'text',
};

/** Infer type from file extension when MIME type is generic (e.g. application/octet-stream). */
function inferType(mimeType: string, filename: string): string | null {
  const mapped = SUPPORTED_TYPES[mimeType];
  if (mapped) return mapped;

  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'csv': return 'csv';
    case 'xlsx': case 'xls': return 'xlsx';
    case 'txt': return 'text';
    case 'md': return 'text';
    case 'json': return 'text';
    default: return null;
  }
}

/** Convert a 2D array of rows into a markdown table string. */
function toMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return '*(empty)*';
  const header = rows[0];
  const divider = header.map(() => '---');
  const dataRows = rows.slice(1, MAX_TABLE_ROWS + 1);
  const escapeCell = (c: unknown) => String(c ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines = [
    '| ' + header.map(escapeCell).join(' | ') + ' |',
    '| ' + divider.join(' | ') + ' |',
    ...dataRows.map(r => '| ' + r.map(escapeCell).join(' | ') + ' |'),
  ];
  if (rows.length - 1 > MAX_TABLE_ROWS) {
    lines.push(`\n*(truncated — showing ${MAX_TABLE_ROWS} of ${rows.length - 1} rows)*`);
  }
  return lines.join('\n');
}

async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
  try {
    const result = await Promise.race([
      parser.getText(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF parsing timed out')), PDF_TIMEOUT_MS)
      ),
    ]);
    return result.text;
  } finally {
    await parser.destroy().catch(() => {});
  }
}

function parseCsv(buffer: Buffer): string {
  const text = buffer.toString('utf-8');
  const result = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows = result.data as string[][];
  return toMarkdownTable(rows);
}

function parseXlsx(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: MAX_TABLE_ROWS + 1 });
  const sections: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
    sections.push(`#### Sheet: ${sheetName}\n\n${toMarkdownTable(rows as string[][])}`);
  }
  return sections.join('\n\n');
}

function parseText(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

export async function parseUploadedFile(
  buffer: Buffer, mimeType: string, filename: string
): Promise<{ text: string; type: string }> {
  const type = inferType(mimeType, filename);
  if (!type) {
    return { text: `Unsupported file type: ${mimeType} (${filename})`, type: 'error' };
  }

  let text: string;
  try {
    switch (type) {
      case 'pdf':  text = await parsePdf(buffer); break;
      case 'csv':  text = parseCsv(buffer); break;
      case 'xlsx': text = parseXlsx(buffer); break;
      case 'text': text = parseText(buffer); break;
      default:     text = `Unsupported type: ${type}`; break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { text: `Error parsing ${filename}: ${msg}`, type: 'error' };
  }

  if (text.length > MAX_TEXT_LENGTH) {
    text = text.slice(0, MAX_TEXT_LENGTH) + `\n\n*(truncated at ${MAX_TEXT_LENGTH.toLocaleString()} characters)*`;
  }

  return { text, type };
}
