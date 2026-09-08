import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ListProjectsDto, ProjectParamsDto } from './projects.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({
    summary: 'Project registry (slug, name, description, repo, stack, tags, counts)',
  })
  list(@Query() query: ListProjectsDto) {
    return this.projectsService.list(
      query.search,
      query.surface,
      query.featured === 'true',
      query.page,
      query.pageSize,
    );
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Project detail with its documents and aggregated counts' })
  @ApiParam({ name: 'slug', description: 'Project slug' })
  detail(@Param() params: ProjectParamsDto) {
    return this.projectsService.detail(params.slug);
  }
}
