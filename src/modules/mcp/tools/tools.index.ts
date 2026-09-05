import type { McpToolDefinition } from '../mcp.types';
import type { McpDeps } from './mcp.deps';
import { listarProjetos } from './listar-projetos';
import { detalheProjeto } from './detalhe-projeto';
import { listarDocumentos } from './listar-documentos';
import { obterDocumento } from './obter-documento';
import { buscarTrechos } from './buscar-trechos';
import { resumoDocumento } from './resumo-documento';
import { resumoProjeto } from './resumo-projeto';
import { compararDocumentos } from './comparar-documentos';
import { exportarContextoLlm } from './exportar-contexto-llm';
import { listarCategorias } from './listar-categorias';
import { consultarDecisao } from './consultar-decisao';
import { executarIngestao } from './executar-ingestao';

/**
 * Composition root das tools MCP (12). Nova tool = arquivo novo + entrada
 * aqui; o núcleo do protocolo não muda (OCP). Cada factory liga a tool aos
 * services do domínio via `McpDeps`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- array heterogêneo (fronteira de protocolo)
export function createToolDefinitions(deps: McpDeps): McpToolDefinition<any>[] {
  return [
    listarProjetos(deps),
    detalheProjeto(deps),
    listarDocumentos(deps),
    obterDocumento(deps),
    buscarTrechos(deps),
    resumoDocumento(deps),
    resumoProjeto(deps),
    compararDocumentos(deps),
    exportarContextoLlm(deps),
    listarCategorias(deps),
    consultarDecisao(deps),
    executarIngestao(deps),
  ];
}
