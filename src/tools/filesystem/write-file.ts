import { DynamicStructuredTool } from '@langchain/core/tools';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { z } from 'zod';
import { formatToolResult } from '../types.js';
import { assertSandboxPath } from './sandbox.js';

const writeFileSchema = z.object({
  path: z.string().describe('Path to the file to write (relative or absolute).'),
  content: z.string().describe('Content to write to the file.'),
});

const MAX_WRITE_SIZE = 1_000_000; // 1 MB max write

const BLOCKED_WRITE_DIRS = new Set(['.aws', '.git', '.gnupg', '.ssh', '.petyr']);
const BLOCKED_WRITE_FILENAMES = new Set([
  '.bash_history', '.bash_profile', '.bashrc', '.zshrc', '.profile',
  '.git-credentials', '.netrc', '.npmrc', '.pypirc',
  'creds.json', 'creds.json.bak', 'gateway.json', 'sessions.json', 'whatsapp.json',
  'id_ed25519', 'id_rsa',
]);
const BLOCKED_WRITE_EXTENSIONS = ['.key', '.p12', '.pem', '.pfx'];

function assertWritePathAllowed(path: string, relativePath: string): void {
  const normalizedRelative = relativePath.replace(/\\/g, '/');
  const segments = normalizedRelative.split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
  const name = basename(normalizedRelative || path).toLowerCase();

  if (segments.some(segment => BLOCKED_WRITE_DIRS.has(segment))) {
    throw new Error(`Writing to sensitive paths is not allowed: ${path}`);
  }
  if (name === '.env' || (name.startsWith('.env.') && name !== '.env.example')) {
    throw new Error(`Writing to sensitive paths is not allowed: ${path}`);
  }
  if (BLOCKED_WRITE_FILENAMES.has(name) || BLOCKED_WRITE_EXTENSIONS.some(ext => name.endsWith(ext))) {
    throw new Error(`Writing to sensitive paths is not allowed: ${path}`);
  }
}

export const writeFileTool = new DynamicStructuredTool({
  name: 'write_file',
  description:
    'Create or overwrite a file inside the workspace. Automatically creates parent directories when needed.',
  schema: writeFileSchema,
  func: async (input) => {
    // Enforce write size limit
    if (Buffer.byteLength(input.content, 'utf-8') > MAX_WRITE_SIZE) {
      throw new Error(`Content exceeds maximum write size of ${MAX_WRITE_SIZE} bytes`);
    }

    const cwd = process.cwd();
    const { resolved, relative: relPath } = await assertSandboxPath({
      filePath: input.path,
      cwd,
      root: cwd,
    });
    assertWritePathAllowed(input.path, relPath);

    const dir = dirname(resolved);
    await mkdir(dir, { recursive: true });
    await writeFile(resolved, input.content, 'utf-8');

    return formatToolResult({
      path: input.path,
      bytesWritten: Buffer.byteLength(input.content, 'utf-8'),
      message: `Successfully wrote ${input.content.length} characters to ${input.path}`,
    });
  },
});
