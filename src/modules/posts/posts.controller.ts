import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ListPostsDto, PostSlugParamsDto } from './posts.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({
    summary: 'Published blog posts (contentKind=blog-post), newest first',
  })
  list(@Query() query: ListPostsDto) {
    return this.postsService.list({
      tag: query.tag,
      project: query.project,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Blog post detail (raw markdown + metadata) by slug',
  })
  @ApiParam({ name: 'slug', description: 'Post slug (file basename without .md)' })
  detail(@Param() params: PostSlugParamsDto) {
    return this.postsService.detail(params.slug);
  }
}
