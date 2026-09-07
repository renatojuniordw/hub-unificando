# Arquitetura — Unificando UI

> Visão geral da arquitetura do site institucional **Unificando — Laboratório de Projetos Autorais & IA** (`unificando.com.br`). Cobre stack, estrutura de `src/`, roteamento, fluxo de dados e decisões técnicas.

---

## 1. Visão Geral

Aplicação **SPA (Single Page Application)** construída com **Vite 6 + React 19 + TypeScript 5.8 (strict)** e estilizada com **Tailwind CSS v4** (CSS-first, sem `tailwind.config`). Animações com **Framer Motion 12**; navegação com **react-router-dom 7**; gestão de metadados/SEO com **react-helmet-async**. Não há backend próprio — o site é estático e o "backend" é o próprio WhatsApp (formulário de contato redireciona para `wa.me`).

### Stack de entrada (`src/index.tsx`)

A ordem dos provedores define o ciclo de vida da árvore React:

```tsx
<React.StrictMode>
  <ErrorBoundary>        {/* captura erros de render de toda a árvore */}
    <HelmetProvider>     {/* API de <head> por página (SEO) */}
      <BrowserRouter>    {/* roteamento client-side */}
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </ErrorBoundary>
</React.StrictMode>
```

### `src/App.tsx`

- Monta `Layout` (Header fixo + `<main>` com `pt-20` + Footer + WhatsAppFloating) envolvendo `AppRouter`.
- Faz **scroll-to-top** em toda mudança de rota (`useEffect` em `location.pathname` → `window.scrollTo(0, 0)`).

---

## 2. Estrutura de `src/`

| Caminho | Propósito |
| ------- | --------- |
| `src/index.tsx` | Entry point (providers). |
| `src/App.tsx` | Componente raiz: Layout + Router + scroll-to-top. |
| `src/routes.ts` | Constante `ROUTES` — fonte única dos caminhos. |
| `src/router/index.tsx` | `AppRouter`: lazy loading, Suspense, AnimatePresence, tabela de rotas. |
| `src/index.css` | Único CSS global: `@import "tailwindcss"`, Inter, smooth scroll. |
| `src/components/common/` | Componentes transversais: `SEO`, `CtaButton`, `Modal`, `PageTransition`, `ErrorBoundary`, `LoadingFallback`, `WhatsAppFloating`, `icons/WhatsAppIcon`. |
| `src/components/layout/` | `Layout`, `Header`, `Footer` (estrutura global). |
| `src/components/contact/` | `ContactForm` (formulário de contato + validação + envio WhatsApp). |
| `src/features/home/components/` | Seções da Home: `HeroSection`, `ProjectsSection`, `ProjectCard`, `DevToolsSection`, `RoadmapSection`, `CapabilitiesSection`, `SolutionsSection`, `JourneySection`, `CtaSection`. |
| `src/features/method/components/` | `MethodPhase` (timeline das fases do método). |
| `src/pages/` | Páginas (uma por rota): `Home`, `Laboratory`, `HowItWorks`, `About`, `Contact`, `PrivacyPolicy`, `TermsOfService`, `LinksPage`, `NotFound`. |
| `src/hooks/` | `useContactValidation`, `useHeaderMenu` (+ testes). |
| `src/utils/` | `analytics.ts`, `validators.ts` (+ testes). |
| `src/data/` | Dados centralizados de capacidades/P&D (`capabilities.ts`). |
| `src/constants/` | `devtools.ts`, `social.ts`, `backgrounds.ts` (conteúdo estático e constantes de marca). |
| `src/types/` | Tipos compartilhados: `index.ts` (re-export), `layout.ts`, `ui.ts`, `contact.ts`, `form.ts`. |
| `src/assets/img/` | `LOGO_UNIFICANDO.svg`. |
| `src/vite-env.d.ts` | Tipagem de `import.meta.env` (declara `VITE_SITE_URL`). |

**Padrão de organização:** as páginas orquestram **features** (seções em `src/features/<feature>/components/`), que consomem **dados/constantes** e usam **componentes comuns**. Lógica reaproveitável vive em `hooks/` e `utils/`; contrato de dados em `types/`.

---

## 3. Roteamento

### 3.1 Rotas (`src/routes.ts`)

```ts
export const ROUTES = {
  HOME: "/",
  LAB: "/laboratorio",
  HOW_IT_WORKS: "/metodo-unificando",
  ABOUT: "/sobre",
  CONTACT: "/contato",
  PRIVACY: "/privacidade",
  TERMS: "/termos",
  LINKS: "/links",
  LEGACY_SERVICES: "/servicos",
} as const;
```

`ROUTES` é a **fonte única** — use sempre a constante (nunca strings soltas) para links internos, canonicals e navegação.

### 3.2 AppRouter (`src/router/index.tsx`)

- **Code-splitting:** todas as páginas, exceto `Home` (import estático — é a landing crítico de LCP), são carregadas com `React.lazy(() => import("../pages/X").then(m => ({default: m.X})))`.
- **Loading:** `Suspense` com fallback `LoadingFallback`.
- **Transições:** `AnimatePresence mode="wait"` + `<Routes location={location} key={location.pathname}>` — a saída da página atual completa antes da entrada da próxima (fade via `PageTransition` em cada página).
- **Redirect legado:** `/servicos` → `<Navigate to={ROUTES.LAB} replace />` (preserva SEO de URLs antigas).
- **Catch-all:** `path="*"` → `NotFound`.

