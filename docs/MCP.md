# MCP Server

O Hub expõe um servidor MCP (Model Context Protocol, spec **2025-06-18**) com
**12 tools** declarativas sobre os mesmos services da REST API.

## Transportes

| Transporte | Como ativar | Uso |
|---|---|---|
| Streamable HTTP | embutido no app — `POST/GET/DELETE /mcp` na porta 11020 | Claude Desktop via URL, agentes remotos |
| stdio | `npm run mcp:stdio` (compila `dist/src/mcp-stdio.js`) | Claude Desktop/Cursor/opencode local |

O transporte HTTP é um middleware puro (fora do prefixo `/api/v1` e dos
pipes/filtros do Nest). Cada sessão HTTP ganha um `McpServer` próprio (1
transport por sessão); sessões têm TTL `MCP_SESSION_TTL_MIN` (60 min, sliding)
com sweep.

## As 12 tools

| Tool (R/W) | Entrada | Saída |
|---|---|---|
| `listar_projetos` (R) | — | registry com counts |
| `detalhe_projeto` (R) | `project` | projeto + documentos + counts |
| `listar_documentos` (R) | `project? category? docType? q? page? pageSize?` | lista paginada |
| `obter_documento` (R) | `path` ou `id` (+`project?`) | conteúdo integral + chunks |
| `buscar_trechos` (R) | `query` + `project? category? topK? minScore?` | trechos citáveis (busca híbrida) |
| `resumo_documento` (R) | `path` ou `id` | título, categoria, headings, prévia |
| `resumo_projeto` (R) | `project` | visão geral, categorias dominantes, decisões recentes |
| `comparar_documentos` (R) | `pathA pathB project?` | sobreposição/similaridade |
| `exportar_contexto_llm` (R) | `project topic? maxTokens? sections?` | pacote de contexto tokenizado |
| `listar_categorias` (R) | — | taxonomia com contagens |
| `consultar_decisao` (R) | `project? q? status?` | ADRs |
| `executar_ingestao` (W, admin) | `project? reset?` | job assíncrono (BullMQ) |

Formato de resposta de toda tool: content block de texto com JSON
`{ "ok": true, "data": ... }` ou `{ "ok": false, "error": { "code", "message" } }`
(erros de execução são genéricos; detalhes vão ao log).

## Segurança (`MCP_API_KEY`, origins, rate limit)

1. **Origin allowlist** — quando o request traz `Origin`, só origens da lista
   (`http://localhost:11020`, `http://127.0.0.1:11020` + `MCP_ALLOWED_ORIGINS`)
   passam (403 caso contrário) — proteção contra DNS rebinding. Clientes
   nativos (Claude Desktop/stdio) não enviam Origin e não são afetados.
2. **`MCP_API_KEY`** (opcional) — se configurada, todo request precisa de
   `Authorization: Bearer <key>` (comparação em tempo constante; 401).
   A tool **`executar_ingestao` só funciona com `MCP_API_KEY` configurada**.
3. **Rate limit** próprio — `MCP_RATE_LIMIT` (default 120/min/IP, janela 60s,
   bucket em memória; 429).
4. **`MCP_ENABLE_JSON_RESPONSE`** — `false` (default) → SSE; `true` → respostas
   JSON puras (mais simples para alguns clientes). Clientes que enviam
   `Accept: application/json, text/event-stream` recebem SSE; só
   `application/json` recebem JSON.

## Config de clientes

**Claude Desktop** (`claude_desktop_config.json`) — stdio:

```json
{
  "mcpServers": {
    "hub-unificando": {
      "command": "node",
      "args": ["/Users/renatobezerra/Developer/Unificando Hub/hub-unificando/dist/src/mcp-stdio.js"]
    }
  }
}
```

**Clientes com URL** (Streamable HTTP):

```
url: http://localhost:11020/mcp
Authorization: Bearer <MCP_API_KEY>   (se configurada)
```

**opencode** (config de agentes) pode usar o mesmo stdio command.

## Handshake (curl)

```bash
# initialize (captura o Mcp-Session-Id no header da resposta)
curl -s -D - -X POST http://localhost:11020/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

# tools/list e tools/call usam o session id devolvido
curl -s -X POST http://localhost:11020/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: <session-id>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"buscar_trechos","arguments":{"query":"mcp streamable http","topK":3}}}'
```

## Adicionar uma tool

1. Crie `src/modules/mcp/tools/<nome>.ts` exportando `export function
   <nome>(deps: McpDeps): McpToolDefinition<typeof schema>` com schema zod e
   handler chamando os services do domínio.
2. Registre no array em `src/modules/mcp/tools/tools.index.ts`.
3. O núcleo (transporte, sessão, segurança, serialização) não muda.
