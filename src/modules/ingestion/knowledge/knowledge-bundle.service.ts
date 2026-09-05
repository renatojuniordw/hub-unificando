import { join } from 'node:path';
import { mkdir, mkdtemp, rm, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { c as tarCreate, x as tarExtract } from 'tar';
import { ENV, type Env } from '../../../shared/config/env';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ScannerService } from '../scan/scanner.service';

export interface KnowledgeExportResult {
  projects: number;
  files: number;
  bytes: number;
  bundle: string;
}

export interface KnowledgeSyncResult {
  bundle: string | null;
  extracted: number;
  ingest: Record<string, number>;
}

/**
 * "Knowledge bundle": snapshot dos arquivos indexáveis do ecossistema em um
 * .tar.gz (estrutura `<folderPath>/<relativePath>`). Permite rodar o Hub na
 * VPS SEM depender dos repositórios irmãos (públicos/privados): o bundle é
 * gerado na máquina dev e enviado no deploy; o entrypoint desempacota e o
 * serviço `sync` re-ingere incrementalmente (docs/DEPLOYMENT.md).
 */
@Injectable()
export class KnowledgeBundleService {
  private readonly logger = new Logger(KnowledgeBundleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scanner: ScannerService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Gera o bundle a partir do conteúdo local de HUB_SCAN_ROOT. */
  async exportBundle(outFile: string, projectSlugs?: string[]): Promise<KnowledgeExportResult> {
    const projects = await this.prisma.project.findMany({
      where: { enabled: true, ...(projectSlugs && projectSlugs.length > 0 ? { slug: { in: projectSlugs } } : {}) },
      orderBy: { name: 'asc' },
    });
    if (projects.length === 0) {
      throw new Error('Nenhum projeto habilitado para exportar');
    }

    const staging = await mkdtemp(join(tmpdir(), 'hub-bundle-'));
    let files = 0;
    let bytes = 0;
    try {
      for (const project of projects) {
        const folderPath = project.folderPath.startsWith('/')
          ? project.folderPath
          : join(this.env.HUB_SCAN_ROOT, project.folderPath);
        const scanned = await this.scanner.scanFolder(folderPath);
        const destRoot = join(staging, project.folderPath.split('/').join('/'));
        for (const file of scanned) {
          const dest = join(destRoot, file.relativePath);
          await mkdir(join(dest, '..'), { recursive: true });
          await writeFile(dest, file.content, 'utf8');
          files += 1;
          bytes += file.content.length;
        }
      }
      await tarCreate({ gzip: true, file: outFile, cwd: staging }, ['.']);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
    this.logger.log(`knowledge bundle criado: ${files} arquivos, ${bytes} bytes -> ${outFile}`);
    return { projects: projects.length, files, bytes, bundle: outFile };
  }

  /** Extrai o bundle para dentro de HUB_SCAN_ROOT (estrutura folderPath). */
  async extractBundle(bundlePath: string): Promise<number> {
    await mkdir(this.env.HUB_SCAN_ROOT, { recursive: true });
    await tarExtract({ file: bundlePath, cwd: this.env.HUB_SCAN_ROOT });
    const count = await this.countExtracted();
    this.logger.log(`knowledge bundle extraído em ${this.env.HUB_SCAN_ROOT} (${count} arquivos)`);
    return count;
  }

  private async countExtracted(): Promise<number> {
    let total = 0;
    const walk = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await walk(join(dir, entry.name));
        } else if (entry.isFile()) {
          total += 1;
        }
      }
    };
    await walk(this.env.HUB_SCAN_ROOT);
    return total;
  }
}