# API — Referência

Todas as rotas de API do projeto. São **19 rotas**: 1 `GET` de health + 18 `POST` de processamento de PDF.

## Visão geral

- Base (produção): `https://pdf.unificando.com.br`
- Formato: `multipart/form-data` para upload; respostas binárias (stream) ou JSON de erro.
- Todas as rotas de processamento passam pelo **Proxy** (`src/proxy.ts`): validação de origem (`ALLOWED_ORIGIN`) e opcionalmente Bearer token (`API_SECRET_KEY`).
- Todas aplicam **rate limit** por IP (5 req/min, header `x-real-ip`) e **limites de upload** (50MB/arquivo, 50MB total, 20 arquivos).

## Envelope de erro

Toda resposta de erro é JSON com o mesmo formato (gerado por `apiErrorResponse`/`errorResponse`):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "O arquivo não é um PDF válido.",
    "details": { "field": "file", "reason": "invalid_pdf" },
    "retryable": false
  }
}
```

### Códigos de erro

| Código | Status | Quando |
|---|---|---|
| `VALIDATION_ERROR` | 400 / 413 / 422 | Dado inválido, arquivo ausente/ilegível, excede limites |
| `UNAUTHORIZED` | 401 | Bearer token ausente/incorreto (se `API_SECRET_KEY` configurada) |
| `FORBIDDEN` | 403 | Origem não permitida (`origin_not_allowed`) |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `RATE_LIMITED` | 429 | IP bloqueado ou servidor sobrecarregado (inclui `Retry-After`) |
| `INTERNAL_ERROR` | 500 | Falha inesperada (detalhes no log, nunca no corpo) |

## Limites de upload (todas as rotas)

| Limite | Valor | Detalhes |
|---|---|---|
| Tamanho por arquivo | 50MB (`MAX_FILE_SIZE`) | `details.reason: 'file_too_large'` |
| Quantidade de arquivos | 20 (`MAX_UPLOAD_FILES`) | `details.reason: 'too_many_files'` — 413 |
| Tamanho total (multi-arquivo) | 50MB (`MAX_TOTAL_UPLOAD_BYTES`) | `details.reason: 'total_too_large'` — 413 |
| Body no Proxy (Next) | 55mb (`proxyClientMaxBodySize`) | acima disso o nginx corta (413 HTML) |
| Body no nginx | 55M (`client_max_body_size`) | acima disso nginx responde 413 HTML |

## Rotas de processamento (POST)

Todas: `POST`, `Content-Type: multipart/form-data`, resposta binária (ou JSON de erro), `Cache-Control: no-store`.

| Rota (API) | Slug público da página | Campos do FormData | Resposta binária | Erros específicos |
|---|---|---|---|---|
| `/api/pdf/compress` | `comprimir-pdf` | `file` (PDF), `quality` (`low|medium|high`, default `medium`) | PDF | headers `X-Original-Size`/`X-Compressed-Size` |
| `/api/pdf/merge` | `juntar-pdf` | `file` × N (mín. 2) | PDF | `minimum_files` (mín. 2) |
| `/api/pdf/split` | `dividir-pdf` | `file`, `range` (obrigatório) | PDF | `missing_range` |
| `/api/pdf/extract-pages` | `extrair-paginas` | `file`, `range` (obrigatório) | ZIP | `missing_range` |
| `/api/pdf/organize` | `organizar-pdf` | `file`, `order` (obrigatório) | PDF | `missing_order` |
| `/api/pdf/rotate` | `rodar-pdf` | `file`, `degrees` (default `90`), `scope` (`all`\|`page`), `page` (1-based) | PDF | ângulo inválido → 400 |
| `/api/pdf/page-numbers` | `numerar-paginas` | `file`, `placement` (`header`\|`footer`), `alignment` (`left`\|`center`\|`right`), `startAt` (1–9999) | PDF | — |
| `/api/pdf/protect` | `proteger-pdf` | `file`, `password` (obrigatório, ≤128) | PDF | `missing_password`, `too_long` |
| `/api/pdf/watermark` | `marca-dagua` | `file`, `text` (obrigatório, ≤100), `color` (`gray`\|`black`\|`red`), `opacity` (0.05–1), `fontSize` (20–120) | PDF | `missing_text`, `too_long` |
| `/api/pdf/to-jpg` | `pdf-para-jpg` | `file`, `dpi` (`72`\|`300`, default `150`) | JPG ou ZIP (1 página → JPG; várias → ZIP) | — |
| `/api/pdf/to-png` | `pdf-para-png` | `file`, `dpi` (`72`\|`300`, default `150`) | PNG ou ZIP | — |
| `/api/pdf/to-txt` | `pdf-para-txt` | `file` | TXT (`text/plain; charset=utf-8`) | — |
| `/api/pdf/to-markdown` | `pdf-para-markdown` | `file` | Markdown (`text/markdown; charset=utf-8`) | — |
| `/api/pdf/to-word` | `pdf-para-word` | `file` | DOCX | — |
| `/api/pdf/from-jpg` | `jpg-para-pdf` | `file` × N (JPG/PNG), `orientation` (`portrait` default) | PDF | `invalid_image` |
| `/api/pdf/redact` | `redigir-pdf` | `file`, `regions` (JSON string obrigatório), `resolution` (`72`\|`144`\|`216`, default `144`) | PDF | `missing_regions`, `invalid_json`, `invalid_shape` |
| `/api/pdf/redact/preview` | `redigir-pdf` | `file` | JSON `{ pages: [{ image, width, height }] }` | `Cache-Control: no-store` |
| `/api/pdf/redact/search` | `redigir-pdf` | `file`, `query` (obrigatório, ≤100) | JSON `{ regions: [...] }` | `missing_query`, `too_long` |

> Os slugs da API usam inglês (`merge`, `split`, `rotate`, `redact`, `to-jpg`, `from-jpg`...); as páginas públicas usam português (`juntar-pdf`, `dividir-pdf`, `redigir-pdf`...).

## Rotas utilitárias

### `GET /api/health`

Sem autenticação nem rate limit. Retorna estado do serviço e da fila:

```json
{
  "status": "ok",
  "timestamp": "...",
  "uptimeSeconds": 123,
  "queue": { "active": 0, "pending": 0, "overloaded": false }
}
```

Usado pelo healthcheck do Docker (`wget .../api/health`).

## Exemplos (curl)

**Compress** — envia PDF e baixa o resultado:

```bash
curl -X POST https://pdf.unificando.com.br/api/pdf/compress \
  -F "file=@documento.pdf" \
  -F "quality=high" \
  -o comprimido.pdf
