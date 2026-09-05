import { Injectable, NotFoundException } from '@nestjs/common';
import type { Project } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { DecisionsService } from '../decisions/decisions.service';
import { SearchService } from '../search/search.service';
import { estimateTokens, fitTextToTokens } from './token';

export interface ContextSection {
  id: string;
  title: string;
  sourcePath?: string;
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
}

/**
 * Builds optimized LLM context packages: the project registry entry, top
 * matching documents (topic-aware), ADRs and focused search hits, all trimmed
 * to a strict token budget (docs/CONTEXT.md).
 */
@Injectable()
export class ContextAssemblerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
    private readonly decisionsService: DecisionsService,
    private readonly searchService: SearchService,
  ) {}

  async export(params: ExportContextParams): Promise<LLMContextPackage> {
    const project = await this.prisma.project.findUnique({
      where: { slug: params.projectSlug },
    });
    if (!project) {
      throw new NotFoundException(`Project "${params.projectSlug}" not found`);
    }

    const budget = Math.max(500, params.maxTokens);
    const sections: ContextSection[] = [];

    sections.push(this.buildRegistry(project, Math.floor(budget * 0.1)));

    const documentsRatio = params.topic ? 0.6 : 0.75;
    sections.push(await this.buildDocuments(params, Math.floor(budget * documentsRatio)));
    sections.push(await this.buildDecisions(params.projectSlug, Math.floor(budget * 0.15)));
    if (params.topic) {
      sections.push(await this.buildSearch(params, Math.floor(budget * 0.15)));
    }

    const totalTokens = sections.reduce((sum, section) => sum + section.tokens, 0);
    return {
      meta: {
        projectSlug: params.projectSlug,
        topic: params.topic ?? null,
        generatedAt: new Date().toISOString(),
        tokenBudget: budget,
        totalTokens,
      },
      sections,
    };
  }

  private buildRegistry(project: Project, budget: number): ContextSection {
    const stack =
      (project.stack as Array<{ name: string; version: string; role: string }> | null) ?? [];
    const stackLine =
      stack.length > 0
        ? stack.map((entry) => `${entry.name}@${entry.version} (${entry.role})`).join(', ')
        : 'sem dependências declaradas';
    const lines = [
      `# ${project.name} (${project.slug})`,
      '',
      project.description,
      '',
      `- Repositório: ${project.repoUrl ?? 'não declarado'}`,
      `- Tags: ${project.tags.join(', ') || '-'}`,
      `- Stack: ${stackLine}`,
      `- Última ingestão: ${project.lastIngestedAt?.toISOString() ?? 'nunca'}`,
    ];
    const content = fitTextToTokens(lines.join('\n'), budget);
    return {
      id: 'registry',
      title: 'Visão Geral do Projeto',
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildDocuments(
    params: ExportContextParams,
    budget: number,
  ): Promise<ContextSection> {
    let docs = await this.documentsService.listByProject(params.projectSlug);

    // Topic-aware ordering: rank by hybrid search when a topic is provided.
    if (params.topic) {
      const result = await this.searchService.search({
        q: params.topic,
        projectSlug: params.projectSlug,
        category: params.categories?.[0],
        limit: 20,
        strategy: 'balanced',
      });
      const ranked = new Map(result.hits.map((hit) => [hit.documentId, hit]));
      docs = docs.sort((a, b) => {
        const ra = ranked.get(a.id);
        const rb = ranked.get(b.id);
        const scoreA = ra ? 1 - 1 / (1 + ra.score) : 0;
        const scoreB = rb ? 1 - 1 / (1 + rb.score) : 0;
        return scoreB - scoreA;
      });
    } else if (params.categories && params.categories.length > 0) {
      docs = docs.filter((doc) => doc.categories.some((c) => params.categories!.includes(c)));
    }

    const parts: string[] = [];
    let used = 0;
    for (const doc of docs.slice(0, 12)) {
      const header = `## ${doc.title} (${doc.path})`;
      const text = `${header}\n\n${doc.summary ?? ''}`;
      const budgetLeft = budget - used;
      if (budgetLeft <= 64) break;
      const fitted = fitTextToTokens(
        text + (doc.contentKind ? ` — ${doc.contentKind}` : ''),
        Math.max(64, budgetLeft),
      );
      used += estimateTokens(fitted);
      parts.push(fitted);
    }
    const content = parts.join('\n\n');
    return {
      id: 'documents',
      title: 'Documentação Relevante',
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildDecisions(projectSlug: string, budget: number): Promise<ContextSection> {
    const { data: decisions } = await this.decisionsService.list(
      projectSlug,
      undefined,
      undefined,
      1,
      8,
    );
    const parts = decisions.map((decision) => {
      const date = decision.date.toISOString().slice(0, 10);
      return `## ${decision.title} [${decision.status}] (${date})\n\n${decision.summary}`;
    });
    const raw = parts.join('\n\n');
    if (!raw) return { id: 'decisions', title: 'Decisões (ADRs)', content: '', tokens: 0 };
    const content = fitTextToTokens(raw, budget);
    return {
      id: 'decisions',
      title: 'Decisões (ADRs)',
      content,
      tokens: estimateTokens(content),
    };
  }

  private async buildSearch(params: ExportContextParams, budget: number): Promise<ContextSection> {
    if (!params.topic) {
      return { id: 'search', title: 'Busca no Tópico', content: '', tokens: 0 };
    }
    const result = await this.searchService.search({
      q: params.topic,
      projectSlug: params.projectSlug,
      category: params.categories?.[0],
      limit: 5,
      strategy: 'balanced',
    });
    const parts = result.hits.map((hit) => {
      const location = [hit.projectSlug, hit.path, hit.heading ?? ''].filter(Boolean).join(' · ');
      return `## ${hit.title}\n\n<source>${location}</source>\n\n${hit.content.slice(0, 400)}`;
    });
    const raw = `Consulta foco: "${params.topic}"\n\n${parts.join('\n\n')}`;
    const content = fitTextToTokens(raw, budget);
    return {
      id: 'search',
      title: 'Resultados de Busca do Tópico',
      content,
      tokens: estimateTokens(content),
    };
  }
}
