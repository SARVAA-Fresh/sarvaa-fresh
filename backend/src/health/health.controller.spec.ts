import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getHealthCheckPath } from './health.controller';

describe('getHealthCheckPath', () => {
  it('returns the current working directory outside production', () => {
    expect(getHealthCheckPath('development', '/tmp/app')).toBe('/tmp/app');
  });

  it('prefers a dist directory relative to the working directory in production when present', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sarvaa-health-'));
    const distDir = path.join(tempDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    try {
      expect(getHealthCheckPath('production', tempDir)).toBe(distDir);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
