import * as path from 'path';

/**
 * Resolve the configured upload directory to an absolute filesystem path.
 * Relative paths are anchored at the process cwd; absolute paths are used as-is.
 */
export function resolveLocalUploadDir(configured?: string): string {
  const candidate = (configured && configured.trim()) || './uploads';
  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(process.cwd(), candidate);
}

/**
 * Normalise the public URL prefix: ensure it begins with a single
 * forward slash and does not end with one.
 */
export function normalizeLocalUploadUrlPrefix(configured?: string): string {
  const candidate = (configured && configured.trim()) || '/uploads';
  const trimmed = candidate.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}
