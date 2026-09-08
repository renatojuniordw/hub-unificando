import { parseMarkdownSections } from './sections';

describe('parseMarkdownSections — heading dentro de code fence', () => {
  it('trata `#` dentro de fence como conteúdo, não heading', () => {
    const md = [
      '# Documentação',
      '',
      'Introdução.',
      '',
      '```ts',
      '// exemplo com heading falso',
      '## Isso é conteúdo, não heading',
      'const x = 1;',
      '```',
      '',
      'Depois do fence.',
    ].join('\n');

    const sections = parseMarkdownSections(md);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.headingLineage).toEqual(['Documentação']);
    // O conteúdo do fence permanece na seção do H1 — nenhuma seção "Isso é conteúdo".
    expect(sections[0]?.content).toContain('## Isso é conteúdo, não heading');
    expect(sections[0]?.content).toContain('Depois do fence.');
  });

  it('após o fechamento do fence, heading volta a criar seção', () => {
    const md = ['# A', '', '```md', '# dentro', '```', '', '## Seção real', '', 'conteúdo.'].join(
      '\n',
    );

    const sections = parseMarkdownSections(md);
    expect(sections).toHaveLength(2);
    expect(sections[0]?.headingLineage).toEqual(['A']);
    expect(sections[1]?.headingLineage).toEqual(['A', 'Seção real']);
  });

  it('aceita fence com ~ (tilde)', () => {
    const md = ['# B', '', '~~~', '# falso', '~~~', '', 'depois.'].join('\n');
    const sections = parseMarkdownSections(md);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.content).toContain('depois.');
  });
});
