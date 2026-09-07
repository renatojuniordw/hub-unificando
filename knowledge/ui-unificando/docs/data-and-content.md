# Dados e Conteúdo — Unificando UI

> Onde cada conteúdo do site vive e como editá-lo. Guia de "o que aparece na página → qual arquivo mudar".

---

## 1. Princípio

O site separa **conteúdo** (dados) de **apresentação** (componentes). Texto, listas e links de produto ficam em arquivos de dados/constantes (`src/data/`, `src/constants/`); os componentes apenas renderizam. Para editar copy ou listas, quase sempre basta alterar um arquivo de dados — sem tocar no JSX.

---

## 2. Mapa: onde editar cada conteúdo

| O que aparece | Onde editar | Consumido por |
| ------------- | ----------- | ------------- |
| Capacidades do laboratório (6 itens com ícone/tag/título/descrição) | `src/data/capabilities.ts` → `LAB_CAPABILITIES` | `src/pages/Laboratory.tsx` (grid) |
| Capacidades resumidas da Home | `src/data/capabilities.ts` → `HOME_CAPABILITIES` | `src/features/home/components/CapabilitiesSection.tsx` |
| Áreas de P&D (4 itens) | `src/data/capabilities.ts` → `LAB_PD_AREAS` | `src/pages/Laboratory.tsx` |
| Módulos de Soluções | `src/data/capabilities.ts` → `SOLUTIONS_MODULES` | `src/features/home/components/SolutionsSection.tsx` |
| Projetos (ProjectCard da Home) | `src/features/home/components/ProjectsSection.tsx` (ou `ProjectCard` — ver seção 4) | `src/pages/Home.tsx` |
| DevTools npm (`prompts-unificando`, `promptcraft-unificando`) | `src/constants/devtools.ts` → `DEVTOOLS` | `src/features/home/components/DevToolsSection.tsx` |
| Servidores abertos (`MCP Med Unificando`) | `src/constants/devtools.ts` → `OPEN_SERVERS` | `DevToolsSection` |
| WhatsApp / Instagram (número, handles) | `src/constants/social.ts` → `CONTACT_INFO`, `SOCIAL_LINKS` | Header? Footer, WhatsAppFloating, ContactForm, LinksPage |
| Overlay de ruído (textura) | `src/constants/backgrounds.ts` → `NOISE_BACKGROUND` | Hero, CTA, Laboratory |
| Rotas e caminhos | `src/routes.ts` → `ROUTES` | todo o app (navegação, SEO, sitemap indireto) |
| Texto de navegação (Início/Laboratório/Método/Sobre) | `src/components/layout/Layout.tsx` → `navItems` | `Header` |
| Texto do SEO/JSON-LD de cada página | `<SEO ... />` em cada `src/pages/*.tsx` | — |
| `public/llms.txt` (resumo p/ LLMs) | `public/llms.txt` | AI crawlers |
| `public/robots.txt`, `public/sitemap.xml` (gerado), `public/manifest.json` | arquivos estáticos + `scripts/generate-sitemap.js` | crawlers/PWA |

---

## 3. Dados centralizados em detalhe

### `src/data/capabilities.ts`

Define o tipo local `Capability` (`icon?`, `tag?`, `title`, `description`) e exporta:

- `LAB_CAPABILITIES` — 6 capacidades (IA Aplicada, Produtos Utilitários, Automação & Integrações, Desenvolvimento Web, Dados & Privacidade, Experimentação), cada uma com tag numerada ("01 • IA APLICADA"...).
- `HOME_CAPABILITIES` — versão resumida de 3 itens para a Home.
- `LAB_PD_AREAS` — 4 frentes de P&D ("Busca semântica 100% local", "Robustez contra prompt injection", "MCP + fontes oficiais", "Engenharia de custo de IA").
- `SOLUTIONS_MODULES` (tipo `SolutionModule`) — 2 módulos com `to: ROUTES.LAB`.

Os comentários do arquivo reforçam: "Laboratory, Home e Solutions consomem estas coleções para evitar dados duplicados espalhados entre componentes."

