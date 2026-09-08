import { jsonResult, toolError } from './result.utils';

interface TextBlock {
  type: 'text';
  text: string;
}

interface PayloadOk {
  ok: true;
  data: Record<string, unknown>;
}

interface PayloadError {
  ok: false;
  error: { code: string; message: string };
}

function textOf(result: { content: TextBlock[] }): string {
  return result.content[0].text;
}

describe('result.utils', () => {
  describe('jsonResult', () => {
    it('serializa os dados no content block com ok:true', () => {
      const result = jsonResult({ total: 1 });
      expect(result.content[0]).toMatchObject({ type: 'text' });
      const payload = JSON.parse(textOf(result)) as unknown as PayloadOk;
      expect(payload).toEqual({ ok: true, data: { total: 1 } });
    });
  });

  describe('toolError', () => {
    it('devolve mensagem genérica ao cliente (sem vazar detalhe interno)', () => {
      const result = toolError(new Error('connect ECONNREFUSED'), undefined, 'listar_projetos');
      const payload = JSON.parse(textOf(result)) as unknown as PayloadError;
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe('MCP_ERROR');
      expect(payload.error.message).not.toContain('ECONNREFUSED');
    });

    it('loga o erro real com o nome da tool quando um logger é dado', () => {
      const logger = { error: jest.fn() };
      toolError(new Error('boom'), logger, 'consultar_decisao');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('consultar_decisao'),
        expect.any(String),
      );
    });
  });
});
