import { applyPathSpecialization } from './path-specialization';

describe('applyPathSpecialization (spec §8.2.5)', () => {
  it('classifies prompt library files as prompt with a promptId', () => {
    const result = applyPathSpecialization('prompts/backend.md');
    expect(result).toEqual({
      category: 'prompt',
      categories: ['prompt'],
      metadata: { promptId: 'backend' },
    });
  });

  it('classifies CLAUDE.md/AGENTS.md as workflow', () => {
    expect(applyPathSpecialization('CLAUDE.md')?.category).toBe('workflow');
    expect(applyPathSpecialization('docs/AGENTS.md')?.category).toBe('workflow');
  });

  it('classifies MCP documentation as mcp', () => {
    expect(applyPathSpecialization('docs/MCP.md')?.category).toBe('mcp');
    expect(applyPathSpecialization('docs/mcp/README.md')?.category).toBe('mcp');
  });

  it('classifies design-system docs as design-system (keeps semantics)', () => {
    const result = applyPathSpecialization('docs/design-system.md');
    expect(result?.category).toBe('design-system');
    expect(result?.mergeSemantic).toBe(true);
  });

  it('uses the api/general heuristic for README files', () => {
    expect(applyPathSpecialization('README.md', 'REST API endpoints...')?.category).toBe('api');
    expect(applyPathSpecialization('README.md', 'landing page da marca')?.category).toBe('general');
  });

  it('returns null for plain architecture docs', () => {
    expect(applyPathSpecialization('docs/ARCHITECTURE.md')).toBeNull();
  });
});
