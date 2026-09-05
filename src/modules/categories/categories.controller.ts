import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List the content taxonomy with document counts' })
  list() {
    return this.categoriesService.list();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a single category (keywords, metadata)' })
  get(@Param('slug') slug: string) {
    return this.categoriesService.get(slug);
  }
}