### 3.3 Tabela rota → página → conteúdo

| Rota | Página | Conteúdo principal |
| ---- | ------ | ------------------ |
| `/` | Home | Hero, Projetos (ProjectCard), DevTools (npm + servidores), Roadmap, Capacidades, Soluções, Jornada, CTA |
| `/laboratorio` | Laboratory | Header, grid de capacidades (`LAB_CAPABILITIES`), áreas de P&D (`LAB_PD_AREAS`), DevTools, CTA |
| `/metodo-unificando` | HowItWorks | Timeline de 3 fases (`MethodPhase`), princípios, transparência, CTA |
| `/sobre` | About | Manifesto, o que somos/não somos, princípios, quem constrói |
| `/contato` | Contact | Benefícios + ContactForm (grid 2 colunas, fundo lime) |
| `/privacidade` | PrivacyPolicy | Política LGPD (documento extenso) |
| `/termos` | TermsOfService | Termos de uso |
| `/links` | LinksPage | Todos os canais (página sem Header/Footer/WhatsApp — ver `Layout.tsx`) |
| `*` | NotFound | 404 + SEO noindex |
| `/servicos` | (redirect) | `<Navigate to="/laboratorio" replace />` |

**Nota:** a página `/links` é renderizada **sem** `Header`, `Footer` e `WhatsAppFloating` (`Layout.tsx` verifica `location.pathname === ROUTES.LINKS`). É o único caso de layout especial.

---

## 4. Fluxo de Dados

```
constants/ + data/  ──►  pages/ + features/  ──►  components/common/
   (conteúdo)            (orquestração)             (UI + helpers)
```

- **Dados de conteúdo** ficam em `src/data/capabilities.ts` (`LAB_CAPABILITIES`, `HOME_CAPABILITIES`, `LAB_PD_AREAS`, `SOLUTIONS_MODULES`) e `src/constants/` (`DEVTOOLS`, `OPEN_SERVERS`, `SOCIAL_LINKS`, `CONTACT_INFO`, `NOISE_BACKGROUND`).
- **Componentes** recebem esses dados por props e renderizam; não buscam dados próprios.
- **Estado:** não há store global (sem Redux/Zustand/Context de estado). O único "estado global" relevante é:
  - `HelmetProvider` (metadados por página);
  - `dataLayer` do Google (via `src/utils/analytics.ts`), acessado por `window`.
  - Estado local via `useState` em componentes (formulário, menu mobile, modal).
- **Eventos de produto:** `src/utils/analytics.ts` expõe `pushDataLayer` e `trackCtaClick`; componentes como `CtaButton`, `WhatsAppFloating` e `ContactForm` emitem eventos `cta_click`, `lead_submit`, `lead_submit_success`, `lead_submit_error`.

---

## 5. Decisões e Padrões Técnicos

- **TypeScript strict** (`tsconfig.json`): `strict: true`, `moduleResolution: "bundler"`, `paths: {"@/*": ["./src/*"]}`, `noEmit`, `isolatedModules`. Type-check via `npx tsc --noEmit`.
- **Alias `@`:** `import { X } from "@/components/..."` resolvido no `vite.config.ts` e no `tsconfig`.
- **CSS-first Tailwind v4:** sem `tailwind.config.js`; `postcss.config.js` usa apenas `@tailwindcss/postcss`. Tokens de design são classes utilitárias inline (ver `docs/design-system.md`).
- **Code-splitting:** lazy por página; a Home fica no bundle inicial para LCP. `framer-motion` entra no bundle inicial (backlog conhecido: code-splitting de framer-motion — ver `docs/workflow.md`).
- **Sem i18n:** conteúdo 100% em pt-BR, `lang="pt-BR"` no `index.html`.
- **Sem CSS Modules/styled-components:** estilos via utilitárias Tailwind no próprio JSX.

---

## 6. Performance e Observações

- Bundle inicial: React + ReactDOM + Router + Helmet + Framer Motion + Home (eager) + `index.css`.
- Demais páginas entram sob demanda via lazy (cada uma um chunk próprio).
- Google Fonts (Inter) e GTM/GA4 são carregados de forma adiada (idle/primeira interação) — ver `docs/seo.md`.
- O sitemap é gerado em build por `scripts/generate-sitemap.js` — ver `docs/build-and-deploy.md`.

---

## 7. Links Relacionados

- [`design-system.md`](./design-system.md) — padrões visuais e componentes
- [`seo.md`](./seo.md) — metadados, JSON-LD, sitemap, AI crawlers
- [`data-and-content.md`](./data-and-content.md) — onde editar cada conteúdo
- [`testing.md`](./testing.md) — testes da lógica
- [`build-and-deploy.md`](./build-and-deploy.md) — build, Docker, nginx
- [`workflow.md`](./workflow.md) — gates e convenções de processo