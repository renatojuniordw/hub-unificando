# Dados e Modelo de Dados ("Database")

## Resposta curta

**O projeto não usa banco de dados.** Não há persistência em disco nem serviço externo (verificado: nenhum prisma/drizzle/supabase/sqlite/*.db/*.sql no repo). Os "dados" do produto vêm de:

1. **Configs estáticos** compilados no build — `src/config/tools.ts` e `src/config/tutorials.ts`.
2. **Estado em memória** durante o processo — rate limit (Map) e fila de jobs (p-limit).
3. **Arquivos temporários** em `/tmp` durante o processamento (removidos ao final).

## 1. Configs estáticos (fonte de conteúdo)

Tipos definidos em `src/types/tools.ts` e inline em `src/config/tutorials.ts`.

### `src/config/tools.ts` — catálogo de ferramentas (16)

Cada item é um `ToolDefinition`:

```ts
interface ToolDefinition {
  slug: string          // "comprimir-pdf" (slug público)
  name: string          // "Comprimir PDF"
  description: string   // exibida na página
  seoDescription: string
  icon: string          // chave do ícone (ToolIcons)
  tier: number          // agrupamento na home
  accept: string[]      // extensões aceitas [".pdf"]
  multiple: boolean     // aceita vários arquivos?
  usesBinary: boolean   // usa binário externo (Ghostscript/LibreOffice)?
}
```

Funções: `getTool(slug)` (acessa por slug), além da constante `tools`. Usado por: home, páginas `/ferramentas/*`, `sitemap`, SEO, tutoriais (via `targetToolSlug`).

### `src/config/tutorials.ts` — tutoriais (16)

```ts
interface TutorialDefinition {
  slug: string
  title: string
  description: string
  searchIntent: string
  intro: string
  whenToUse: string[]
  steps: { title: string; description: string }[]
  commonMistakes: string[]
  faqs: { question: string; answer: string }[]
  targetToolSlug: string   // vincula ao catálogo de ferramentas
  estimatedTime: string
  difficulty: 'Fácil' | 'Médio' | 'Difícil'
}
```

Geração estática: `src/app/tutoriais/[slug]/page.tsx` usa `generateStaticParams()` com esses dados, `dynamicParams = false` (slug inexistente → 404).

### Tipos de domínio

- `src/types/pdf.ts` — `ProcessingStatus` (idle/uploading/processing/rate_limited/done/error), tipos de páginas/redação (`Rect`, `PageInfo`, `Resolution`), etc.
- `src/types/tools.ts` — `ToolDefinition`.

## 2. Estado em memória (por processo)

| Módulo | Estrutura | Ciclo de vida | Implicação |
|---|---|---|---|
| `src/lib/utils/rate-limit.ts` | `Map<string, { count, expires }>` por IP | Janela de 60s com limpeza a cada 60s via `setInterval` | Reinicia com o processo; ok para instância única |
| `src/lib/queue.ts` | fila `p-limit` (`binaryLimit`, `activeCount`, `pendingCount`) | Durante o ciclo do processo | Concorrência global por instância |

## 3. Arquivos temporários

`src/lib/utils/tmp.ts` (`withTmpFile`) cria arquivos em `/tmp` (montado como tmpfs no Docker) para operações com binários externos (Ghostscript, LibreOffice) e os remove ao final. Nada de uploads persistidos.

## 4. Implicações de escala / multi-instância

Como não há armazenamento compartilhado:

- **Rate limit e fila são por instância.** Com 2+ réplicas, o limite de 5 req/min por IP vale por réplica (multiplicaria o teto) e a fila não é global.
- Para escalar horizontalmente com limites globais, seria necessário um armazenamento distribuído (ex.: Redis/Upstash) para o rate limit e uma fila externa para os jobs.
- Dados de conteúdo (`config/`) são estáticos e idênticos em todas as réplicas — sem migração.

## 5. Modelo conceitual (visão de produto)

```
Ferramenta (1) ──<──── Tutorial (N)      via targetToolSlug
Ferramenta (1) ──<──── Página /ferramentas/* (page.tsx + *Client.tsx)
Ferramenta (1) ──<──── API /api/pdf/<slug> (route.ts)
Ferramenta (1) ──<──── Motor src/lib/pdf/<slug>.ts
```

Não há usuários, contas, histórico ou armazenamento de arquivos — cada processamento é stateless e descartável.