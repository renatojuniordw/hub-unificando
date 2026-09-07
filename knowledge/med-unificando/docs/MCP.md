# MCP Server — Model Context Protocol

> Este documento descreve o **MCP Server** do Med Unificando: como o mesmo domínio
> de busca/consulta do site é exposto como **ferramentas** para agentes de IA
> (Claude Desktop/Code, Cursor, opencode, etc.) via Model Context Protocol.

---

## Visão Geral

O Med Unificando expõe um endpoint **MCP via Streamable HTTP** (spec `2025-06-18`):

```
https://med.unificando.com.br/api/mcp
```

Um agente habilitado a MCP pode, por exemplo, responder à pergunta *"quais
medicamentos com dipirona estão ativos e qual o preço?"* chamando as tools
`buscar_medicamentos` + `detalhe_medicamento` — com a **mesma qualidade de
busca do site** (híbrida: semântica + keyword + trigram), sem scraping.

Características:

- **Somente leitura** — espelha a área pública do site; ações administrativas
  (sync ANVISA, feedback, admin) **não** são expostas.
- **Reuso total do domínio** — as tools chamam as mesmas Server Actions de
  `src/lib/actions/*` (DRY). Nenhuma lógica de negócio duplicada.
- **Aberto + rate limit** — por padrão não exige chave (dados públicos);
  proteção por IP e Origin allowlist. Opcionalmente aceita `MCP_API_KEY`.
