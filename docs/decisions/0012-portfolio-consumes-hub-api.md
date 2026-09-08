# 0012 — portfolio-ui consome a API do hub (posts + registry)

Date: 2026-09-08 · Status: **proposto** (plano — ainda não implementado)

> Próximo passo natural do ADR 0011: fazer o `portfolio-ui` consumir
> `GET /api/v1/posts` e `GET /api/v1/projects?surface=portfolio` do
> hub-unificando, para que os dois sistemas compartilhem de fato a mesma API
> e o mesmo conteúdo. Este plano foi desenhado contra o código real dos dois
> repos (blog.ts síncrono, `dynamicParams = false`, cases ricos em TSX).

## Contexto

O hub já expõe tudo que o portfolio precisa (ADR 0011):

- `GET /api/v1/posts?tag=&project=&page=&pageSize=` — 10 posts publicados,
  ordenados por `date desc`, com `slug/title/summary/date/tags`.
- `GET /api/v1/posts/:slug` — markdown cru + `readingTime` + metadados.
- `GET /api/v1/projects?surface=portfolio` — os 13 case studies
  (5 lab + automacao + vitrine + 6 pessoais/clientes), com
  `slug/name/description/repoUrl/tags/status/featured/metadata.liveUrl`.

Hoje o portfolio lê tudo localmente: blog via `fs` (`src/lib/blog.ts`,
funções **síncronas**) e cases via imports TSX (`src/lib/project-cases.ts`).
O objetivo é trocar a **fonte de dados** mantendo o comportamento visual
idêntico — e cair de volta para o `fs` quando o hub não estiver disponível
(fallback), para que o build/deploy nunca quebrem.

## Decisões de design (fechadas)

1. **Adapter, não reescrita** — `src/lib/blog.ts` e `src/lib/project-cases.ts`
   mantêm as assinaturas públicas; por dentro passam a tentar o hub primeiro
   e caem para o `fs`/imports locais em caso de falha. As páginas não mudam
   de forma (só viram `async` onde necessário).
2. **Funções viram async** — `getAllPosts(): Promise<BlogPost[]>`,
   `getPostBySlug(): Promise<BlogPost | null>`, `getRecentPosts()`. Consumidores
   a ajustar: `src/app/blog/page.tsx:26` (componente síncrono → async),
   `src/app/blog/[slug]/page.tsx:21` (`generateStaticParams` → async) e `:30/:92/:98`.
3. **`HUB_API_URL` com fallback** — nova env `HUB_API_URL` (default
   `http://localhost:11020/api/v1`). Sem env ou com fetch falho → fonte local.
   O fallback é **por chamada**, nunca lança.
4. **Projetos: só a LISTA vem do hub** — os 13 cards (`ProjectCard`) passam a
   vir de `GET /projects?surface=portfolio` (slug/título/descrição/techs via
   `tags`/`metadata.liveUrl`/`featured` para a ordenação da home). O **conteúdo
   rico dos cases (TSX/ReactNode) continua local** — não é serializável pela
   API (decisão do ADR 0011). O hub é a fonte da verdade da _lista_; o
   portfolio continua sendo a fonte do _conteúdo detalhado_.
5. **Cache/ISR** — blog e lista de projetos passam a `revalidate = 300` (5 min)
   em vez de estático puro, para refletir posts novos sem redeploy. O build
   continua funcionando sem o hub (fallback fs → mesmos 10 posts locais).

## Mudanças por arquivo (portfolio-ui)

