import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import { ERROR_CODES } from '../../common/api/response';
import { McpToolError } from './mcp.errors';
import { registerTools } from './mcp.register';
import type { McpToolDefinition } from './mcp.types';

interface TextBlock {
  type: 'text';
  text: string;
}

type ToolResult = { content: TextBlock[] };

type RegisterCall = [
  name: string,
  meta: { description: string; inputSchema: z.ZodType },
  handler: (args: unknown) => Promise<ToolResult>,
];

type RegisterArgs = [
  name: string,
  meta: { description: string; inputSchema: z.ZodType },
  handler: (args: unknown) => Promise<ToolResult>,
];

describe('registerTools', () => {
  const logger = { error: jest.fn() };
  let registerTool: jest.Mock<void, RegisterArgs>;

  beforeEach(() => {
    logger.error = jest.fn();
    registerTool = jest.fn(
      (name: string, meta: RegisterArgs[1], handler: RegisterArgs[2]): void => {
        void name;
        void meta;
        void handler;
      },
    );
  });

  function register(defs: McpToolDefinition[]): RegisterCall[] {
    const server = { registerTool };
    registerTools(server as unknown as McpServer, defs as never, logger);
    return registerTool.mock.calls;
  }

  const simpleSchema = { _def: {} } as unknown as z.ZodType;

  it('registra a tool com nome, descrição e schema', () => {
    const calls = register([
      { name: 'minha_tool', description: 'desc', inputSchema: simpleSchema, handler: jest.fn() },
    ]);
    const [name, meta, handler] = calls[0];
    expect(name).toBe('minha_tool');
    expect(meta.description).toBe('desc');
    expect(meta.inputSchema).toBe(simpleSchema);
    expect(typeof handler).toBe('function');
  });

  it('serializa sucesso do handler como ok:true', async () => {
    const calls = register([
      {
        name: 't',
        description: 'd',
        inputSchema: simpleSchema,
        handler: () => ({ chave: 'valor' }),
      },
    ]);
    const [, , handler] = calls[0];
    const result = await handler({});
    const payload = JSON.parse(result.content[0].text) as unknown as {
      ok: true;
      data: Record<string, unknown>;
    };
    expect(payload).toEqual({ ok: true, data: { chave: 'valor' } });
  });

  it('loga o erro real com o nome da tool e devolve mensagem genérica', async () => {
    const calls = register([
      {
        name: 'ferramenta_que_falha',
        description: 'd',
        inputSchema: simpleSchema,
        handler: () => {
          throw new Error('segredo interno');
        },
      },
    ]);
    const [, , handler] = calls[0];
    const result = await handler({});
    const payload = JSON.parse(result.content[0].text) as unknown as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe('MCP_ERROR');
    expect(payload.error.message).toBe('Erro interno ao executar a ferramenta');
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('ferramenta_que_falha'),
      expect.any(String),
    );
  });

  it('mantém código e mensagem de um McpToolError tipado (NOT_FOUND)', async () => {
    const calls = register([
      {
        name: 'obter_documento',
        description: 'd',
        inputSchema: simpleSchema,
        handler: () => {
          throw new McpToolError(ERROR_CODES.NOT_FOUND, 'Documento não encontrado (x/y.md)');
        },
      },
    ]);
    const [, , handler] = calls[0];
    const result = await handler({});
    const payload = JSON.parse(result.content[0].text) as unknown as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(payload.error.code).toBe('NOT_FOUND');
    expect(payload.error.message).toBe('Documento não encontrado (x/y.md)');
  });

  it('mapeia NotFoundException do Nest para NOT_FOUND (resolução por id)', async () => {
    const calls = register([
      {
        name: 'obter_documento',
        description: 'd',
        inputSchema: simpleSchema,
        handler: () => {
          throw new NotFoundException('Document "abc" not found');
        },
      },
    ]);
    const [, , handler] = calls[0];
    const result = await handler({});
    const payload = JSON.parse(result.content[0].text) as unknown as {
      ok: false;
      error: { code: string; message: string };
    };
    expect(payload.error.code).toBe('NOT_FOUND');
    expect(payload.error.message).toContain('not found');
  });
});
