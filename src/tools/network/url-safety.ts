import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'host.docker.internal',
  'metadata.google.internal',
  'metadata.azure.com',
  'metadata.internal',
]);

const BLOCKED_TLDS = ['.localhost', '.local', '.internal'];

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.+$/, '');
}

function parseIpv4(address: string): number[] | null {
  const parts = address.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => Number.parseInt(part, 10));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

function isPrivateIpv4(address: string): boolean {
  const octets = parseIpv4(address);
  if (!octets) {
    return false;
  }

  const [a, b] = octets;
  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  return false;
}

function extractMappedIpv4(address: string): string | null {
  const lower = address.toLowerCase();
  if (!lower.startsWith('::ffff:')) {
    return null;
  }
  return lower.slice('::ffff:'.length);
}

function isPrivateIpv6(address: string): boolean {
  const normalized = normalizeHostname(address);
  const mappedIpv4 = extractMappedIpv4(normalized);

  if (mappedIpv4) {
    return isPrivateIpv4(mappedIpv4);
  }

  // IPv4-compatible addresses (::x.x.x.x without ffff mapping)
  const ipv4CompatMatch = normalized.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4CompatMatch) {
    return isPrivateIpv4(ipv4CompatMatch[1]);
  }

  if (normalized === '::' || normalized === '::1') {
    return true;
  }

  // Unique local addresses (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Teredo addresses (2001:0000::/32) — embed IPv4, block as potentially private
  if (normalized.startsWith('2001:0000') || normalized.startsWith('2001:0:')) {
    return true;
  }

  // Link-local (fe80::/10)
  return (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return isPrivateIpv4(address);
  }
  if (version === 6) {
    return isPrivateIpv6(address);
  }
  return false;
}

export async function assertSafeHttpUrl(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL: must be http or https');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Invalid URL: must be http or https');
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (!hostname) {
    throw new Error('Invalid URL: missing hostname');
  }

  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_TLDS.some(tld => hostname.endsWith(tld))) {
    throw new Error(`Blocked private host: ${hostname}`);
  }

  if (isPrivateAddress(hostname)) {
    throw new Error(`Blocked private IP address: ${hostname}`);
  }

  let records;
  try {
    records = await lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`DNS lookup failed for ${hostname}: ${message}`);
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`DNS lookup returned no addresses for ${hostname}`);
  }

  for (const record of records) {
    if (isPrivateAddress(record.address)) {
      throw new Error(`Blocked private address for ${hostname}: ${record.address}`);
    }
  }

  return parsed;
}
