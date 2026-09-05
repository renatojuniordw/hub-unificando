import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ScannerService } from './scanner.service';

describe('ScannerService', () => {
  const service = new ScannerService();
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'hub-scan-'));
    await mkdir(join(root, 'docs'), { recursive: true });
    await mkdir(join(root, 'node_modules', 'some-pkg'), { recursive: true });
    await writeFile(join(root, 'README.md'), '# readme');
    await writeFile(join(root, 'docs', 'architecture.md'), '# arch');
    await writeFile(join(root, 'docs', 'data.txt'), 'texto');
    await writeFile(join(root, 'docs', 'webp.bin'), 'ignored?');
    await writeFile(join(root, 'node_modules', 'some-pkg', 'deep.md'), 'ignored');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('finds markdown/txt files and skips excluded dirs and other extensions', async () => {
    const files = await service.scanFolder(root);
    const paths = files.map((file) => file.relativePath).sort();
    expect(paths).toEqual(['README.md', 'docs/architecture.md', 'docs/data.txt']);
  });

  it('respects relative path separators', async () => {
    const files = await service.scanFolder(root);
    for (const file of files) {
      expect(file.relativePath).not.toContain('\\');
      expect(file.absolutePath).toBe(join(root, file.relativePath));
    }
  });
});