### `src/constants/devtools.ts`

- `DEVTOOLS: ProjectCardData[]` — cards dos pacotes npm (`prompts-unificando`, `promptcraft-unificando`) com `status: "No ar"`, `statusColor: "bg-green-500"`, link e tags.
- `OPEN_SERVERS: ProjectCardData[]` — `MCP Med Unificando` (link `https://med.unificando.com.br/mcp`).
- O tipo `ProjectCardData` vem de `src/features/home/components/ProjectCard.tsx`.

### `src/constants/social.ts`

- `CONTACT_INFO.whatsappNumber = "5581995557302"` — **fonte única** do número.
- `SOCIAL_LINKS.whatsapp = "https://wa.me/5581995557302"` e `SOCIAL_LINKS.instagram = "https://instagram.com/unificando.digital"`.

### `src/constants/backgrounds.ts`

- `NOISE_BACKGROUND` — data-URI SVG de ruído (`feTurbulence fractalNoise`) usado com `mix-blend-overlay` em Hero, CTA e Laboratory.

---

## 4. Projetos em destaque (Home)

Os **ProjectCards** da Home (ex.: "PDF Unificando", "Med Unificando", "Radar Unificando") são renderizados pela `ProjectsSection` com o `ProjectCard`. Os dados atuais dos projetos (título, descrição, link para subdomínio, status) estão no JSX da `ProjectsSection.tsx` (não centralizados em `data/` até o momento da escrita deste doc) — **confira o arquivo** ao editar o portfólio. A fonte de verdade de posicionamento dos produtos também está em `public/llms.txt`.

> Dica: se o portfólio crescer, mover os dados dos cards para `src/data/` seguindo o padrão de `capabilities.ts` seria a evolução natural (decisão de arquitetura — ver `docs/workflow.md`).

---

## 5. Produtos e Contatos (fonte de verdade)

### Produtos (subdomínios)

| Produto | URL | Descrição (fonte: `llms.txt`) |
| ------- | --- | ----------------------------- |
| PDF Unificando | https://pdf.unificando.com.br | Suíte de 16 ferramentas PDF gratuitas com processamento efêmero — privacidade por design, sem cadastro |
| Med Unificando | https://med.unificando.com.br | Busca semântica em linguagem natural sobre medicamentos intercambiáveis da ANVISA, embeddings 100% locais (ONNX), preços CMED |
| Radar Unificando | https://radar.unificando.com.br | Busca de vagas em tempo real (Gupy via MCP + InHire) com assistente de carreira IA: score ATS, currículo adaptado, recomendação de cursos |

> Os subdomínios **não** aparecem no `sitemap.xml` do site institucional (possuem sitemaps próprios); aparecem em `llms.txt` e no conteúdo das páginas.

### DevTools (npm)

- `prompts-unificando` — biblioteca de prompts padronizados (auditoria, refatoração, testes, LGPD, SEO), via `npx`, agnóstica de stack/LLM.
- `promptcraft-unificando` — CLI que transforma ideias cruas em prompts de engenharia, com pipe para Claude Code e Gemini CLI.

### Contatos

- WhatsApp: `wa.me/5581995557302` (fonte única em `src/constants/social.ts`).
- Email: `contato@unificando.com.br` (aparece em `llms.txt` e páginas legais).
- Instagram: `@unificando.digital`.

---

## 6. Fluxo para editar conteúdo

1. Localize o conteúdo no mapa da seção 2.
2. Edite só o arquivo de dados/constante (valores, texto, links).
3. Se mudou rotas/listas, confira SEO (`docs/seo.md`) e sitemap.
4. Rode `npm run build` (regenera sitemap) e revise visualmente (`npm run dev`).

---

## 7. Links Relacionados

- [`architecture.md`](./architecture.md) — fluxo de dados e organograma de `src/`
- [`design-system.md`](./design-system.md) — como formatar visualmente novos cards/badges
- [`seo.md`](./seo.md) — `llms.txt`, sitemap e SEO por página