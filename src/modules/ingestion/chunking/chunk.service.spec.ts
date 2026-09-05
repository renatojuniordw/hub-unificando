import { ChunkService } from './chunk.service';

const P = '#'.repeat(60); // ~60 char paragraph

function section(heading: string, paragraphs: number): string {
  return `${heading}\n\n${Array.from({ length: paragraphs }, (_, i) => `Paragrafo ${i} ${P}`).join('\n\n')}`;
}

// Large enough to force multiple chunks while preserving heading boundaries.
const markdown = [
  '# Home',
  '',
  'Bem-vindo ao projeto. Este parágrafo introduz o conteúdo.',
  '',
  section('## Arquitetura', 18),
  '',
  section('### Módulos', 24),
  '',
  section('## Testes', 20),
].join('\n');

describe('ChunkService', () => {
  const service = new ChunkService();

  it('splits large markdown into heading-aware chunks', () => {
    const chunks = service.chunk('markdown', markdown);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const architecture = chunks.find((c) => c.heading?.includes('Arquitetura'));
    const tests = chunks.find((c) => c.heading?.includes('Testes'));
    expect(architecture?.content).toContain('Paragrafo');
    expect(tests?.content).toContain('Paragrafo');
  });

  it('keeps heading lineage (parent chain)', () => {
    const chunks = service.chunk('markdown', markdown);
    const modules = chunks.find((c) => c.heading?.includes('Módulos'));
    expect(modules).toBeDefined();
    expect(modules?.heading).toContain('Arquitetura');
  });

  it('handles plain text', () => {
    const chunks = service.chunk('txt', 'linha um\n\nlinha dois\n'.repeat(40));
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.content.length).toBeGreaterThan(0);
  });

  it('splits oversized text with a bounded overlap', () => {
    const chunks = service.chunk('markdown', markdown);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of chunks) {
      // max chunk + overlap headroom
      expect(chunk.content.length).toBeLessThanOrEqual(1700);
    }
  });

  it('returns empty for empty text', () => {
    expect(service.chunk('markdown', '')).toEqual([]);
  });

  it('never mixes two H1 documents into the same chunk', () => {
    const twoH1 = ['# Alpha', '', 'Curto conteudo A.', '', '# Beta', '', 'Curto conteudo B.'].join(
      '\n',
    );
    const chunks = service.chunk('markdown', twoH1);
    expect(chunks.length).toBe(2);
    expect(chunks[0]?.heading).toBe('Alpha');
    expect(chunks[0]?.content).not.toContain('Curto conteudo B');
    expect(chunks[1]?.heading).toBe('Beta');
    expect(chunks[1]?.content).toContain('Curto conteudo B');
  });

  it('still groups sub-headings under the same H1', () => {
    const singleH1 = [
      '# Alpha',
      '',
      'Intro A.',
      '',
      '## Beta',
      '',
      'Curto B.',
      '',
      '## Gamma',
      '',
      'Curto C.',
    ].join('\n');
    const chunks = service.chunk('markdown', singleH1);
    expect(chunks.length).toBe(1);
    expect(chunks[0]?.content).toContain('Curto C.');
  });
});
