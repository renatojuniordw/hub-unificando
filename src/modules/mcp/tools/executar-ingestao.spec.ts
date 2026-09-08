import type { z } from 'zod';
import type { McpDeps } from './mcp.deps';
import type { McpToolDefinition } from '../mcp.types';
import { executarIngestao } from './executar-ingestao';

/** Deps mínimas — só o necessário para o caminho feliz da tool. */
function makeDeps(overrides?: Partial<McpDeps>): McpDeps {
  const base = {
    env: { MCP_API_KEY: 'test-key' },
    // Arrow functions: evitam unbound-method do eslint e o handler sempre
    // recebe uma jest.fn chamável isolada.
    queue: { isEnabled: (): boolean => true, enqueue: jest.fn() },
    writeRepo: { createJob: jest.fn() },
  } as unknown as McpDeps;
  const deps = { ...base, ...overrides };
  (deps.queue.enqueue as jest.Mock).mockResolvedValue({ queueId: 'q1' });
  (deps.writeRepo.createJob as jest.Mock).mockResolvedValue({ id: 'job-1' });
  return deps;
}

/** Invoca o handler da tool como função pura (não via member-access). */
function callHandler(tool: McpToolDefinition<z.ZodType>, args: unknown): Promise<unknown> {
  const handler = tool.handler as (a: unknown) => Promise<unknown>;
  return handler(args);
}

// `createJob`/`enqueue` são métodos da interface McpDeps (não `this: void`);
// nas specs a dep inteira é um mock e o member-access é o uso pretendido.
// eslint-disable-next-line @typescript-eslint/unbound-method
const createJob = (deps: McpDeps) => deps.writeRepo.createJob as jest.Mock;
// eslint-disable-next-line @typescript-eslint/unbound-method
const enqueue = (deps: McpDeps) => deps.queue.enqueue as jest.Mock;

describe('executarIngestao — contrato público (schema/handler/docs coerentes)', () => {
  it('aceita force=true no schema e repassa ao job', async () => {
    const deps = makeDeps();
    const tool = executarIngestao(deps);
    // O schema exposto valida (parse) o argumento documentado nas docs.
    const parsed = tool.inputSchema.parse({ project: 'med-unificando', force: true });

    const result = (await callHandler(tool, parsed)) as Record<string, unknown>;
    expect(createJob(deps)).toHaveBeenCalledWith('ingest', {
      projectSlug: 'med-unificando',
      force: true,
    });
    expect(enqueue(deps)).toHaveBeenCalledWith(
      { projectSlug: 'med-unificando' },
      { force: true, dryRun: false },
      'job-1',
    );
    expect(result).toMatchObject({ jobId: 'job-1', queueId: 'q1', status: 'queued' });
  });

  it('força reindexação com o campo documentado force (não reset)', async () => {
    const deps = makeDeps();
    const tool = executarIngestao(deps);

    await callHandler(tool, { project: undefined, force: true });
    expect(createJob(deps)).toHaveBeenCalledWith('ingest', {
      projectSlug: null,
      force: true,
    });
  });

  it('sem force, enfileira sem forçar (force=false)', async () => {
    const deps = makeDeps();
    const tool = executarIngestao(deps);

    await callHandler(tool, { project: undefined, force: false });
    expect(createJob(deps)).toHaveBeenCalledWith('ingest', {
      projectSlug: null,
      force: false,
    });
  });
});
