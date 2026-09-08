# Portfolio UI — Arquitetura e Documentação

> Portfólio pessoal de **Renato Bezerra**, Engenheiro de Software.
> Stack: Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4

---

## 1. Visão Geral

### Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js | 16.1.6 |
| Runtime | React | 19.2.3 |
| Language | TypeScript | 5 |
| Estilos | Tailwind CSS | 4 |
| Animações | Framer Motion + GSAP | 12.x / 3.x |
| Smooth Scroll | Lenis | 1.3.17 |
| Deploy | Docker (standalone) | node:22-alpine |

### Princípios

- **SSG puro** — todas as páginas são geradas estaticamente em build time
- **Zero back-end** — sem API routes, sem database, sem CMS
- **Dados centralizados** — todo conteúdo vive em `src/lib/` como TypeScript
- **Conteúdo em markdown** — blog posts em `.md` com frontmatter
- **Acessibilidade** — skip-to-content, prefers-reduced-motion, ARIA labels, semântica HTML
- **SEO** — Open Graph, Twitter Cards, JSON-LD, sitemap.xml, robots.txt

---

## 2. Estrutura de Diretórios

```
src/
├── app/                    # Next.js App Router (páginas + API)
│   ├── blog/
│   ├── certificacoes/
│   ├── contato/
│   ├── curriculo/
│   ├── links/
│   ├── projetos/
│   ├── globals.css
│   ├── layout.tsx          # Root layout
│   ├── manifest.ts
│   ├── not-found.tsx
│   ├── page.tsx            # Home
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── blog/               # BlogCard
│   ├── fx/                 # Efeitos visuais (animação, scroll, partículas)
│   ├── home/               # Seções da página inicial
│   ├── layout/             # LayoutWrapper, ProjectTemplate
│   ├── projects/           # Galerias específicas de projetos
│   ├── seo/                # JSON-LD
│   └── ui/                 # Componentes atômicos (Button, Card, Tag, etc.)
├── content/
│   └── blog/               # Posts em markdown (.md com frontmatter)
├── hooks/
│   └── useActiveNavLink.ts
├── lib/
│   ├── projects/           # Definições de cada case de projeto
│   ├── articles.ts
│   ├── blog.ts             # Leitor de markdown (gray-matter)
│   ├── constants.ts        # Perfil + redes sociais
│   ├── easter-egg.ts
│   ├── education.ts        # Formação + certificações
│   ├── experience.tsx      # Experiência profissional
│   ├── project-cases.tsx   # Registry de projetos
│   ├── projects.ts         # Mapeamento para cards
│   ├── seo.ts              # buildMetadata()
│   ├── structured-data.ts  # JSON-LD generators
│   └── utils.ts            # cn()
├── styles/
│   └── tokens.css          # CSS custom properties (tema claro/escuro)
└── types/
    ├── blog.ts
    └── project.ts
```

---

## 3. Arquitetura

### Geração de Páginas (SSG)

Todas as páginas são **estáticas** (`output: "standalone"`):

```
Páginas estáticas comuns:  /, /blog, /certificacoes, /contato, /curriculo, /projetos
Páginas SSG com params:    /blog/[slug], /projetos/[...slug]
```

- Rotas dinâmicas usam `generateStaticParams()` para definir os slugs em build time
- `dynamicParams = false` — URLs não previstas retornam 404
- Isso garante performance máxima e deploy sem servidor

### Fluxo de Dados

```
dados-fonte (src/lib/) → componentes (server components) → HTML estático
                                      ↕
                           src/content/blog/ (markdown)
                                      ↕
                           src/lib/blog.ts (gray-matter parse)
```

- Não há fetching em runtime
- Não há estado global complexo
- Componentes "use client" só para interatividade (animações, menu, comando palette)

### Tema (claro/escuro)

- Gerenciado por `next-themes` com `attribute: "class"`
- Tokens CSS em `src/styles/tokens.css` com `:root` (light) e `.dark` (dark)
- Tailwind mapeia os tokens via `@theme` em `globals.css`
- Componentes usam classes como `bg-bg`, `text-text`, `border-border`

---

## 4. Rotas e Páginas

