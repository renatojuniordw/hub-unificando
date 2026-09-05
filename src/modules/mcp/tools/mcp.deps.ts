import type { Env } from '../../../shared/config/env';
import type { PrismaService } from '../../../infra/prisma/prisma.service';
import type { ProjectsService } from '../../projects/projects.service';
import type { DocumentsService } from '../../documents/documents.service';
import type { CategoriesService } from '../../categories/categories.service';
import type { DecisionsService } from '../../decisions/decisions.service';
import type { SearchService } from '../../search/search.service';
import type { ContextAssemblerService } from '../../context/context-assembler.service';
import type { CompareService } from '../../context/compare.service';
import type { SummaryService } from '../../context/summary.service';
import type { IngestionQueue } from '../../ingestion/queue/ingestion.queue';
import type { IngestionWriteRepository } from '../../ingestion/repository/ingestion-write.repository';

/**
 * Injeções disponíveis para as handlers MCP. As tools são declarativas e
 * recebem `McpDeps` na factory — o núcleo do protocolo não conhece services
 * do domínio (DIP).
 */
export interface McpDeps {
  prisma: PrismaService;
  projects: ProjectsService;
  documents: DocumentsService;
  categories: CategoriesService;
  decisions: DecisionsService;
  search: SearchService;
  context: ContextAssemblerService;
  compare: CompareService;
  summary: SummaryService;
  queue: IngestionQueue;
  writeRepo: IngestionWriteRepository;
  env: Env;
}