```

**Merge** — junta 3 PDFs (mín. 2):

```bash
curl -X POST https://pdf.unificando.com.br/api/pdf/merge \
  -F "file=@a.pdf" -F "file=@b.pdf" -F "file=@c.pdf" \
  -o unificado.pdf
```

**Redact/preview** — obtém páginas para desenhar redações:

```bash
curl -X POST https://pdf.unificando.com.br/api/pdf/redact/preview \
  -F "file=@doc.pdf"
```

**Exemplo de erro (4xx)**:

```bash
curl -X POST https://pdf.unificando.com.br/api/pdf/to-txt \
  -F "file=@texto.txt"   # não é PDF → 400 VALIDATION_ERROR invalid_pdf
```

## Honeypot

Todas as rotas ignoram requisições que preencham o campo `_hp` (armadilha para bots): `400 VALIDATION_ERROR` `honeypot_triggered`. Bots que preenchem formulários falsos enviam `_hp` preenchido; clientes legítimos nunca enviam esse campo.

## Formato de resposta binária

`streamResponse(buffer, filename, mime)` define:
- `Content-Type` do arquivo
- `Content-Disposition: attachment; filename="..."` gerado por `buildOutputFilename`
- `Cache-Control: no-store` (via header global em `next.config.ts` para `/api/pdf/:path*`)

JSON responses de preview/busca definem `Cache-Control: no-store` explicitamente.