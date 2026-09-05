import { Inject, Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ENV, type Env } from '../../shared/config/env';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { DocumentsService } from '../documents/documents.service';
import { CategoriesService } from '../categories/categories.service';
import { DecisionsService } from '../decisions/decisions.service';
import { SearchService } from '../search/search.service';
import { ContextAssemblerService } from '../context/context-assembler.service';
import { CompareService } from '../context/compare.service';
import { SummaryService } from '../context/summary.service';
import { IngestionQueue } from '../ingestion/queue/ingestion.queue';
import { IngestionWriteRepository } from '../ingestion/repository/ingestion-write.repository';
import { registerTools } from './mcp.register';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './mcp.constants';
import { createToolDefinitions } from './tools/tools.index';
import type { McpDeps } from './tools/mcp.deps';

/**
 * Fábrica do servidor MCP ligada ao DI do Nest. Um `McpServer` só conecta a
 * UM transport por vez — por isso o factory cria uma instância nova por
 * sessão. As tools recebem os services do domínio via `McpDeps`.
 */
@Injectable()
export class McpServerFactory {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly documents: DocumentsService,
    private readonly categories: CategoriesService,
    private readonly decisions: DecisionsService,
    private readonly search: SearchService,
    private readonly context: ContextAssemblerService,
    private readonly compare: CompareService,
    private readonly summary: SummaryService,
    private readonly queue: IngestionQueue,
    private readonly writeRepo: IngestionWriteRepository,
    @Inject(ENV) private readonly env: Env,
  ) {}

  create(): McpServer {
    const deps: McpDeps = {
      prisma: this.prisma,
      projects: this.projects,
      documents: this.documents,
      categories: this.categories,
      decisions: this.decisions,
      search: this.search,
      context: this.context,
      compare: this.compare,
      summary: this.summary,
      queue: this.queue,
      writeRepo: this.writeRepo,
      env: this.env,
    };
    const server = new McpServer({
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    });
    registerTools(server, createToolDefinitions(deps));
    return server;
  }
}