| Rota | Arquivo | Tipo | Conteúdo |
|------|---------|------|----------|
| `/` | `page.tsx` | Static | Hero + Sobre + Diferenciais + Contato (snap scroll) |
| `/blog` | `blog/page.tsx` | Static | Listagem com post em destaque + grid |
| `/blog/[slug]` | `blog/[slug]/page.tsx` | SSG | Post com markdown, barra de progresso, compartilhar |
| `/certificacoes` | `certificacoes/page.tsx` | Static | Formação acadêmica + certificações |
| `/contato` | `contato/page.tsx` | Static | Cards de contato (WhatsApp, LinkedIn, GitHub, email) |
| `/curriculo` | `curriculo/page.tsx` | Static | Timeline de experiência + educação + PDF download |
| `/links` | `links/page.tsx` | Static | Página "link in bio" (sem chrome do site) |
| `/projetos` | `projetos/page.tsx` | Static | Grid de projetos com destaque |
| `/projetos/[...slug]` | `projetos/[...slug]/page.tsx` | SSG | Detalhe do projeto com template |
| `/projetos/unificando` | `projetos/unificando/page.tsx` | Static | Redirect → `/projetos/unificando/automacao` |
| 404 | `not-found.tsx` | Static | Página personalizada |

### Rotas API (arquivos de configuração)

| Rota | Arquivo | Tipo |
|------|---------|------|
| `/sitemap.xml` | `sitemap.ts` | Dinâmico (build) |
| `/robots.txt` | `robots.ts` | Dinâmico (build) |
| `/manifest.webmanifest` | `manifest.ts` | Dinâmico (build) |

---

## 5. Componentes

### Hierarquia do Layout

```
<html>
  <body>
    <Scripts /> (Google Analytics)
    <ThemeProvider>
      <EasterEgg />
      <LayoutWrapper>
        <Header />         ← Fixed top, z-50, backdrop-blur
        <main>             ← id="main-content"
          {children}       ← Conteúdo da página
        </main>
        <Footer />
      </LayoutWrapper>
      <CommandPalette />   ← Floating button bottom-right
    </ThemeProvider>
  </body>
</html>
```

O chrome (Header + Footer) é ocultado na rota `/links`.

### Componentes Globais

| Componente | Descrição |
|-----------|-----------|
| `LayoutWrapper` | Gerencia Header, Footer, IntroLoader, SmoothScroll, skip-to-content |
| `CommandPalette` | Cmd+K palette com navegação, tema, download currículo |
| `ThemeToggle` | Alterna tema claro/escuro |
| `ScrollReveal` | Animação de entrada ao scroll (Framer Motion) |
| `SplitText` | Animação de texto caractere-por-caractere (GSAP) |
| `SmoothScroll` | Scroll suave Lenis + ScrollTrigger (desligado na home) |
| `IntroLoader` | Animação de entrada "Renato Bezerra" |

### Componentes de Página (Home)

A home usa **snap scroll** com 4 slides:

| Slide | Componente | Conteúdo |
|-------|-----------|----------|
| 1 | `HeroSection` | Nome, título, stats, foto, ParticleField |
| 2 | `AboutSection` | "Sobre mim", experiencia, formação, PCD note |
| 3 | `DifferentialsSection` | 3 diferenciais (Front-end, IA, Produto) |
| 4 | `ContactSection` | CTA WhatsApp + outras formas de contato |

---

## 6. Camada de Dados

### src/lib/constants.ts — Perfil e Redes

```typescript
PROFILE.name        // "Renato Bezerra"
PROFILE.fullName    // "Renato Bezerra Gomes da Silva Junior"
PROFILE.title       // Cargo/título exibido no site
PROFILE.summary     // Resumo profissional (SEO + about)
PROFILE.pcdNote     // Nota sobre PCD

SOCIALS.personal    // LinkedIn, GitHub, Instagram, Email, WhatsApp, Site
SOCIALS.barraco     // Redes do projeto Seu Barraco Esperto
SOCIALS.unificando  // Redes do projeto Unificando
SOCIALS.oferticando // Redes do projeto Oferticando
```

### src/lib/experience.tsx — Experiência

```typescript
EXPERIENCES: Array<{
  company: string;
  role: string;
  period: string;
  responsibilities: ReactNode[];  // JSX (permite <strong>)
}>
```

