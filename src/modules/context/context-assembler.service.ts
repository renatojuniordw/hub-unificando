import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { DecisionsService } from '../decisions/decisions.service';
import { estimateTokens, fitTextToTokens } from './token';
import type { ContextSectionId } from './context.dto';

export interface ContextSection {
  id: string;
  title: string;
  content: string;
  tokens: number;
}

export interface LLMContextPackage {
  meta: {
    projectSlug: string;
    topic: string | null;
    generatedAt: string;
    tokenBudget: number;
    totalTokens: number;
  };
  sections: ContextSection[];
}

export interface ExportContextParams {
  projectSlug: string;
  topic?: string;
  categories?: string[];
  maxTokens: number;
  /** Section ids to include; all when omitted. */
  sections?: ContextSectionId[];
}

interface ChunkView {
  projectSlug: string;
  path: string;
  title: string;
  heading: string | null;
  anchor: string | null;
  content: string;
  tokenCount: number;
  score: number;
}

interface SourceRef {
  key: string;
  label: string;
  tokens: number;
}

const ALL_SECTIONS: ContextSectionId[] = [
  'visao_geral',
  'arquitetura',
  'design_system',
  'componentes_reutilizaveis',
  'exemplos',
  'decisoes_previas',
  'convencoes',
  'fontes',
];

const SECTION_TITLES: Record<ContextSectionId, string> = {
  visao_geral: 'Visão Geral',
  arquitetura: 'Arquitetura',
  design_system: 'Design System',
  componentes_reutilizaveis: 'Componentes reutilizáveis',
  exemplos: 'Exemplos',
  decisoes_previas: 'Decisões prévias',
  convencoes: 'Convenções',
  fontes: 'Fontes',
};

/** Importance for token trimming: lower = kept longer. */
const SECTION_PRIORITY: Record<ContextSectionId, number> = {
  visao_geral: 0,
  fontes: 1,
  arquitetura: 2,
  decisoes_previas: 3,
  design_system: 4,
  convencoes: 5,
  componentes_reutilizaveis: 6,
  exemplos: 7,
};

const DEFAULT_MAX_TOKENS = 6000;

/**
 * Builds the spec §12 LLM context package. Every statement carries an inline
 * source (`_Fonte:_ project/path#heading`) and a `fontes` section lists all
 * included chunks with their token counts, so agents can always trace claims.
 */