| #   | Arquivo                                               | Mudança                                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/lib/hub.ts` (novo)                               | Cliente mínimo do hub: `hubFetch<T>(path, revalidate)` com timeout curto (2s), `HUB_API_URL`, e `unwrap` do envelope `{success,data}`. Retorna `null` em qualquer falha (o caller decide o fallback).                                                                                                      |
| 2   | `src/types/hub.ts` (novo)                             | Tipos das respostas usadas: `HubPost` (slug/title/summary/date/tags/readingTime), `HubProject` (slug/name/description/repoUrl/tags/status/featured/metadata).                                                                                                                                              |
| 3   | `src/lib/blog.ts`                                     | `getAllPosts`/`getPostBySlug`/`getRecentPosts` viram async: tentam `/posts` (e `/posts/:slug`), mapeiam `HubPost` → `BlogPost` (content do detail; lista usa summary), fallback para o parse `fs` atual em qualquer falha. `sortByDate` continua no fallback.                                              |
| 4   | `src/app/blog/page.tsx`                               | Componente vira `async`; `const posts = await getAllPosts()`.                                                                                                                                                                                                                                              |
| 5   | `src/app/blog/[slug]/page.tsx`                        | `generateStaticParams` async; `getPostBySlug`/`getAllPosts` com await; `export const revalidate = 300`.                                                                                                                                                                                                    |
| 6   | `src/lib/project-cases.ts`                            | Nova `getPortfolioCards(): Promise<ProjectCard[]>` que tenta `/projects?surface=portfolio&pageSize=100` e mapeia para `ProjectCard` (accent por `metadata.kind`, techs via `tags`, `link` via `metadata.liveUrl ?? /projetos/<id>`); fallback = `PROJECT_CASES.map(c => c.card)` (ordem atual preservada). |
| 7   | `src/components/ui/ProjectsClient.tsx`                | Recebe os cards via props async da página (`src/app/projetos/page.tsx` vira async e injeta `await getPortfolioCards()`), mantendo filtros/ordenação client-side atuais.                                                                                                                                    |
| 8   | `.env.example` + README                               | `HUB_API_URL` documentado (dev: `http://localhost:11020/api/v1`; prod/VPS: URL pública do hub).                                                                                                                                                                                                            |
| 9   | `src/lib/__tests__/blog.test.ts` + novo `hub.test.ts` | Testes do mapeamento HubPost→BlogPost e do fallback (fetch mockado falhando → fs). Vitest já configurado.                                                                                                                                                                                                  |

## O que NÃO muda

- Os 13 case studies TSX (`src/lib/projects/*`) — conteúdo rico permanece
  local; o hub só alimenta a lista/cards.
- `github.ts` (GitHub API), SEO/JSON-LD, design system, easter-egg.
- O hub-unificando — nenhum endpoint novo é necessário para esta fase.

## Ordem de implementação

1. `hub.ts` + `types/hub.ts` + testes (cliente puro, sem consumidores).
2. `blog.ts` async + fallback + ajuste das 2 páginas + testes.
3. `project-cases.ts` (getPortfolioCards) + ProjectsClient/projetos page.
4. `.env.example`/README + `revalidate = 300`.
5. Validação: `npm run build` com hub LIGADO (posts do hub) e DESLIGADO
   (fallback fs, mesmo output), `npm run test` (vitest), smoke visual das
   páginas `/blog`, `/blog/<slug>`, `/projetos`.

## Critérios de aceite

- Com o hub no ar: `/blog` lista os posts **do hub** (mesmos 10; um post novo
  no hub aparece após o revalidate sem redeploy).
- Com o hub fora: build e páginas funcionam idênticos ao estado atual (fs).
- `/projetos` lista os 13 cards vindos de `?surface=portfolio`, com fallback
  local idêntico ao atual.
- Nenhum segredo no cliente: `HUB_API_URL` é server-side only (sem `NEXT_PUBLIC_`).

## Riscos / notas

- **Build do Docker**: o estágio builder faz `npm run build` — com fallback
  por chamada, a ausência do hub no build não quebra (só usa fs).
- **Slug drift**: o slug do post no hub = basename do `.md` — igual ao slug
  local; se um post existir no hub mas não no fs (ou vice-versa), a fonte
  ativa define o que aparece (comportamento aceito; o sync-docs mantém os
  dois alinhados).
- **`content` do post**: a API devolve a reconstrução por chunks
  (`join('\n\n')`) — para o blog renderizado, avaliar usar o `summary` na
  lista e o `content` no detail; se a reconstrução por chunks introduzir
  artefatos visuais, alternativa: adicionar `?full=1` no hub servindo o
  arquivo inteiro (pequena extensão futura do ADR 0011).