7 entradas: Unificando, CESAR, Avanade (Pleno), Avanade (Junior), MV, Iterpe, CPRH.

### src/lib/education.ts — Formação

```typescript
EDUCATIONS: Array<{ institution, degree, period }>   // 2 entradas
CERTIFICATIONS: Array<{ name, issuer?, year? }>      // 2 entradas
```

### src/lib/blog.ts — Blog

Lê arquivos `.md` de `src/content/blog/` usando `gray-matter`.

```typescript
getAllPosts(): BlogPost[]     // Todos os posts, ordenados por data
getPostBySlug(slug): BlogPost | null
getRecentPosts(count): BlogPost[]
```

**Frontmatter esperado** nos `.md`:
```yaml
---
title: "Título do Post"
description: "Resumo para SEO e cards"
date: "2026-03-15"
tags:
  - Tag1
  - Tag2
readingTime: "3 min"  # Opcional — calculado automaticamente
---
```

### src/lib/project-cases.tsx — Projetos

Registra 9 projetos com dados completos (descrição, features, tech stack, links, JSON-LD).

```typescript
PROJECT_CASES: ProjectCase[]
getProjectCaseByPath(segments: string[]): ProjectCase
```

Cada projeto tem uma `accent` que define a cor: `"ia"` (roxo), `"tech"` (azul), `"barraco"` (laranja).

### Tipos

**src/types/blog.ts:**
```typescript
BlogPost { slug, title, description, date, tags, content, readingTime }
```

**src/types/project.ts:**
```typescript
ProjectCard, ProjectDetails, ProjectCase, ProjectFeature,
ProjectExtraSection, SidebarTechStack, SidebarExtraCard,
ProjectBreadcrumb, ProjectJsonLdData
```

---

## 7. Sistema de Estilos

### Tailwind CSS v4 (CSS-first)

Diferente do Tailwind v3 (arquivo `tailwind.config.js`), a v4 usa um arquivo CSS com diretiva `@theme` para definir tokens:

```css
/* globals.css */
@import "tailwindcss";
@import "../styles/tokens.css";

@theme {
  --color-bg: var(--bg);
  --color-tech: var(--accent-tech);
  --color-ia: var(--accent-ia);
  --color-barraco: var(--accent-barraco);
  --font-display: "Space Grotesk", sans-serif;
  --font-body: "Inter", sans-serif;
}
```

### Tokens Disponíveis

| Classe Tailwind | CSS Variable | Light | Dark |
|----------------|-------------|-------|------|
| `bg-bg` | `--bg` | `#FFFFFF` | `#0A0A0A` |
| `bg-surface-1` | `--surface-1` | `#F5F5F5` | `#141414` |
| `bg-surface-2` | `--surface-2` | `#F9F9F9` | `#1A1A1A` |
| `border-border` | `--border` | `#E5E5E5` | `#262626` |
| `text-text` | `--text` | `#111111` | `#F5F5F5` |
| `text-text-secondary` | `--text-2` | `#666666` | `#A3A3A3` |
| `text-muted` | `--muted` | `#777777` | `#737373` |
| `text-tech` / `border-tech` | `--accent-tech` | `#1D4ED8` | `#1D4ED8` |
| `text-ia` / `border-ia` | `--accent-ia` | `#6D28D9` | `#6D28D9` |
| `text-barraco` / `border-barraco` | `--accent-barraco` | `#EA580C` | `#EA580C` |

### Component Classes (globals.css)

```css
.section-wrapper   /* padding, border-top para seções */
.section-title     /* Heading de seção (text-3xl lg:text-5xl) */
.section-label     /* Label "POR QUE EU?" uppercase */
.project-card      /* Card de projeto */
.tag-pill          /* Tag pill */
.blog-content      /* Tipografia para markdown (h2-h4, p, code, pre, blockquote, table, img) */
```

### Fontes

- **Display**: Space Grotesk (`--font-space`) — títulos, headings
- **Body**: Inter (`--font-body`) — textos corridos
- Ambas carregadas via `next/font` com `display: swap`

---

## 8. SEO & Metadados

### buildMetadata() — src/lib/seo.ts

Função centralizada que gera metadados para todas as páginas:

