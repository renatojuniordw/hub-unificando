# Segurança

Postura de segurança do **Unificando PDF** — processamento de arquivos de usuários em servidor, sem persistência. Princípio: **defesa em camadas** (validação no cliente e no servidor, proxy, nginx, container).

## 1. Validação de upload (camada de aplicação)

Implementada em `src/lib/utils/http.ts` (helpers usados por todas as rotas) e `src/lib/limits.ts`.

| Defesa | Onde | Comportamento |
|---|---|---|
| **Honeypot `_hp`** | `parseFormData` | Formulário escondido; bots que preenchem → `400 honeypot_triggered`. Clientes legítimos nunca enviam o campo |
| **Magic bytes** | `isPdf` / `isJpg` / `isPng` | Arquivo é validado pelo conteúdo, não pela extensão: `%PDF-`, `FF D8`, `89 50 4E 47` |
| **Tamanho por arquivo** | `assertMaxFileSize` | 50MB (`MAX_FILE_SIZE`) → `413 file_too_large` |
| **Quantidade** | `assertMaxFileCount` | 20 arquivos (`MAX_UPLOAD_FILES`) → `413 too_many_files` |
| **Tamanho total** | `assertMaxTotalSize` | 50MB soma (`MAX_TOTAL_UPLOAD_BYTES`) → `413 total_too_large` |

Nenhum upload é salvo em disco de forma persistente; só buffers temporários (tmpfs) liberados ao final.

## 2. Rate limit e sobrecarga

- **Por IP** (`src/lib/utils/rate-limit.ts` + `src/lib/queue.ts` `validateRateLimit`): 5 requisições/min por IP (`x-real-ip` — setado pelo nginx a partir de `$remote_addr`, **não forjável** pelo cliente; evita-se `x-forwarded-for`). Excesso → `429 RATE_LIMITED` com `Retry-After`.
- **Sobrecarga global**: fila `p-limit` — se `active + pending >= concorrência + fila`, responde `429 server_overloaded` com `Retry-After` (`RETRY_AFTER_SECONDS`).
- **nginx**: `limit_req zone=pdf_upload rate=5r/m burst=3 nodelay` em `/api/pdf/` — proteção antes de chegar ao Node.

## 3. Proxy — origem e autenticação (`src/proxy.ts`)

- **Origem**: valida `Origin`/`Referer` contra `ALLOWED_ORIGIN` (ou o `Host` da request); divergência → `403 origin_not_allowed`. `localhost` é sempre permitido (debug).
- **Bearer token opcional**: se `API_SECRET_KEY` estiver definida, exige `Authorization: Bearer <chave>` → `401`. Comparação **timing-safe** (SHA-256 + `crypto.timingSafeEqual`). A variável está wired no `docker-compose.yml`.
- Injeta `x-request-id` para correlação de logs.

> A origem real em produção é o nginx (proxy do browser). `ALLOWED_ORIGIN` protege cenários de deploy alternativos (ex.: ferramentas de teste, integrações).

## 4. Limites de infraestrutura

| Camada | Limite | Efeito |
|---|---|---|
| nginx `client_max_body_size` | 55M | 413 HTML antes de chegar ao Node para bodies gigantes |
| Next `proxyClientMaxBodySize` | 55mb | limita o buffer/clone do body no proxy (default 10MB truncava uploads) |
| Container | 1 CPU / 1024M RAM / tmpfs 512m | limita impacto de um job pesado |

## 5. Headers HTTP e CSP

`next.config.ts` (headers globais):

- `Content-Security-Policy` restritiva: `default-src 'self'`; `script-src 'self' 'unsafe-inline' 'unsafe-eval'` + domínios de terceiros específicos (GA, GTM, AdSense, FB); `style-src 'self' 'unsafe-inline'`; `frame-src` restrito a terceiros (AdSense/FB/GTM); `connect-src` com os endpoints de analytics/ads; `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. Nota: não usa nonce — depende de `'unsafe-inline'`/`'unsafe-eval'` para scripts embutidos do GA/Ads (evolução futura: migrar para nonce).
- `Strict-Transport-Security` (HSTS 2 anos)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`
- `/api/pdf/:path*` → `Cache-Control: no-store` (nunca cachear uploads/respostas de processamento)

## 5.1 Consentimento de rastreamento (LGPD)

- Scripts de terceiros (GA4, GTM, Meta Pixel, AdSense) **não** são mais carregados no layout de forma incondicional.
- `src/components/analytics/ConsentBanner.tsx` exibe o banner; a preferência fica em `localStorage` (`unificando-consent`, first-party).
- `src/components/analytics/TrackingScripts.tsx` injeta os scripts **somente após o consentimento**.
- `src/lib/analytics.ts` (`trackEvent`) é no-op sem consentimento — inclui Web Vitals.
- Política de privacidade (`/privacidade`) lista processadores, base legal, direitos do titular, retenção e transferência internacional.

## 6. Hardening de container (Docker)

- Usuário **não-root** (`appuser`)
- `read_only: true` (só tmpfs para escrita)
- `no-new-privileges: true`
- `cap_drop: ALL` (sem capabilities)
- **Política restritiva do Ghostscript** (`policy.xml`): bloqueia operadores perigosos (desvio de sandbox, escrita arbitrária) — mitigação para PDFs maliciosos processados por Ghostscript

## 7. Binários externos

Ghostscript, LibreOffice e pdftoppm processam conteúdo do usuário. Mitigações:
- Rodam no container com as restrições acima (cap_drop, read-only, não-root)
- Ghostscript com policy restritiva
- Concorrência limitada (`MAX_CONCURRENT_JOBS`), evitando esgotamento de recursos
- Tempo de resposta controlado por timeouts (nginx 120s, cliente 120s)

## 8. Dados e privacidade

- **Sem banco de dados** e **sem armazenamento de arquivos** — nada persistido (ver `data.md`).
- Rate limit e fila vivem apenas em memória do processo.
- Arquivos temporários em tmpfs (voláteis, sem disco persistente).

## 9. Checklist de revisão

- [ ] Nova rota usa `validateRateLimit` + helpers de `parse*Upload` (honeypot + limites + magic bytes)
- [ ] Erros nunca vazam stack/detalhes internos (envelope `INTERNAL_ERROR` sem dados sensíveis)
- [ ] Respostas de processamento com `Cache-Control: no-store`
- [ ] Se aumentar limites, alinhar nginx ↔ proxy ↔ `limits.ts` (ver `deployment.md`)
- [ ] Testes cobrem os caminhos de erro (honeypot, arquivo inválido, limites) — ver `tests/unit/api/routes-validation.test.ts`
- [ ] Nenhum script de terceiro carrega antes do consentimento (ver `ConsentBanner`/`TrackingScripts`)
- [ ] `npm audit --omit=dev --audit-level=high` sem acusações (rodado no CI)