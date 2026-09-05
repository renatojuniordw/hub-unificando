import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ListProjectDocumentsDto } from '../projects/projects.dto';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('projects')
export class ProjectDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':slug/documents')
  @ApiOperation({ summary: 'List documents of a project (filters: category, docType, q)' })
  @ApiParam({ name: 'slug', description: 'Project slug' })
  list(@Param('slug') slug: string, @Query() query: ListProjectDocumentsDto) {
    return this.documentsService.list({
      projectSlug: slug,
      category: query.category,
      docType: query.docType,
      q: query.q,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}

@ApiTags('documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by id (summary, categories, source)' })
  get(@Param('id') id: string) {
    return this.documentsService.get(id);
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: 'List chunks of a document (paginated)' })
  chunks(@Param('id') id: string, query: { page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
    return this.documentsService.chunks(id, page, pageSize);
  }
}
