import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveKnowledgeLibRoot, resolveProjectRoot } from './project-source';

describe('resolveProjectRoot', () => {
  let knowledgeLibRoot: string;
  let scanRoot: string;

  beforeAll(async () => {
    knowledgeLibRoot = await mkdtemp(join(tmpdir(), 'hub-knowledge-lib-'));
    scanRoot = await mkdtemp(join(tmpdir(), 'hub-scan-root-'));
    // Lib mirrors two projects; a third lives only in the sibling root.
    await mkdir(join(knowledgeLibRoot, 'med-unificando'), { recursive: true });
    await mkdir(join(scanRoot, 'med-unificando'), { recursive: true });
    await mkdir(join(scanRoot, 'pdf-unificando'), { recursive: true });
    await mkdir(join(scanRoot, 'radar'), { recursive: true });
  });

  afterAll(async () => {
    await rm(knowledgeLibRoot, { recursive: true, force: true });
    await rm(scanRoot, { recursive: true, force: true });
  });

  it('keeps absolute folderPaths as the source', async () => {
    const resolved = await resolveProjectRoot(
      { slug: 'fixture', folderPath: '/tmp/whatever/fixture' },
      { knowledgeLibRoot, scanRoot },
    );
    expect(resolved).toEqual({ kind: 'absolute', path: '/tmp/whatever/fixture' });
  });

  it('prefers the knowledge lib when the slug folder exists', async () => {
    const resolved = await resolveProjectRoot(
      { slug: 'med-unificando', folderPath: 'med-unificando' },
      { knowledgeLibRoot, scanRoot },
    );
    expect(resolved.kind).toBe('knowledge-lib');
    expect(resolved.path).toBe(join(knowledgeLibRoot, 'med-unificando'));
  });

  it('falls back to the scan root when the lib lacks the slug', async () => {
    const resolved = await resolveProjectRoot(
      { slug: 'pdf-unificando', folderPath: 'pdf-unificando' },
      { knowledgeLibRoot, scanRoot },
    );
    expect(resolved.kind).toBe('scan-root');
    expect(resolved.path).toBe(join(scanRoot, 'pdf-unificando'));
  });

  it('supports nested folderPaths against the scan root', async () => {
    const resolved = await resolveProjectRoot(
      { slug: 'radar-unificando', folderPath: 'radar/radar-unificando' },
      { knowledgeLibRoot, scanRoot },
    );
    expect(resolved.kind).toBe('scan-root');
    expect(resolved.path).toBe(join(scanRoot, 'radar/radar-unificando'));
  });

  it('respects preferKnowledgeLib=false (always scan root)', async () => {
    const resolved = await resolveProjectRoot(
      { slug: 'med-unificando', folderPath: 'med-unificando' },
      { knowledgeLibRoot, scanRoot, preferKnowledgeLib: false },
    );
    expect(resolved.kind).toBe('scan-root');
  });
});

describe('resolveKnowledgeLibRoot', () => {
  it('keeps absolute values untouched', () => {
    expect(resolveKnowledgeLibRoot('/app/knowledge')).toBe('/app/knowledge');
  });

  it('resolves relative values against the working directory', () => {
    const base = process.cwd().replace(/\/+$/, '');
    expect(resolveKnowledgeLibRoot('knowledge')).toBe(`${base}/knowledge`);
    expect(resolveKnowledgeLibRoot('./knowledge')).toBe(`${base}/knowledge`);
  });
});
