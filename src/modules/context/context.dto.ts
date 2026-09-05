import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ExportContextDto {
  @ApiProperty({ description: 'Project slug' })
  @IsString()
  @IsNotEmpty()
  projectSlug!: string;

  @ApiPropertyOptional({ description: 'Focused topic (uses hybrid search)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  topic?: string;

  @ApiPropertyOptional({ description: 'Optional category filters', type: [String] })
  @IsOptional()
  @Type(() => String)
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ default: 6000, minimum: 500, maximum: 20000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(20000)
  maxTokens = 6000;
}

export class CompareDocumentsDto {
  @ApiProperty({ description: 'Path of document A (ex: docs/ARCHITECTURE.md)' })
  @IsString()
  @IsNotEmpty()
  a!: string;

  @ApiProperty({ description: 'Path of document B' })
  @IsString()
  @IsNotEmpty()
  b!: string;

  @ApiPropertyOptional({ description: 'Project scope (searches all projects when omitted)' })
  @IsOptional()
  @IsString()
  projectSlug?: string;
}

export class SummaryDto {
  @ApiProperty({ description: 'Project slug' })
  @IsString()
  @IsNotEmpty()
  projectSlug!: string;
}
