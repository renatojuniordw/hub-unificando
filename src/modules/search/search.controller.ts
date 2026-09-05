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
    return this.searchService.search(query);
  }
}
