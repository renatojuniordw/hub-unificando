import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchQueryDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Hybrid search (vector + keyword + fuzzy) with RRF fusion',
  })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search({
      q: query.q,
      projectSlug: query.project,
      category: query.category,
      docType: query.docType,
      contentKind: query.contentKind,
      limit: query.pageSize,
      skip: (query.page - 1) * query.pageSize,
      strategy: query.strategy,
    });
  }
}