```typescript
buildMetadata({
  title?: string;        // "Título | Renato Bezerra"
  description?: string;  // Fallback: PROFILE.summary
  path?: string;         // Caminho da URL
  ogImage?: string;      // Padrão: /og-image.jpg
  noIndex?: boolean;     // Para páginas não-indexáveis
}): Metadata
```

### Structured Data (JSON-LD)

Gerado por `src/lib/structured-data.ts`:

| Tipo | Função | Onde é usado |
|------|--------|-------------|
| `Person` | `personJsonLd()` | Home |
| `WebSite` | `websiteJsonLd()` | Home |
| `Organization` | `organizationJsonLd()` | Projetos Unificando |
| `Service` | `serviceJsonLd()` | Projetos Seu Barraco |
| `CreativeWork` | `projectJsonLd()` | Cada projeto individual |
| `BreadcrumbList` | `breadcrumbJsonLd()` | Páginas internas |

### Sitemap

`src/app/sitemap.ts` gera dinamicamente todas as URLs:
- Rotas estáticas: `/`, `/blog`, `/projetos`, `/curriculo`, `/contato`, `/links`, `/certificacoes`
- Rotas de projetos: todos os slugs de `PROJECTS`
- Rotas de blog: todos os slugs de `getAllPosts()`

---

## 9. Deploy (Docker)

### Dockerfile

Multi-stage build com `node:22-alpine`:

1. **Stage 1 (deps)**: `npm ci` — dependências exatas
2. **Stage 2 (builder)**: `npm run build` — compilação
3. **Stage 3 (runner)**: `node server.js` — standalone, non-root user `nextjs`, porta 3100

### docker-compose.yml

```yaml
services:
  portfolio:
    build: .
    ports: ["127.0.0.1:3100:3100"]
    restart: always
    read_only: true
    security_opt: [no-new-privileges: true]
    cap_drop: [ALL]
    tmpfs: [/tmp, /app/.next/cache]
```

---

## 10. Adicionar Novo Conteúdo

### Novo Post no Blog

1. Criar `src/content/blog/meu-post.md` com frontmatter:
   ```markdown
   ---
   title: "Título do Post"
   description: "Resumo para SEO"
   date: "2026-07-16"
   tags:
     - Tag1
     - Tag2
   ---
   
   Conteúdo do post em markdown...
   ```
2. O build gera automaticamente as páginas via `generateStaticParams`

### Nova Experiência

Editar `src/lib/experience.tsx` — adicionar ao array `EXPERIENCES`.

### Nova Certificação

Editar `src/lib/education.ts` — adicionar ao array `CERTIFICATIONS`.

### Novo Projeto

1. Criar `src/lib/projects/meu-projeto.tsx` com `ProjectCase`
2. Importar e adicionar ao array `PROJECT_CASES` em `src/lib/project-cases.tsx`
3. O build gera automaticamente a rota `/projetos/meu-projeto`

---

## 11. Dependências Principais

| Pacote | Para que serve |
|--------|---------------|
| `next` | Framework React com SSG e App Router |
| `framer-motion` | Animações declarativas (ScrollReveal, IntroLoader, menu) |
| `gsap` | Animações avançadas (SplitText, snap scroll) |
| `lenis` | Smooth scroll engine |
| `gray-matter` | Parse de frontmatter em markdown |
| `react-markdown` | Renderização de markdown como React |
| `rehype-highlight` | Syntax highlighting em code blocks |
| `next-themes` | Tema claro/escuro |
| `cmdk` | Command palette (Cmd+K) |
| `lucide-react` | Ícones |
| `three` / `@react-three/fiber` | 3D (HeroScene — descontinuado) |

---

## 12. Convenções e Padrões

- **Naming**: PascalCase para componentes, camelCase para funções/utilities
- **Imports**: Use `@/` alias para imports absolutos
- **Componentes**: Prefira server components. Use `"use client"` só quando necessário
- **Estilos**: Tailwind utility classes + tokens CSS. Evite CSS modules
- **Animações**: Framer Motion para interações de UI, GSAP para animações orientadas a scroll
- **Dados**: Centralizados em `src/lib/`. Nunca duplicar dados entre arquivos
- **Tipos**: Em `src/types/`. Tipos de dados de lib em seus próprios arquivos
