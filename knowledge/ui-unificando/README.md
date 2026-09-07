# Unificando UI

Interface front-end do site institucional **Unificando — Laboratório de Projetos Autorais & IA** (`unificando.com.br`). Desenvolvida com foco em performance, acessibilidade e boas práticas de arquitetura.

> Documentação completa em [`docs/`](./docs/README.md).

## 🚀 Tech Stack

- **Core**: React 19.2+, TypeScript 5.8+ (strict)
- **Build Tool**: Vite 6.2+ (dev server na porta 11004)
- **Styling**: Tailwind CSS v4 (CSS-first, via `@tailwindcss/postcss` — sem `tailwind.config.js`)
- **Animation**: Framer Motion 12+
- **Routing**: react-router-dom 7 (lazy loading por página)
- **SEO**: react-helmet-async
- **Runtime**: Node.js ≥ 22

## 📂 Estrutura do Projeto

```
src/
├── components/      # UI transversal (common/), layout (Header/Footer) e contact/ (ContactForm)
├── features/        # Seções por feature (home/, method/)
├── pages/           # Páginas (uma por rota, lazy)
├── router/          # AppRouter: lazy + Suspense + AnimatePresence
├── routes.ts        # Constante ROUTES (fonte única dos caminhos)
├── hooks/           # Lógica reutilizável (validação, menu)
├── utils/           # Funções puras (analytics, validators)
├── data/            # Conteúdo centralizado (capacidades, P&D)
├── constants/       # Constantes de marca (social, devtools, backgrounds)
├── types/           # Tipos TypeScript compartilhados
├── App.tsx          # Layout + Router + scroll-to-top
├── index.tsx        # Entry point (providers)
└── index.css        # Tailwind import + Inter + smooth scroll
```

## 📚 Documentação

Cada arquivo em [`docs/`](./docs/README.md) documenta um assunto do projeto:

| Documento | Assunto |
| --------- | ------- |
| [design-system.md](./docs/design-system.md) | Padrões visuais (Neo-Brutalismo, paleta, componentes, mídia) |
| [architecture.md](./docs/architecture.md) | Arquitetura, rotas e fluxo de dados |
| [seo.md](./docs/seo.md) | SEO, sitemap, JSON-LD, AI crawlers |
| [build-and-deploy.md](./docs/build-and-deploy.md) | Build, Docker e Nginx |
| [testing.md](./docs/testing.md) | Testes com `node --test` |
| [data-and-content.md](./docs/data-and-content.md) | Onde editar cada conteúdo |
| [workflow.md](./docs/workflow.md) | Gates de qualidade e convenções |

## 🛠️ Instalação e Uso

### Pré-requisitos

- Node.js ≥ 22 (ver `.nvmrc`)
- npm

### Passo a Passo

1. **Instalar dependências**

   ```bash
   npm install
   ```

2. **Rodar servidor de desenvolvimento**

   ```bash
   npm run dev
   ```
   Acesse em: `http://localhost:11004`

3. **Gerar build de produção** (regenera o `sitemap.xml` antes do `vite build`)

   ```bash
   npm run build
   ```

4. **Visualizar build**

   ```bash
   npm run preview
   ```

### Scripts

| Script | Descrição |
| ------ | --------- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `node scripts/generate-sitemap.js && vite build` |
| `npm run preview` | Serve o build localmente |
| `npm run sitemap` | Regenera `public/sitemap.xml` |
| `npm test` | Testes (Node nativo, `node --test`) |
| `npm run lint` | ESLint (flat config) |

## 📐 Padrões de Código

- **Strict TypeScript**: `strict: true`, type-check via `npx tsc --noEmit`.
- **Separation of Concerns**: componentes de apresentação separados de dados/lógica.
- **Composition**: preferência por composição sobre herança.
- **Imports**: alias `@/` apontando para `src/`.
- **Conteúdo**: centralizado em `data/` e `constants/`.
- **Gates**: `npm run lint` + `npx tsc --noEmit` + `npm test` + `npm run build` verdes antes de concluir.

## 🎨 Design & UI

Design **Neo-Brutalista** (contraste preto/neon, bordas retas, sombras hard) com **Framer Motion** para transições entre páginas e micro-interações. Referência completa em [`docs/design-system.md`](./docs/design-system.md).

---

© 2026 Unificando. Crafted for results.