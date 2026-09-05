/**
 * e2e do servidor MCP (Streamable HTTP) montado como middleware cru do
 * Express, exatamente como src/main.ts faz. Usa MCP_ENABLE_JSON_RESPONSE=true
 * para respostas JSON puras e MCP_API_KEY configurada para validar o gate.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EmbeddingProvider } from '../src/infra/embedding/embedding.provider';
import { McpHttpService } from '../src/modules/mcp/mcp-http.service';
import { MCP_PATH } from '../src/modules/mcp/mcp.constants';

process.env.REDIS_ENABLED = 'false';
process.env.MCP_ENABLE_JSON_RESPONSE = 'true';
process.env.MCP_API_KEY = 'hub-e2e-test-key';

describe('MCP server (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmbeddingProvider)
      .useValue(fakeEmbedding(768))
      .compile();

    app = moduleFixture.createNestApplication();
    const mcp = app.get(McpHttpService);
    app.use(MCP_PATH, (req, res) => mcp.handle(req, res));
    await app.init();
  });

  afterAll(async () => {
    delete process.env.MCP_API_KEY;
    delete process.env.MCP_ENABLE_JSON_RESPONSE;
    await app.close();
  });

  const auth = { Authorization: 'Bearer hub-e2e-test-key' };

  it('rejeita POST /mcp sem Bearer com 401', async () => {
    const res = await request(app.getHttpServer())
      .post(MCP_PATH)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it('handshake initialize -> tools/list -> tools/call (12 tools)', async () => {
    const initRes = await request(app.getHttpServer())
      .post(MCP_PATH)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set(auth)
      .send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'hub-e2e', version: '1.0' },
        },
      })
      .expect(200);
    expect(rpc(initRes).result?.protocolVersion).toBe('2025-06-18');
    const session = initRes.headers['mcp-session-id'];
    expect(typeof session).toBe('string');

    const toolsRes = await request(app.getHttpServer())
      .post(MCP_PATH)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set(auth)
      .set('Mcp-Session-Id', String(session))
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
      .expect(200);
    const names = rpc(toolsRes).result?.tools?.map((tool: { name: string }) => tool.name) ?? [];
    expect(names).toContain('listar_projetos');
    expect(names).toContain('exportar_contexto_llm');
    expect(names).toContain('executar_ingestao');
    expect(names).toHaveLength(12);

    const callRes = await request(app.getHttpServer())
      .post(MCP_PATH)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set(auth)
      .set('Mcp-Session-Id', String(session))
      .send({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'listar_projetos', arguments: {} },
      })
      .expect(200);
    const text = rpc(callRes).result?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text);
    expect(parsed.ok).toBe(true);
  });

  it('tool de escrita executar_ingestao sem chave retorna 401', async () => {
    const res = await request(app.getHttpServer())
      .post(MCP_PATH)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .send({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'executar_ingestao', arguments: {} },
      })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });
});

/** Extrai o último JSON-RPC (suporta JSON puro e SSE `data:` lines). */
function rpc(res: { text: string }): any {
  const text = res.text ?? '';
  if (text.includes('data: ')) {
    const events = text
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice(6)));
    return events[events.length - 1];
  }
  return JSON.parse(text);
}

function fakeEmbedding(dims: number): EmbeddingProvider {
  const embed = (texts: string[]): number[][] =>
    texts.map((text) => {
      const vector = new Array<number>(dims).fill(0);
      let seed = 0;
      for (let i = 0; i < text.length; i += 1) seed = (seed * 31 + text.charCodeAt(i)) | 0;
      for (let i = 0; i < dims; i += 1) {
        vector[i] = ((Math.abs(seed) % 1000) / 1000 + i * 0.01) / dims;
      }
      return vector;
    });
  return {
    embed: async (texts) => embed(texts),
    dims: () => dims,
    isReady: () => true,
    ensureLoaded: async () => undefined,
  };
}
