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
    // dot-directories are never indexed
    await mkdir(join(root, '.agents'), { recursive: true });
    await writeFile(join(root, '.agents', 'hidden.md'), 'ignored');
    // `public` without docs is skipped
    await mkdir(join(root, 'public'), { recursive: true });
    await writeFile(join(root, 'public', 'logo.md'), 'ignored public');
    // nested git checkouts are separate codebases, not docs
    await mkdir(join(root, 'vendor', '.git'), { recursive: true });
    await writeFile(join(root, 'vendor', 'README.md'), 'ignored vendor');
    await writeFile(join(root, 'README.md'), '# readme');
    await writeFile(join(root, 'notes.md'), 'ignored loose note');
    await writeFile(join(root, 'docs', 'architecture.md'), '# arch');
    await writeFile(join(root, 'docs', 'data.txt'), 'texto');
    await writeFile(join(root, 'docs', 'webp.bin'), 'ignored?');
    await writeFile(join(root, 'docs', 'notes.md'), '# doc note');
    await writeFile(join(root, 'node_modules', 'some-pkg', 'deep.md'), 'ignored');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('finds curated knowledge files and skips excluded dirs, loose root notes and other extensions', async () => {
    const files = await service.scanFolder(root);
    const paths = files.map((file) => file.relativePath).sort();
    expect(paths).toEqual(['README.md', 'docs/architecture.md', 'docs/data.txt', 'docs/notes.md']);
  });

  it('still indexes a public folder that hosts docs', async () => {
    const root2 = await mkdtemp(join(tmpdir(), 'hub-scan-public-'));
    await mkdir(join(root2, 'public', 'docs'), { recursive: true });
    await writeFile(join(root2, 'public', 'docs', 'faq.md'), '# faq');
    try {
      const files = await service.scanFolder(root2);
      expect(files.map((file) => file.relativePath).sort()).toEqual(['public/docs/faq.md']);
    } finally {
      await rm(root2, { recursive: true, force: true });
    }
  });

  it('respects relative path separators', async () => {
    const files = await service.scanFolder(root);
    for (const file of files) {
      expect(file.relativePath).not.toContain('\\');
      expect(file.absolutePath).toBe(join(root, file.relativePath));
    }
  });
});
