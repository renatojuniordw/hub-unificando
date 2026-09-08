import type { IncomingMessage } from 'node:http';
import { clientIp } from './mcp.security';

function makeReq(xff?: string): IncomingMessage {
  return {
    headers: { 'x-forwarded-for': xff },
    socket: { remoteAddress: '203.0.113.9' },
  } as unknown as IncomingMessage;
}

describe('clientIp (rate limit MCP)', () => {
  it('sem TRUST_PROXY usa o socket e ignora XFF forjado', () => {
    const req = makeReq('1.2.3.4');
    expect(clientIp(req, false)).toBe('203.0.113.9');
  });

  it('sem TRUST_PROXY e sem XFF usa o socket', () => {
    const req = makeReq(undefined);
    expect(clientIp(req, false)).toBe('203.0.113.9');
  });

  it('com TRUST_PROXY usa a ÚLTIMA entrada do XFF (adicionada pelo proxy)', () => {
    const req = makeReq('1.2.3.4, 198.51.100.7');
    expect(clientIp(req, true)).toBe('198.51.100.7');
  });

  it('com TRUST_PROXY e XFF de um hop só usa essa entrada', () => {
    const req = makeReq('198.51.100.7');
    expect(clientIp(req, true)).toBe('198.51.100.7');
  });

  it('com TRUST_PROXY e sem XFF usa o socket', () => {
    const req = makeReq(undefined);
    expect(clientIp(req, true)).toBe('203.0.113.9');
  });

  it('fallback unknown quando não há socket nem XFF', () => {
    const req = { headers: {}, socket: {} } as unknown as IncomingMessage;
    expect(clientIp(req, false)).toBe('unknown');
  });
});
