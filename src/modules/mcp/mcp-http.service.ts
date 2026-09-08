import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ENV, type Env } from '../../shared/config/env';
import {
  MCP_ALLOWED_HEADERS,
  MCP_ALLOWED_METHODS,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
} from './mcp.constants';
import { McpServerFactory } from './mcp-server.factory';
import { McpSessionManager } from './mcp.session-manager';
import { applyCors, checkMcpSecurity } from './mcp.security';

/**
 * Adaptador HTTP do MCP (Streamable HTTP, spec 2025-06-18) montado como
 * middleware puro do Express (fora dos pipes/filtros globais do Nest).
 * Lida com GET (SSE por sessão), POST (JSON-RPC), DELETE (encerra sessão) e
 * OPTIONS (preflight CORS). Segurança validada antes do transporte.
 */
@Injectable()
export class McpHttpService {
  private readonly logger = new Logger(McpHttpService.name);
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly serverFactory: McpServerFactory,
    private readonly sessions: McpSessionManager,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const origin = req.headers.origin ?? null;
    applyCors(res, origin, this.env);
    // Anuncia a versão da spec em toda resposta (o SDK não emite o header).
    this.announceProtocolVersion(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Methods': MCP_ALLOWED_METHODS,
        'Access-Control-Allow-Headers': MCP_ALLOWED_HEADERS,
        'Access-Control-Max-Age': '86400',
      });
      res.end();
      return;
    }

    const guard = checkMcpSecurity(req, this.env, this.buckets);
    if (!guard.ok) {
      this.sendJson(res, guard.status, guard.body);
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      if (req.method === 'DELETE') {
        if (sessionId) {
          this.sessions.delete(sessionId);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      let transport;
      if (sessionId) {
        transport = this.sessions.get(sessionId);
        if (!transport) {
          this.sendJson(res, 404, { error: 'Sessão não encontrada. Inicialize uma nova sessão.' });
          return;
        }
      } else if (req.method === 'GET') {
        // Health/visão do servidor sem sessão: metadados + estado agregado.
        this.sendJson(res, 200, {
          ok: true,
          data: {
            name: MCP_SERVER_NAME,
            version: MCP_SERVER_VERSION,
            protocolVersion: MCP_PROTOCOL_VERSION,
            tools: this.serverFactory.toolNames(),
            sessions: this.sessions.status(),
          },
        });
        return;
      } else {
        transport = await this.sessions.create();
      }

      // GET sem session é usado para stream SSE standalone; aqui só existe
      // sessão iniciada por POST (mesmo fluxo do med).
      await transport.handleRequest(req, res, (req as { body?: unknown }).body);
    } catch (error) {
      // O SDK responde por conta própria erros de protocolo (ex.: JSON
      // malformado → 400 -32700). Quando `writableEnded` já é true, a resposta
      // foi enviada — não sobrescrever nem logar como falha interna.
      if (!res.writableEnded) {
        this.logger.error(
          `[mcp] erro no transporte: ${error instanceof Error ? error.message : 'error'}`,
        );
        this.sendJson(res, 500, { error: 'Erro interno do servidor MCP' });
      }
    }
  }

  private sendJson(res: ServerResponse, status: number, body: unknown): void {
    if (res.writableEnded) return;
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    });
    res.end(payload);
  }

  /**
   * Garante o header `mcp-protocol-version` em toda resposta do /mcp (o SDK
   * não emite). `mcp-session-id` já é exposto pelo CORS; aqui apenas somamos
   * o protocolo ao Expose-Headers sem apagar o valor que o applyCors definiu.
   */
  private announceProtocolVersion(res: ServerResponse): void {
    res.setHeader('mcp-protocol-version', MCP_PROTOCOL_VERSION);
    const exposed = res.getHeader('Access-Control-Expose-Headers');
    if (typeof exposed === 'string' && !exposed.includes('mcp-protocol-version')) {
      res.setHeader('Access-Control-Expose-Headers', `${exposed}, mcp-protocol-version`);
    } else if (exposed === undefined) {
      res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');
    }
  }
}
