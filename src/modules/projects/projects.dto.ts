import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListProjectsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search in name, description, slug and tags' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'Display surface: unificando | portfolio | internal (docs/CONTENT.md)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  surface?: string;

  @ApiPropertyOptional({ description: 'Only featured projects (home highlights)' })
  @IsOptional()
  @IsString()
  featured?: string;
}

export class ProjectParamsDto {
  @IsString()
  slug!: string;
}

export class ListProjectDocumentsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Category slug (multi-label contains)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Document type (markdown, txt, ...)' })
  @IsOptional()
  @IsString()
  docType?: string;

  @ApiPropertyOptional({ description: 'Free text search over title/summary' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

export class ListProjectDecisionsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Decision status (accepted | superseded | proposed)' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class GetDocumentByPathDto {
  @ApiProperty({ description: 'Path relative to the project folder (ex: docs/ARCHITECTURE.md)' })
  @IsString()
  @MaxLength(500)
  path!: string;
}
