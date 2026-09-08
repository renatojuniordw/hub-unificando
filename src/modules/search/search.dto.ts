import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export type SearchStrategy = 'balanced' | 'recall' | 'precision';

export class SearchQueryDto {
  @ApiProperty({ description: 'Free-text query (Portuguese/English)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  q!: string;

  @ApiPropertyOptional({ description: 'Restrict results to a project slug' })
  @IsOptional()
  @IsString()
  project?: string;

  @ApiPropertyOptional({ description: 'Restrict to a category slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Restrict to a document type' })
  @IsOptional()
  @IsString()
  docType?: string;

  @ApiPropertyOptional({ description: 'Restrict to a content kind (e.g. blog-post)' })
  @IsOptional()
  @IsString()
  contentKind?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ default: 'balanced', enum: ['balanced', 'recall', 'precision'] })
  @IsOptional()
  @IsIn(['balanced', 'recall', 'precision'])
  strategy: SearchStrategy = 'balanced';
}
