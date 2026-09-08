import { createHash, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../shared/config/env';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type McpSecurityResult =
  { ok: true } | { ok: false; status: number; body: { error: string } };

const BEARER_PREFIX = 'Bearer ';

/** Comparação em tempo constante (hash sha256 antes do timingSafeEqual). */
function constantTimeEqual(value: string, expected: string): boolean {
  const hash = (input: string) => createHash('sha256').update(input, 'utf8').digest();
  return timingSafeEqual(hash(value), hash(expected));
}

/**
 * Validações de segurança antes do transporte (mesmo padrão do med):
 * 1. Origin allowlist (anti DNS rebinding); clientes nativos não enviam Origin.
 * 2. MCP_API_KEY opcional → Authorization: Bearer (constant-time).
 * 3. Rate limit por IP (janela de 60s, escopo próprio do MCP).
 */
export function checkMcpSecurity(
  req: IncomingMessage,
  env: Env,
  buckets: Map<string, { count: number; resetAt: number }>,
): McpSecurityResult {
  // 1. Origin
  const origin = req.headers.origin;
  if (origin) {
    const allowed = [
      'http://localhost:11020',
      'http://127.0.0.1:11020',
      ...env.MCP_ALLOWED_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ];
    if (!allowed.includes(origin)) {
      return { ok: false, status: 403, body: { error: 'Origem não permitida' } };
    }
  }

  // 2. API key
  if (env.MCP_API_KEY) {
    const auth = req.headers.authorization ?? '';
    if (
      !auth.startsWith(BEARER_PREFIX) ||
      !constantTimeEqual(auth.slice(BEARER_PREFIX.length), env.MCP_API_KEY)
    ) {
      return { ok: false, status: 401, body: { error: 'Não autorizado' } };
    }
  }

  // 3. Rate limit por IP
  const ip = clientIp(req, env.TRUST_PROXY);
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
  } else {
    bucket.count += 1;
    if (bucket.count > env.MCP_RATE_LIMIT) {
      return {
        ok: false,
        status: 429,
        body: { error: 'Muitas requisições. Tente novamente em instantes.' },
      };
    }
  }

  return { ok: true };
}

/**
 * IP do cliente para rate limit. x-forwarded-for só é considerado quando o
 * hub roda atrás de proxy reverso confiável (TRUST_PROXY=true) — e nesse caso
 * usa a ÚLTIMA entrada (a adicionada pelo proxy confiável), não a primeira
 * (que o cliente pode forjar).
 */
export function clientIp(req: IncomingMessage, trustProxy: boolean): string {
  const socket = req.socket.remoteAddress ?? 'unknown';
  if (!trustProxy) return socket;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string' || forwarded.length === 0) return socket;
  const hops = forwarded
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  return hops[hops.length - 1] ?? socket;
}

/** Aplica CORS quando a origem está na allowlist (o transporte não emite). */
export function applyCors(res: ServerResponse, origin: string | null, env: Env): void {
  if (!origin) return;
  const allowed = [
    'http://localhost:11020',
    'http://127.0.0.1:11020',
    ...env.MCP_ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];
  if (!allowed.includes(origin)) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}