- **Local ou remoto** — o mesmo design funciona como servidor local (stdio)
  se necessário (ver [Roadmap](#roadmap)).

---

## Transporte e Handshake

O endpoint aceita `GET`, `POST` e `DELETE` — implementação do Streamable HTTP:

| Método | Uso |
|--------|-----|
| `POST` | Envia mensagens JSON-RPC (`initialize`, `tools/list`, `tools/call`, ...) |
| `GET`  | Abre um stream SSE por sessão (notificações do servidor) |
| `DELETE` | Encerra a sessão explicitamente |

Sequência típica (handshake):

1. `POST` com `initialize` → resposta `200` + header **`Mcp-Session-Id`**
2. `POST` com `notifications/initialized` → `202 Accepted`
3. `POST` com `tools/list` → lista de 12 tools
4. `POST` com `tools/call` → resultado da tool
5. `DELETE` (opcional) → encerra a sessão

> Com `MCP_ENABLE_JSON_RESPONSE=true` as respostas chegam como **JSON puro**
> (mais simples atrás de proxies). Com o default `false`, o servidor responde
> via **SSE** (`Content-Type: text/event-stream`), conforme o spec.

### Exemplo com curl

```bash
# 1. Inicializar (guarde o valor do header mcp-session-id)
curl -i -X POST https://med.unificando.com.br/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0", "id": 1, "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": { "name": "meu-agente", "version": "1.0" }
    }
  }'

# 2. Listar tools
curl -X POST https://med.unificando.com.br/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 3. Chamar uma tool
curl -X POST https://med.unificando.com.br/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: <SESSION_ID>" \
  -d '{
    "jsonrpc": "2.0", "id": 3, "method": "tools/call",
    "params": {
      "name": "buscar_medicamentos",
      "arguments": { "pageSize": 5, "status": "Ativo", "activeIngredient": "dipirona" }
    }
  }'
```

---

## Tools disponíveis (12)

Todas as tools retornam JSON em um content block de texto (`Content-Type: text`).

| Tool | Descrição | Inputs principais | Action de origem |
|------|-----------|-------------------|------------------|
| `buscar_medicamentos` | Lista com filtros (query, referência, princípio ativo, nome, detentor, forma, categoria, situação, Farmácia Popular) + paginação | `query?`, `activeIngredient?`, `status?`, `page?`, `pageSize?` (≤100) | `searchMedicines` |
| `buscar_por_descricao` | Busca semântica híbrida por linguagem natural ("queimação e dor no estômago") | `query` (obrigatório), `topK?` (≤50) | `hybridSearch` |
| `autocomplete_campo` | Sugere valores distintos de um campo | `field` (enum de 7 campos), `q` | `searchAutocomplete` |
| `detalhe_medicamento` | Detalhe completo: dados ANVISA + preços CMED + similares | `id` | `getMedicineDetail` |
| `referencias_medicamento` | Lista (ou busca) medicamentos de referência | `query?` | `getReferenceMedicines` / `searchReferenceMedicines` |
| `similares_referencia` | Similares de uma referência pelo nome | `name` | `getSimilaresByReference` |
| `arvore_atc` | Árvore ATC anatômico/terapêutico/químico com contagens | — | `getAtcLevels` |
| `medicamentos_por_atc` | Medicamentos por prefixo de código ATC | `code`, `page?`, `pageSize?` | `getMedicinesByAtc` |
| `medicamentos_por_detentor` | Medicamentos de um detentor, paginados | `holder`, `search?`, `status?`, `page?`, `pageSize?` | `getHolderMedicines` |
| `resumo_detentor` | Resumo do detentor (total, ativos, categorias) | `holder` | `getHolderSummary` |
| `comparar_medicamentos` | Compara por IDs ou por termo de busca (até 10) | `ids?` ou `query?` (exige um) | `getMedicinesByIds` / `searchMedicinesForCompare` |
| `estatisticas_medicamentos` | Estatísticas da base; filtros opcionais (ano, categoria, situação) | `year?`, `category?`, `status?` | `getDashboardStats` / `getFilteredStats` |

> **`buscar_por_descricao`** carrega o modelo ONNX local (`multilingual-e5-base`)
> na primeira chamada — a latência inicial é maior (igual ao site). Resultados
> são cacheados em memória (TTL 5 min).

---

## Configuração em clientes

### Claude Desktop

```json
{
  "mcpServers": {
    "med-unificando": {
      "url": "https://med.unificando.com.br/api/mcp"
    }
  }
}
```

### Cursor

Settings → MCP → Add new MCP server:

```
Type: HTTP
URL: https://med.unificando.com.br/api/mcp
```

### opencode

```json
{
  "mcp": {
    "med-unificando": {
      "type": "http",
      "url": "https://med.unificando.com.br/api/mcp"
    }
  }
}
```

### Uso local (stdio, dev)

O mesmo conjunto de tools pode rodar como subprocesso local:

```bash
npx tsx scripts/mcp-server.ts   # (futuro — ver Roadmap)
```

---

## Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `MCP_ENABLED` | `false` desliga `/api/mcp` (404 em todos os métodos) | `true` |
| `MCP_API_KEY` | Se definida, exige `Authorization: Bearer <key>` em toda requisição | vazio (aberto) |
| `MCP_ALLOWED_ORIGINS` | Allowlist extra de Origin (vírgula separada) além do `BASE_URL` | vazio |
| `MCP_SESSION_TTL_MIN` | TTL de sessão em minutos (renovação deslizante) | `60` |
| `MCP_ENABLE_JSON_RESPONSE` | `true` = respostas JSON puras; `false` = SSE (spec) | `false` |
| `MCP_RATE_LIMIT` | Limite de requisições/min por IP (escopo `mcp`) | `120` |

---

## Segurança

- **Origin allowlist (anti DNS rebinding)** — exigência do spec. Clientes
  nativos não enviam `Origin` e passam; navegadores precisam estar na allowlist
  (`BASE_URL` + `MCP_ALLOWED_ORIGINS`). Fora da lista → `403`.
- **CORS para navegadores** — o transporte MCP não emite CORS; a rota adiciona
  `Access-Control-Allow-Origin` (eco da origem permitida), `Vary: Origin`,
  `Access-Control-Expose-Headers: mcp-session-id` e responde preflight `OPTIONS`.
  Consumo principal continua sendo clientes nativos (Claude/Cursor/opencode).
- **API key opcional** — com `MCP_API_KEY` definida, toda requisição sem
  `Authorization: Bearer <key>` → `401` (comparação constant-time via
  `crypto.timingSafeEqual`).
- **Rate limit por IP** — 120 req/min (configurável), reusando o limiter das
  rotas `/api` (`src/lib/rate-limit.ts`), escopo `mcp`. *Deploy atrás de proxy:
  garanta que ele propague `X-Forwarded-For`/`X-Real-IP` na rota `/api/mcp`*
  (nginx não herda `proxy_set_header` entre locations — ver `docs/DEPLOYMENT.md`).
- **Somente leitura** — actions com `withAdmin`/`revalidatePath`/`next/cache`
  ficam fora do MCP (nada de escrita).
- **Erros genéricos** — detalhes internos (ex.: Prisma) nunca vazam nas tools;
  apenas `Erro interno ao executar a ferramenta`. Exceção: estouro de rate limit
  das server actions retorna mensagem própria ("Muitas requisições...").
- **Sessões com TTL** — sweep periódico no padrão do rate-limit (teto 10k);
  sessão expirada/invalidada → `404`, cliente reinicializa sozinho (spec).
  Sessões removidas (expiração/evicção/DELETE) têm transport + server fechados
  explicitamente para não vazar streams SSE.

Detalhes: `docs/SECURITY.md`.

---

## Arquitetura

```
src/lib/mcp/
├── types.ts        # McpToolDefinition (declaração declarativa de tool)
├── result.ts       # jsonResult / toolError (serialização + erro genérico)
├── register.ts     # registerTools(server, defs) — composition root OCP
├── server.ts       # createMcpServer() — factory do McpServer
├── config.ts       # MCP_CONFIG (env vars centralizadas)
├── session.ts      # McpSessionManager (Map + TTL + sweep, 1 server/sessão)
├── security.ts     # checkMcpSecurity (origin + api key + rate limit)
└── tools/          # 12 tools declarativas + schemas zod + index.ts
src/app/api/mcp/route.ts   # GET/POST/DELETE — adaptador HTTP fino
```

Decisões:

- **1 McpServer por sessão** — o SDK rejeita conectar o mesmo `Server` a mais
  de um transport; com sessões em memória isso é trivial e consistente com o
  deploy single-process (Docker/VPS).
- **Tools declarativas** — nova tool = arquivo novo + 1 linha no array
  `TOOL_DEFINITIONS`. O núcleo não muda (OCP); handlers dependem de dados
  puros, não do protocolo (DIP).
- **Sessões em memória** — premissa igual à do rate-limit: instância única.
  Para multi-instância (serverless), evoluir para store externo (Roadmap).

---

## Deploy e Operação

- **Docker**: basta adicionar as variáveis `MCP_*` ao serviço `app`
  (`docker-compose.yml`). O endpoint fica disponível na mesma origem do site.
- **Reverse proxy (nginx/traefik)**: para `MCP_ENABLE_JSON_RESPONSE=false`
  (SSE), desative o buffering no proxy da rota `/api/mcp`:
  ```nginx
  location /api/mcp {
      proxy_buffering off;
      proxy_read_timeout 30m;   # streams SSE podem ficar abertos
      proxy_http_version 1.1;
      proxy_set_header Connection "";
  }
  ```
- **Health**: o endpoint não precisa de health próprio — depende do banco,
  coberto por `/api/health`.

---

## Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| `400 Bad Request: Server not initialized` | Request sem `initialize` (ou sem session header) | Cliente precisa iniciar sessão primeiro |
| `404 Session not found` | Sessão expirada/redeploy | Cliente re-inicializa automaticamente (spec) |
| `403 Origem não permitida` | Origin fora da allowlist (browser) | Adicionar à `MCP_ALLOWED_ORIGINS` ou usar cliente nativo |
| `401 Não autorizado` | `MCP_API_KEY` definida e sem Bearer | Enviar `Authorization: Bearer <key>` |
| `429` | Rate limit por IP | Aguardar `Retry-After` |
| Resposta como SSE em vez de JSON | `MCP_ENABLE_JSON_RESPONSE=false` (default) | `true` para JSON puro, ou desabilitar buffering no proxy |
| Primeira chamada de `buscar_por_descricao` lenta | Carregamento do modelo ONNX | Normal; cache persistente do modelo em `/tmp/.transformers-cache` |

---

## Roadmap

- **Server local (stdio)** — `scripts/mcp-server.ts` usando as mesmas tools
  (`registerTools`), para uso offline/sem deploy.
- **Auth OAuth** (autorização do spec) — para acesso gerenciado.
- **Resources/Prompts MCP** — expor `medicamento://{id}` como recurso e
  prompts de comparação.
- **Sessões em Redis** — suporte a multi-instância/serverless.

---

## Referências

- [Model Context Protocol — Spec](https://modelcontextprotocol.io)
- [Streamable HTTP Transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- SDK: `@modelcontextprotocol/sdk` (npm)
- Código: `src/lib/mcp/` + `src/app/api/mcp/route.ts`