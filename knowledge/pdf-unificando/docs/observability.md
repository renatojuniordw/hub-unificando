# Observabilidade — logs, analytics e health

Como o **Unificando PDF** é observado: logs estruturados, métricas de negócio (GA4), Web Vitals e o endpoint de health.

## 1. Logs estruturados (servidor)

`src/lib/utils/logger.ts` emite **JSON em uma linha** via console:

```json
{ "level": "info", "scope": "API Compress", "message": "Iniciando compressão", "fileName": "x.pdf", "bytes": 12345, "quality": "medium" }
{ "level": "error", "scope": "API Error", "message": "...", "error": { "name": "...", "message": "...", "stack": "..." } }
```

Campos comuns:

| Campo | Descrição |
|---|---|
| `level` | `info` \| `warn` \| `error` |
| `scope` | contexto (ex.: `API Compress`, `RateLimit`, `Queue`) |
| `message` | descrição curta (inglês técnico) |
| demais | metadados arbitrários (`fileName`, `bytes`, `ip`, `code`, etc.) |

Onde é usado:

- `src/lib/utils/http.ts` (errorResponse loga o erro com status/code)
- `src/lib/queue.ts` (`logWarn` p/ rate limit e sobrecarga)
- `src/app/api/pdf/compress/route.ts` (info de início/fim)
- Testes de rodas de validação capturam os mesmos erros

**Uso em produção**: os logs JSON vão para stdout do container e são rotacionados pelo driver `json-file` do Docker. Para um agregador, basta coletar stdout (ex.: `docker logs`, serviço de logs, Grafana Loki, etc.).

## 2. Métricas de negócio — Google Analytics 4 (cliente)

`src/lib/analytics.ts` (client) envia eventos via `gtag`/dataLayer. ID `G-WDL8Q73DPM` (ou `NEXT_PUBLIC_GA_ID`).

Eventos disponíveis:

| Função | Evento GA4 | Disparo |
|---|---|---|
| `trackToolUpload(tool, fileCount)` | `tool_upload` | usuário inicia processamento (categoria `tools`, label = ferramenta, valor = nº arquivos) |
| `trackToolSuccess(tool, outputSize)` | `tool_success` | processamento concluído (valor = tamanho da saída) |
| `trackToolDownload(tool, filename)` | `tool_download` | clique em baixar (label `tool:filename`) |
| `trackToolError(tool, errorType)` | `tool_error` | falha (label `tool:errorType`) |

`analytics.ts` é excluído da cobertura de testes (client-only).

> **Consentimento (LGPD):** eventos de analytics/Web Vitals só são enviados após o consentimento do usuário (ver `src/lib/analytics.ts` + `ConsentBanner`/`TrackingScripts`). Antes da decisão, `trackEvent` é no-op.

## 3. Web Vitals (Core Web Vitals)

`src/components/observability/WebVitalsReporter.tsx` reporta métricas de performance para GA4 (as do Next.js `experimental/useReportWebVitals`/`web-vitals`). Cobrem LCP, INP/FID, CLS, TTFB, FCP.

## 4. Endpoint de saúde — `GET /api/health`

Resposta:

```json
{
  "status": "ok",
  "timestamp": "2026-09-04T...Z",
  "uptimeSeconds": 1234,
  "queue": { "active": 0, "pending": 0, "overloaded": false }
}
```

- Usado pelo **healthcheck do Docker** (`wget --spider /api/health`).
- `queue` reflete `src/lib/queue.ts` (`activeCount`, `pendingCount`, `isOverloaded()`).
- Sem auth, sem rate limit, sem logs de erro.

## 5. O que monitorar (sugestões de alertas)

| Sinal | Fonte | Limiar sugerido |
|---|---|---|
| `status` diferente de `ok` / HTTP 5xx no `/api/health` | healthcheck | imediato |
| Erros `INTERNAL_ERROR` (500) | logs (scope `API Error`) | crescente/repentino |
| `429 server_overloaded` | logs (`RateLimit`) + contadores | frequência alta = fila saturada |
| `429 ip_rate_limited` | logs | pode indicar abuso/bot — correlacionar com honeypot |
| `413 total_too_large` / `file_too_large` | logs | comportamento normal de limite; picos podem indicar uso indevido |
| Latência de jobs binários (compress/word/jpg) | logs de início/fim (compress) | >90s sinaliza CPU/tempo de nginx |
| Eventos `tool_error` vs `tool_success` | GA4 | taxa de erro >5% |
| CPU/mem do container | Docker stats | próximo de 1 CPU/1024M com regularidade |

## 6. Correlação

- Proxy injeta `x-request-id` em toda request `/api/pdf/*`; use-o para correlacionar logs do nginx (access log) com os logs do Node (mesmo id no acesso? verificar se o acesso passa o header — hoje o nginx proxypass repassa headers padrão; o `x-request-id` gerado no proxy Next é visível no log do route handler).
- Erros de API já incluem `scope`, `status`, `code` e `details` — agrupáveis por `code`.

## 7. Agregador de logs (opcional)

O repositório inclui `docker-compose.observability.yml` (Loki + Promtail) que coleta o stdout do container `unificando-pdf` e o envia ao Loki local (config em `observability/promtail.yaml`):

```bash
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
```

Consulta rápida: `curl 'http://localhost:3100/loki/api/v1/query_range?query={container="unificando-pdf"}'` ou Grafana apontando para `http://localhost:3100`. Esta pilha é **opcional** — o app funciona sem ela; os logs continuam no driver json-file do Docker.