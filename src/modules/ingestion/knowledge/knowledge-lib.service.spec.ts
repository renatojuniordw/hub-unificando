import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { KnowledgeLibService } from './knowledge-lib.service';
import { PromptExtractorService } from './prompt-extractor.service';
import { ScannerService } from '../scan/scanner.service';

describe('KnowledgeLibService.syncDocs', () => {
  let service: KnowledgeLibService;
  let scanner: ScannerService;
  let promptExtractor: PromptExtractorService;
  let knowledgeLibRoot: string;
  let scanRoot: string;
  let prismaMock: { project: { findMany: jest.Mock } };

  beforeEach(async () => {
    scanner = new ScannerService();
    promptExtractor = new PromptExtractorService();
    knowledgeLibRoot = await mkdtemp(join(tmpdir(), 'hub-lib-root-'));
    scanRoot = await mkdtemp(join(tmpdir(), 'hub-lib-scan-'));
    prismaMock = { project: { findMany: jest.fn() } };
    service = new KnowledgeLibService(prismaMock as never, scanner, promptExtractor, {
      KNOWLEDGE_LIB_ROOT: knowledgeLibRoot,
      HUB_SCAN_ROOT: scanRoot,
    } as never);
  });

  afterEach(async () => {
    await rm(knowledgeLibRoot, { recursive: true, force: true });
    await rm(scanRoot, { recursive: true, force: true });
  });

  const seedProject = async (
    slug: string,
    files: Record<string, string>,
    prompts?: Record<string, string>,
  ) => {
    const projectRoot = join(scanRoot, slug);
    for (const [relativePath, content] of Object.entries(files)) {
      const absolute = join(projectRoot, relativePath);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, content, 'utf8');
    }
    if (prompts) {
      const promptsDir = join(projectRoot, 'src/lib/core/ai/prompts');
      await mkdir(promptsDir, { recursive: true });
      for (const [name, content] of Object.entries(prompts)) {
        await writeFile(join(promptsDir, name), content, 'utf8');
      }
    }
    return { slug, folderPath: slug, name: slug, enabled: true };
  };

  it('mirrors scanned files and generated prompts, pruning stale lib files', async () => {
    const project = await seedProject(
      'radar-unificando',
      { 'README.md': '# radar', 'docs/AI.md': '# AI' },
      { 'demo-prompt.ts': 'export const DEMO_PROMPT = `Você é um avaliador.`;\n' },
    );
    prismaMock.project.findMany.mockResolvedValue([project]);

    // Stale file from a previous sync that left the live set.
    const destRoot = join(knowledgeLibRoot, 'radar-unificando');
    await mkdir(join(destRoot, 'docs'), { recursive: true });
    await writeFile(join(destRoot, 'docs', 'OLD.md'), 'stale', 'utf8');

    const result = await service.syncDocs(['radar-unificando']);

    expect(result.projects).toBe(1);
    expect(result.filesCopied).toBe(3); // README + docs/AI.md + generated prompt
    expect(result.filesGenerated).toBe(1);
    expect(result.filesRemoved).toBe(1); // docs/OLD.md pruned
    expect(await readFile(join(destRoot, 'README.md'), 'utf8')).toBe('# radar');
    expect(await readFile(join(destRoot, 'prompts', 'demo.md'), 'utf8')).toContain(
      'Você é um avaliador.',
    );
    await expect(readFile(join(destRoot, 'docs', 'OLD.md'), 'utf8')).rejects.toThrow();
  });

  it('dry-run reports without writing', async () => {
    const project = await seedProject('pdf-unificando', { 'README.md': '# pdf' });
    prismaMock.project.findMany.mockResolvedValue([project]);

    const result = await service.syncDocs(['pdf-unificando'], { dryRun: true });

    expect(result.filesCopied).toBe(0);
    expect(result.filesGenerated).toBe(0);
    await expect(
      readFile(join(knowledgeLibRoot, 'pdf-unificando', 'README.md'), 'utf8'),
    ).rejects.toThrow();
  });

  it('skips projects whose source is missing without pruning the lib', async () => {
    prismaMock.project.findMany.mockResolvedValue([
      { slug: 'ghost-unificando', folderPath: 'ghost-unificando', name: 'ghost', enabled: true },
    ]);
    const destRoot = join(knowledgeLibRoot, 'ghost-unificando');
    await mkdir(destRoot, { recursive: true });
    await writeFile(join(destRoot, 'README.md'), 'keep me', 'utf8');

    const result = await service.syncDocs(['ghost-unificando']);

    expect(result.projects).toBe(0);
    expect(result.filesRemoved).toBe(0);
    expect(await readFile(join(destRoot, 'README.md'), 'utf8')).toBe('keep me');
  });

  it('skips a project without pruning when prompt extraction fails', async () => {
    const projectRoot = join(scanRoot, 'radar-unificando');
    await mkdir(join(projectRoot, 'src/lib/core/ai/prompts'), { recursive: true });
    await writeFile(
      join(projectRoot, 'src/lib/core/ai/prompts', 'broken.ts'),
      'export const BROKEN_PROMPT = `x ${unknownHelper()} y`;\n',
      'utf8',
    );
    prismaMock.project.findMany.mockResolvedValue([
      { slug: 'radar-unificando', folderPath: 'radar-unificando', name: 'radar', enabled: true },
    ]);
    const destRoot = join(knowledgeLibRoot, 'radar-unificando');
    await mkdir(destRoot, { recursive: true });
    await writeFile(join(destRoot, 'README.md'), 'keep me', 'utf8');

    const result = await service.syncDocs(['radar-unificando']);

    expect(result.projects).toBe(0);
    expect(result.filesRemoved).toBe(0);
    expect(await readFile(join(destRoot, 'README.md'), 'utf8')).toBe('keep me');
  });

  it('is idempotent on disk: second sync rewrites the same files and prunes nothing', async () => {
    const project = await seedProject(
      'radar-unificando',
      { 'README.md': '# radar', 'docs/API.md': '# API' },
      { 'chat.ts': 'export const CHAT_PROMPT = `oi`;\n' },
    );
    prismaMock.project.findMany.mockResolvedValue([project]);

    await service.syncDocs(['radar-unificando']);
    const second = await service.syncDocs(['radar-unificando']);

    expect(second.filesRemoved).toBe(0);
    expect(second.filesGenerated).toBe(1);
    expect(second.filesCopied).toBe(3); // same live set rewritten
    const prompts = await readdir(join(knowledgeLibRoot, 'radar-unificando', 'prompts'));
    expect(prompts).toEqual(['chat.md']);
  });
});
