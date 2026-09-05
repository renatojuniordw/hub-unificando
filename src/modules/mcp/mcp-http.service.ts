import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ENV, type Env } from '../../shared/config/env';
import { MCP_ALLOWED_HEADERS, MCP_ALLOWED_METHODS } from './mcp.constants';
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
    private readonly sessions: McpSessionManager,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const origin = req.headers.origin ?? null;
    applyCors(res, origin, this.env);

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
        this.sendJson(res, 404, { error: 'Sessão não encontrada. Inicialize uma nova sessão.' });
        return;
      } else {
        transport = await this.sessions.create();
      }

      // GET sem session é usado para stream SSE standalone; aqui só existe
      // sessão iniciada por POST (mesmo fluxo do med).
      await transport.handleRequest(req, res, (req as { body?: unknown }).body);
    } catch (error) {
      this.logger.error(
        `[mcp] erro no transporte: ${error instanceof Error ? error.message : 'error'}`,
      );
      if (!res.writableEnded) {
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
}
