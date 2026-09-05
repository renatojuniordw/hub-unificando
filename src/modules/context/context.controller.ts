import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CompareDocumentsDto,
  ExportContextDto,
  parseContextSections,
  SummaryDto,
} from './context.dto';
import { ContextAssemblerService } from './context-assembler.service';
import { CompareService } from './compare.service';
import { SummaryService } from './summary.service';

@ApiTags('context')
@Controller()
export class ContextController {
  constructor(
    private readonly assembler: ContextAssemblerService,
    private readonly compareService: CompareService,
    private readonly summaryService: SummaryService,
  ) {}

  @Get('context/export')
  @ApiOperation({
    summary: 'LLM context package for a project (token-budgeted sections)',
  })
  exportContext(@Query() query: ExportContextDto) {
    return this.assembler.export({
      projectSlug: query.project,
      topic: query.topic,
      categories: query.categories,
      maxTokens: query.maxTokens,
      sections: parseContextSections(query.sections) ?? undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Contextual summary of a project or a document' })
  summary(@Query() query: SummaryDto) {
    if (query.target === 'document') {
      return this.summaryService.summarizeDocument({
        id: query.id,
        path: query.path,
        projectSlug: query.project,
      });
    }
    if (!query.project) {
      throw new BadRequestException('project is required when target=project');
    }
    return this.summaryService.summarize(query.project);
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Compare two documents by structure and content overlap',
  })
  compare(@Query() query: CompareDocumentsDto) {
    if (query.idA && query.idB) {
      return this.compareService.compareByIds(query.idA, query.idB);
    }
    if (!query.pathA || !query.pathB) {
      throw new BadRequestException('pathA/pathB (or idA/idB) are required');
    }
    return this.compareService.compare(query.pathA, query.pathB, query.project);
  }
}