@Injectable()
export class ContextAssemblerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly decisionsService: DecisionsService,
  ) {}

  async export(params: ExportContextParams): Promise<LLMContextPackage> {
    const project = await this.prisma.project.findUnique({
      where: { slug: params.projectSlug },
    });
    if (!project) {
      throw new NotFoundException(`Project "${params.projectSlug}" not found`);
    }

    const budget = Math.max(500, params.maxTokens ?? DEFAULT_MAX_TOKENS);
    const topic = params.topic ?? null;
    const wanted = params.sections && params.sections.length > 0 ? params.sections : ALL_SECTIONS;
    const sections: ContextSection[] = [];
    const sources = new Map<string, SourceRef>();

    if (wanted.includes('visao_geral')) {
      sections.push(this.buildRegistry(project));
    }
    if (wanted.includes('arquitetura')) {
      sections.push(await this.buildArchitecture(params.projectSlug, topic, sources));
    }
    if (wanted.includes('design_system')) {
      sections.push(await this.buildDesignSystem(params.projectSlug, topic, sources));
    }
    if (wanted.includes('componentes_reutilizaveis')) {
      sections.push(await this.buildReusableComponents(params.projectSlug, topic, sources));
    }
    if (wanted.includes('exemplos')) {
      sections.push(await this.buildExamples(params.projectSlug, topic, sources));
    }
    if (wanted.includes('decisoes_previas')) {
      sections.push(await this.buildPreviousDecisions(params.projectSlug, topic));
    }
    if (wanted.includes('convencoes')) {
      sections.push(await this.buildConventions(params.projectSlug, topic, sources));
    }
    if (wanted.includes('fontes')) {
      sections.push(this.buildSources(sources));
    }

    this.trimToBudget(sections, budget);
    const totalTokens = sections.reduce((sum, section) => sum + section.tokens, 0);
    return {
      meta: {
        projectSlug: project.slug,
        topic,
        generatedAt: new Date().toISOString(),
        tokenBudget: budget,
        totalTokens,
      },
      sections,
    };
  }

  private buildRegistry(project: Project): ContextSection {
    const stack =
      (project.stack as Array<{ name: string; version: string; role: string }> | null) ?? [];
    const stackLine =
      stack.length > 0
        ? stack.map((entry) => `${entry.name}@${entry.version} (${entry.role})`).join(', ')
        : 'sem dependências declaradas';
    const content = [
      `# ${project.name} (${project.slug})`,
      '',
      project.description,
      '',
      `- Repositório: ${project.repoUrl ?? 'não declarado'}`,
      `- Tags: ${project.tags.join(', ') || '-'}`,
      `- Stack: ${stackLine}`,
      `- Última ingestão: ${project.lastIngestedAt?.toISOString() ?? 'nunca'}`,
    ].join('\n');
    return {
      id: 'visao_geral',
      title: SECTION_TITLES.visao_geral,
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildArchitecture(
    projectSlug: string,
    topic: string | null,
    sources: Map<string, SourceRef>,
  ): Promise<ContextSection> {
    const result = await this.searchService.search({
      q: this.query('arquitetura estrutura módulos', topic),
      projectSlug,
      category: 'architecture',
      limit: 6,
    });
    const content = this.renderChunks(result.hits, sources);
    return {
      id: 'arquitetura',
      title: SECTION_TITLES.arquitetura,
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildDesignSystem(
    projectSlug: string,
    topic: string | null,
    sources: Map<string, SourceRef>,
  ): Promise<ContextSection> {
    let project = projectSlug;
    let note = '';
    let result = await this.searchService.search({
      q: this.query('design system', topic),
      projectSlug,
      category: 'design-system',
      limit: 6,
    });
    if (result.hits.length === 0 && projectSlug !== 'ui-unificando') {
      // Fallback to the central brand design system (spec §12).
      project = 'ui-unificando';
      result = await this.searchService.search({
        q: this.query('design system', topic),
        projectSlug: project,
        category: 'design-system',
        limit: 6,
      });
      if (result.hits.length > 0) {
        note = `> Design System aplicado: **ui-unificando** (fallback — "${projectSlug}" não possui documentação de design system indexada).\n\n`;
      }
    }
    const content = note + this.renderChunks(result.hits, sources);
    return {
      id: 'design_system',
      title: SECTION_TITLES.design_system,
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildReusableComponents(
    projectSlug: string,
    topic: string | null,
    sources: Map<string, SourceRef>,
  ): Promise<ContextSection> {
    // Components live under design-system/architecture docs mentioning them.
    const attempts: Array<{ phrase: string; category?: string }> = [
      { phrase: 'componentes reutilizáveis componente', category: 'design-system' },
      { phrase: 'componentes reutilizáveis componente', category: 'architecture' },
      { phrase: 'componentes reutilizáveis' },
    ];
    let hits: ChunkView[] = [];
    for (const attempt of attempts) {
      const result = await this.searchService.search({
        q: this.query(attempt.phrase, topic),
        projectSlug,
        category: attempt.category,
        limit: 6,
      });
      if (result.hits.length > 0) {
        hits = result.hits;
        break;
      }
    }
    const content = this.renderChunks(hits, sources);
    return {
      id: 'componentes_reutilizaveis',
      title: SECTION_TITLES.componentes_reutilizaveis,
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildExamples(
    projectSlug: string,
    topic: string | null,
    sources: Map<string, SourceRef>,
  ): Promise<ContextSection> {
    const attempts: Array<{ phrase: string; category?: string }> = [
      { phrase: 'exemplo exemplos passo a passo' },
      { phrase: 'exemplo uso' },
    ];
    let hits: ChunkView[] = [];
    for (const attempt of attempts) {
      const result = await this.searchService.search({
        q: this.query(attempt.phrase, topic),
        projectSlug,
        category: attempt.category,
        limit: 5,
      });
      if (result.hits.length > 0) {
        hits = result.hits;
        break;
      }
    }
    const content = this.renderChunks(hits, sources);
    return {
      id: 'exemplos',
      title: SECTION_TITLES.exemplos,
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildConventions(
    projectSlug: string,
    topic: string | null,
    sources: Map<string, SourceRef>,
  ): Promise<ContextSection> {
    const result = await this.searchService.search({
      q: this.query('convenções workflow padrões gates', topic),
      projectSlug,
      category: 'workflow',
      limit: 6,
    });
    const content = this.renderChunks(result.hits, sources);
    return {
      id: 'convencoes',
      title: SECTION_TITLES.convencoes,
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildPreviousDecisions(
    projectSlug: string,
    topic: string | null,
  ): Promise<ContextSection> {
    const { data: decisions } = await this.decisionsService.list(
      projectSlug,
      undefined,
      undefined,
      1,
      8,
    );
    const accepted = decisions.filter((decision) => decision.status === 'accepted');
    const relevant = (accepted.length > 0 ? accepted : decisions).filter((decision) =>
      this.matchesTopic(decision.title, decision.summary, decision.content, topic),
    );
    const content = relevant
      .slice(0, 5)
      .map((decision) => {
        const date = decision.date.toISOString().slice(0, 10);
        return `### ${decision.title} [${decision.status}] (${date})\n\n${decision.summary}\n\n_Fonte: ${decision.projectSlug}/${decision.sourcePath ?? ''}_`;
      })
      .join('\n\n');
    return {
      id: 'decisoes_previas',
      title: SECTION_TITLES.decisoes_previas,
      content,
      tokens: estimateTokens(content),
    };
  }

  private buildSources(sources: Map<string, SourceRef>): ContextSection {
    const content = [...sources.values()]
      .map((source) => `- ${source.label} (≈ ${source.tokens} tokens)`)
      .join('\n');
    return { id: 'fontes', title: SECTION_TITLES.fontes, content, tokens: estimateTokens(content) };
  }

  private query(base: string, topic: string | null): string {
    return [base, topic].filter(Boolean).join(' ');
  }

  private matchesTopic(
    title: string,
    summary: string,
    content: string | null,
    topic: string | null,
  ): boolean {
    if (!topic) return true;
    const words = topic
      .toLowerCase()
      .split(/[^a-z0-9à-ÿ]+/)
      .filter((word) => word.length > 2);
    if (words.length === 0) return true;
    const haystack = `${title} ${summary} ${(content ?? '').slice(0, 1500)}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  }

  private renderChunks(hits: ChunkView[], sources: Map<string, SourceRef>): string {
    const parts = hits.slice(0, 6).map((hit) => {
      const location = hit.anchor ?? hit.path;
      this.rememberSource(sources, hit, location);
      const heading = hit.heading || hit.title;
      const body = hit.content.length > 300 ? `${hit.content.slice(0, 300)}…` : hit.content;
      return `#### ${heading}\n\n${body}\n\n_Fonte: ${hit.projectSlug}/${location}_`;
    });
    return parts.join('\n\n');
  }

  private rememberSource(sources: Map<string, SourceRef>, hit: ChunkView, location: string): void {
    const key = `${hit.projectSlug}/${location}`;
    if (!sources.has(key)) {
      sources.set(key, {
        key,
        label: `${hit.projectSlug}/${location}`,
        tokens: hit.tokenCount,
      });
    }
  }

  /** Trims from the least important section until the total fits the budget. */
  private trimToBudget(sections: ContextSection[], budget: number): void {
    const priorityOf = (id: string): number => SECTION_PRIORITY[id as ContextSectionId] ?? 9;
    let guard = 0;
    while (guard++ < 200) {
      const total = sections.reduce((sum, section) => sum + section.tokens, 0);
      if (total <= budget) return;
      const weakest = [...sections]
        .filter((section) => section.content.length > 0)
        .sort((a, b) => priorityOf(b.id) - priorityOf(a.id))[0];
      if (!weakest) return;
      const half = Math.max(0, Math.floor(weakest.tokens / 2));
      weakest.content = fitTextToTokens(weakest.content, Math.max(1, half));
      weakest.tokens = estimateTokens(weakest.content);
    }
  }
}
