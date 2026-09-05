import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ListProjectDecisionsDto } from '../projects/projects.dto';
import { DecisionsService } from './decisions.service';

@ApiTags('decisions')
@Controller('projects')
export class ProjectDecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get(':slug/decisions')
  @ApiOperation({ summary: 'List ADRs/decisions of a project (filter: status)' })
  @ApiParam({ name: 'slug', description: 'Project slug' })
  list(@Param('slug') slug: string, @Query() query: ListProjectDecisionsDto) {
    return this.decisionsService.list(slug, query.status, undefined, query.page, query.pageSize);
  }
}

@ApiTags('decisions')
@Controller('decisions')
export class DecisionByIdController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a decision (ADR) by id' })
  get(@Param('id') id: string) {
    return this.decisionsService.get(id);
  }
}
