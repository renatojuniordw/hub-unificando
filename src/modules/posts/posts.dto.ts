import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListPostsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter posts by tag (frontmatter tag)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  tag?: string;

  @ApiPropertyOptional({ description: 'Restrict to a project slug (default any with blog-post)' })
  @IsOptional()
  @IsString()
  project?: string;
}

export class PostSlugParamsDto {
  @IsString()
  slug!: string;
}
