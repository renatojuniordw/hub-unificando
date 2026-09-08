import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServerFactory } from './mcp-server.factory';
import { ENV } from '../../shared/config/env';
import { Inject } from '@nestjs/common';
import type { Env } from '../../shared/config/env';
import { MAX_SESSIONS, SESSION_SWEEP_INTERVAL_MS } from './mcp.constants';

interface McpSession {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  expiresAt: number;
}

/**
 * Gerenciador de sessões MCP em memória (1 transport + 1 McpServer por
 * sessão, mesmo padrão do med). TTL sliding (default 60 min) + sweep.
 */
@Injectable()
export class McpSessionManager {
  private readonly logger = new Logger(McpSessionManager.name);
  private readonly sessions = new Map<string, McpSession>();
  private lastSweepAt = 0;

  constructor(
    private readonly serverFactory: McpServerFactory,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private get sessionTtlMs(): number {
    return this.env.MCP_SESSION_TTL_MIN * 60_000;
  }

  async create(): Promise<StreamableHTTPServerTransport> {
    this.sweep(Date.now());
    const server = this.serverFactory.create();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: this.env.MCP_ENABLE_JSON_RESPONSE,
      onsessioninitialized: (sessionId: string) => {
        this.sessions.set(sessionId, {
          transport,
          server,
          expiresAt: Date.now() + this.sessionTtlMs,
        });
      },
      onsessionclosed: (sessionId: string) => {
        this.remove(sessionId);
      },
    });
    await server.connect(transport);
    return transport;
  }

  get(sessionId: string): StreamableHTTPServerTransport | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.remove(sessionId);
      return null;
    }
    session.expiresAt = Date.now() + this.sessionTtlMs;
    return session.transport;
  }

  delete(sessionId: string): void {
    this.remove(sessionId);
  }

  size(): number {
    return this.sessions.size;
  }

  /** Visão agregada para o health endpoint (sem detalhes de sessão). */
  status(): { sessions: number; maxSessions: number } {
    return { sessions: this.sessions.size, maxSessions: MAX_SESSIONS };
  }

  private remove(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    void this.closeSession(session).catch(() => undefined);
  }

  private async closeSession(session: McpSession): Promise<void> {
    const message = (error: unknown): string =>
      error instanceof Error ? error.message : String(error);
    try {
      await session.transport.close();
    } catch (error) {
      this.logger.warn(`[mcp] erro ao fechar transporte da sessão: ${message(error)}`);
    }
    try {
      await session.server.close();
    } catch (error) {
      this.logger.warn(`[mcp] erro ao fechar server da sessão: ${message(error)}`);
    }
  }

  private sweep(now: number): void {
    const shouldSweep =
      now - this.lastSweepAt >= SESSION_SWEEP_INTERVAL_MS || this.sessions.size > MAX_SESSIONS;
    if (!shouldSweep) return;
    this.lastSweepAt = now;

    if (this.sessions.size > MAX_SESSIONS) {
      for (const key of this.sessions.keys()) {
        if (this.sessions.size <= MAX_SESSIONS - 1) break;
        this.remove(key);
      }
      return;
    }
    for (const [key, session] of this.sessions) {
      if (session.expiresAt <= now) this.remove(key);
    }
  }
}
