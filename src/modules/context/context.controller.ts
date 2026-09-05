import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompareDocumentsDto, ExportContextDto, SummaryDto } from './context.dto';
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
      projectSlug: query.projectSlug,
      topic: query.topic,
      categories: query.categories,
      maxTokens: query.maxTokens,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Factual project summary (counts, categories, activity)' })
  summary(@Query() query: SummaryDto) {
    return this.summaryService.summarize(query.projectSlug);
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Compare two documents by structure and content overlap',
  })
  compare(@Query() query: CompareDocumentsDto) {
    return this.compareService.compare(query.a, query.b, query.projectSlug);
  }
}
