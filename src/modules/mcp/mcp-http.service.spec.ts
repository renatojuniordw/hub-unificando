import type { IncomingMessage, ServerResponse } from 'node:http';
import { MCP_PROTOCOL_VERSION, MCP_SERVER_NAME, MCP_SERVER_VERSION } from './mcp.constants';
import { McpHttpService } from './mcp-http.service';

const env = {
  MCP_API_KEY: '',
  MCP_ALLOWED_ORIGINS: '',
  MCP_SESSION_TTL_MIN: 60,
  MCP_RATE_LIMIT: 120,
} as never;

function makeService(overrides?: {
  tools?: string[];
  sessions?: { sessions: number; maxSessions: number };
  transport?: { handleRequest: jest.Mock };
  create?: jest.Mock;
}) {
  const serverFactory = {
    toolNames: jest.fn().mockReturnValue(overrides?.tools ?? ['listar_projetos']),
  };
  const sessionManager = {
    status: jest.fn().mockReturnValue(overrides?.sessions ?? { sessions: 0, maxSessions: 16 }),
    create: (overrides?.create ?? jest.fn()).mockResolvedValue(overrides?.transport),
    get: jest.fn(),
    delete: jest.fn(),
  };
  return {
    service: new McpHttpService(serverFactory as never, sessionManager as never, env),
    serverFactory,
    sessionManager,
  };
}

interface ResStub {
  writableEnded: boolean;
  statusCode: number;
  body?: string;
  headers: Map<string, string>;
  setHeader(name: string, value: string): void;
  writeHead(status: number, extra?: Record<string, string>): ResStub;
  end(payload?: string): ResStub;
  getHeader(name: string): string | string[] | number | undefined;
}

/** Stub mínimo de ServerResponse (writeHead/setHeader/end). */
function makeRes(): ResStub {
  const headers = new Map<string, string>();
  const res: ResStub = {
    writableEnded: false,
    statusCode: 200,
    headers,
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    }),
    writeHead: jest.fn(function (status: number, extra?: Record<string, string>) {
      res.statusCode = status;
      if (extra) {
        for (const [k, v] of Object.entries(extra)) headers.set(k.toLowerCase(), String(v));
      }
      return res;
    }),
    end: jest.fn(function (payload?: string) {
      res.body = payload;
      res.writableEnded = true;
      return res;
    }),
    getHeader: jest.fn((name: string) => headers.get(name.toLowerCase())),
  };
  return res;
}

function makeReq(method: string, extra?: Record<string, string | undefined>) {
  return {
    method,
    headers: {
      origin: undefined,
      'mcp-session-id': undefined,
      'x-forwarded-for': undefined,
      ...extra,
    },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as IncomingMessage;
}

async function handle(service: McpHttpService, req: IncomingMessage, res: ResStub): Promise<void> {
  await service.handle(req, res as unknown as ServerResponse);
}

describe('McpHttpService', () => {
  describe('GET /mcp sem sessão (health)', () => {
    it('responde 200 com metadados, tools e estado de sessões', async () => {
      const { service } = makeService({
        tools: ['listar_projetos', 'consultar_decisao'],
        sessions: { sessions: 2, maxSessions: 16 },
      });
      const req = makeReq('GET');
      const res = makeRes();

      await handle(service, req, res);

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body ?? '{}') as unknown as {
        data: {
          name: string;
          version: string;
          protocolVersion: string;
          tools: string[];
          sessions: { sessions: number; maxSessions: number };
        };
      };
      expect(body.data).toMatchObject({
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
        protocolVersion: MCP_PROTOCOL_VERSION,
        tools: ['listar_projetos', 'consultar_decisao'],
        sessions: { sessions: 2, maxSessions: 16 },
      });
    });

    it('anuncia mcp-protocol-version em toda resposta', async () => {
      const { service } = makeService();
      const req = makeReq('GET');
      const res = makeRes();

      await handle(service, req, res);

      expect(res.getHeader('mcp-protocol-version')).toBe(MCP_PROTOCOL_VERSION);
    });
  });

  describe('POST /mcp com sessão inválida', () => {
    it('responde 404 quando o mcp-session-id não existe', async () => {
      const { service, sessionManager } = makeService();
      sessionManager.get.mockReturnValue(null);
      const req = makeReq('POST', { 'mcp-session-id': 'sessao-inexistente' });
      const res = makeRes();

      await handle(service, req, res);

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body ?? '{}') as unknown as { error?: string };
      expect(body.error).toBeDefined();
    });

    it('aceita mcp-session-id repetido (array de headers) sem quebrar a sessão', async () => {
      const { service, sessionManager } = makeService();
      const transport = { handleRequest: jest.fn().mockResolvedValue(undefined) };
      sessionManager.get.mockReturnValue(transport);
      const req = makeReq('POST', {
        // Node repete headers duplicados como array.
        'mcp-session-id': ['sessao-ativa', 'sessao-ativa'] as unknown as string,
      });
      const res = makeRes();

      await handle(service, req, res);

      // A sessão foi encontrada (transport usado) — não virou 404.
      expect(transport.handleRequest).toHaveBeenCalled();
      expect(res.statusCode).not.toBe(404);
    });
  });
});
