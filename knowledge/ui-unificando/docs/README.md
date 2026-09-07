# Documentação — Unificando UI

Documentação técnica e de produto do site institucional **Unificando — Laboratório de Projetos Autorais & IA** (`unificando.com.br`).

Tecnologias: React 19 · TypeScript 5.8 (strict) · Vite 6 · Tailwind CSS v4 (CSS-first) · Framer Motion · react-router-dom 7 · react-helmet-async · Node ≥ 22.

## Índice

| Documento | Assunto |
| --------- | ------- |
| [`design-system.md`](./design-system.md) | Filosofia Neo-Brutalista, paleta, tipografia, sombras, componentes reais, animações, mobile, regras anti-clichê e divergências conhecidas |
| [`architecture.md`](./architecture.md) | Stack, estrutura de `src/`, roteamento (lazy + AnimatePresence), fluxo de dados e padrões técnicos |
| [`seo.md`](./seo.md) | Componente `SEO`, JSON-LD por página, Open Graph, AI crawlers, `robots.txt`, `llms.txt`, sitemap |
| [`build-and-deploy.md`](./build-and-deploy.md) | Requisitos, scripts, configs (vite/tsconfig/postcss/eslint), build, Docker, nginx, variáveis de ambiente |
| [`testing.md`](./testing.md) | Runner nativo `node --test`, arquivos de teste, cobertura e como adicionar testes |
| [`data-and-content.md`](./data-and-content.md) | Onde editar cada conteúdo (capacidades, devtools, social, produtos, contatos) |
| [`workflow.md`](./workflow.md) | Gates de qualidade, convenções de git, contratos `prompts-unificando`, `.refactor/`, backlog |

## Convenções

- **Idioma:** documentação em pt-BR.
- **Fonte canônica:** `docs/` é a fonte da verdade da documentação; o `README.md` da raiz aponta para cá.
- **Código como fonte da verdade:** se um doc divergir do código, o código vence — atualize o doc.
- **Links:** relativos entre arquivos (como acima).

## Ordem sugerida de leitura

1. [`architecture.md`](./architecture.md) — como o site é montado
2. [`design-system.md`](./design-system.md) — como ele se parece
3. [`seo.md`](./seo.md) · [`build-and-deploy.md`](./build-and-deploy.md) · [`testing.md`](./testing.md) — operação
4. [`data-and-content.md`](./data-and-content.md) · [`workflow.md`](./workflow.md) — manutenção de conteúdo e processo