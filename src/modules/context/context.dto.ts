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

const CONTEXT_SECTIONS = [
  'visao_geral',
  'arquitetura',
  'design_system',
  'componentes_reutilizaveis',
  'exemplos',
  'decisoes_previas',
  'convencoes',
  'fontes',
] as const;

export type ContextSectionId = (typeof CONTEXT_SECTIONS)[number];

export class ExportContextDto {
  @ApiProperty({ description: 'Project slug (required)' })
  @IsString()
  @IsNotEmpty()
  project!: string;

  @ApiPropertyOptional({ description: 'Focused topic/feature (e.g. "notificações")' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  topic?: string;

  @ApiPropertyOptional({ default: 6000, minimum: 500, maximum: 20000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(500)
  @Max(20000)
  maxTokens = 6000;

  @ApiPropertyOptional({
    description: 'Comma-separated section ids to include (all by default)',
    example: 'arquitetura,design_system,fontes',
  })
  @IsOptional()
  @IsString()
  sections?: string;
}

export class CompareDocumentsDto {
  @ApiPropertyOptional({ description: 'Path of document A (ex: docs/ARCHITECTURE.md)' })
  @IsOptional()
  @IsString()
  pathA?: string;

  @ApiPropertyOptional({ description: 'Path of document B' })
  @IsOptional()
  @IsString()
  pathB?: string;

  @ApiPropertyOptional({ description: 'Document A id (alternative to pathA)' })
  @IsOptional()
  @IsString()
  idA?: string;

  @ApiPropertyOptional({ description: 'Document B id (alternative to pathB)' })
  @IsOptional()
  @IsString()
  idB?: string;

  @ApiPropertyOptional({ description: 'Project scope (optional; disambiguates paths)' })
  @IsOptional()
  @IsString()
  project?: string;
}

export class SummaryDto {
  @ApiPropertyOptional({
    default: 'project',
    enum: ['project', 'document'],
    description: 'Summarize a whole project or a single document',
  })
  @IsOptional()
  @IsIn(['project', 'document'])
  target: 'project' | 'document' = 'project';

  @ApiPropertyOptional({ description: 'Project slug (required when target=project)' })
  @IsOptional()
  @IsString()
  project?: string;

  @ApiPropertyOptional({ description: 'Document id (target=document)' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Document path (target=document, needs project)' })
  @IsOptional()
  @IsString()
  path?: string;
}

/** Resolves REST section filters into a typed list (kept in sync with tools). */
export function parseContextSections(sections?: string): ContextSectionId[] | null {
  if (!sections) return null;
  const wanted = sections
    .split(',')
    .map((section) => section.trim())
    .filter(Boolean) as ContextSectionId[];
  return wanted.filter((section) => CONTEXT_SECTIONS.includes(section));
}
