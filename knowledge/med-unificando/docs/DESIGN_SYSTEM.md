# Design System — Med Unificando

> Documento de referência visual e de desenvolvimento para o **Med Unificando**,
> plataforma de consulta de medicamentos intercambiáveis.

---

## 0. Filosofia de Design — Healthcare Moderno

O design do Med Unificando adota uma identidade visual própria da marca Unificando
(**amarelo neon** como acento, **preto** como cor primária), porém adaptada para o
contexto de saúde — priorizando **clareza, confiança e acessibilidade** em vez do
impacto visual do Brutalismo puro usado em outros projetos da marca.

| Princípio | Aplicação |
|-----------|-----------|
| **Confiança** | Cores neutras dominantes (branco, slate), acentos sutis |
| **Clareza** | Tipografia limpa, hierarquia visual, espaçamento generoso |
| **Acessibilidade** | Contrastes WCAG AA+, focus visíveis, suporte a leitores de tela |
| **Marca** | Amarelo neon (#ccff00) como acento de destaque, não como fundo |

**Framework base:** Next.js 16 (App Router) + Tailwind CSS v4

---

## 1. Paleta de Cores

### Tokens (definidos em `src/app/globals.css` via `@theme`)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--color-brand-yellow` | `#ccff00` | `#ccff00` | Acento de marca (badges, destaques) |
| `--color-brand-black` | `#020617` | `#020617` | Fundo de botões primários, bordas de marca |
| `--color-bg` | `#ffffff` | `#0f172a` | Fundo principal de páginas e cards |
| `--color-bg-secondary` | `#f8fafc` | `#1e293b` | Fundo secundário (tabelas, hover) |
| `--color-text` | `#020617` | `#f1f5f9` | Texto principal |
| `--color-text-secondary` | `#64748b` | `#94a3b8` | Texto secundário (labels, hints) |
| `--color-border` | `#e2e8f0` | `#334155` | Bordas de containers, inputs |
| `--color-muted` | `#64748b` | `#94a3b8` | Texto muted |
| `--color-success` | `#16a34a` | `#4ade80` | Indicadores de sucesso/ativo |
| `--color-error` | `#dc2626` | `#f87171` | Indicadores de erro/inativo |
| `--color-primary` | `#020617` | `#020617` | Cor primária (mesmo que brand-black) |

### Regras de Uso

| Combinação | Onde usar |
|------------|-----------|
| `bg-[var(--color-bg)]` + `text-[var(--color-text)]` | Fundo padrão de páginas e cards |
| `bg-brand-yellow` + `text-brand-black` | **SEMPRE** juntos — fundo amarelo exige texto escuro fixo |
| `bg-brand-black` + `text-white` | Botões primários — fundo escuro com texto branco |
| `text-success` / `text-error` | Status "Ativo"/"Inativo" — nunca sobre brand-yellow |
| `accent-brand-yellow` | Checkboxes personalizados (selecionar todos) |

---

## 2. Tipografia

**Família:** Inter (variável), carregada via `next/font/google` (self-hosted em `/_next/static/media/...`, com `display: swap`) — sem requisição externa a CDN de fontes.

```css
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});
```

### Escala

| Papel | Classe | Uso |
|-------|--------|-----|
| Display | `text-4xl md:text-6xl font-black tracking-tighter` | Home, páginas principais |
| Heading | `text-3xl md:text-5xl font-black tracking-tighter` | Título de seção |
| Subheading | `text-lg font-semibold` | Subtítulos internos |
| Body | `text-sm font-medium` | Texto corrido |
| Label | `text-xs font-semibold text-muted` | Labels de input, badges |
| Muted | `text-xs text-muted` | Informações secundárias |

---

## 3. Componentes

### Botões

| Variante | Aparência | Uso |
|----------|-----------|-----|
| `primary` | `bg-brand-black text-white` | Ação principal (Filtrar, Buscar) |
| `secondary` | `bg-[var(--color-bg)] border text-[var(--color-text)]` | Ação secundária (Excel, CSV) |
| `danger` | `bg-error text-white` | Ação destrutiva (Sair) |
| `ghost` | Transparente, hover sutil | Ações leves (Cancelar, Voltar) |

Todos com `rounded-sm`, `focus-visible:ring-2`.

### Cards

| Variante | Aparência | Uso |
|----------|-----------|-----|
| `active` | `bg-[var(--color-bg)] border shadow-card` | Card padrão |
| `inactive` | `bg-[var(--color-bg-secondary)] border-dashed` | Estado vazio/off |
| `highlight` | `bg-brand-yellow/10 border-l-4 border-brand-yellow` | Destaque (med. referência) |

### Badges

| Variante | Aparência | Uso |
|----------|-----------|-----|
| `primary` | `bg-brand-yellow text-brand-black` | Categoria, status, rótulos |
| `secondary` | `bg-[var(--color-bg-secondary)] border text-muted` | Tags secundárias |

---

## 4. Espaçamento e Layout

- **Container:** `max-w-7xl mx-auto px-6 lg:px-12`
- **Padding de seção:** `py-12 md:py-20`
- **Gap de grid:** `gap-6` (cards), `gap-4` (formulário)
- **Card padding:** `p-6`

---

## 5. Dark Mode

Gerenciado via classe `.dark` na raiz `<html>`, alternada pelo `ThemeProvider`.

- Preferência salva em `localStorage` (`theme`)
- Respeita `prefers-color-scheme` na primeira visita
- CSS variáveis definidas em dois blocos: `@theme` (light) e `.dark` (override)
- Transição suave via `transition: background-color 0.2s, color 0.2s`
- `prefers-reduced-motion` respeitado

---

## 6. Acessibilidade

| Requisito | Implementação |
|-----------|---------------|
| Skip link | `#main-content` no layout |
| Focus visible | `focus-visible:ring-2` em todos interativos |
| ARIA | `aria-live` (toast), `role="listbox"`/`role="option"` (autocomplete), `aria-expanded` (menu), `aria-controls` + foco no menu mobile, `aria-pressed` (ViewToggle), `aria-label` em inputs de busca sem label, `aria-current` |
| Nome acessível | Inputs de busca com `aria-label`/label; select de paginação com `aria-label="Itens por página"`; toasts com `role="status" aria-live="polite"` |
| Test IDs | `data-testid` em 36 arquivos (`contexto-elemento[-acao]`, kebab-case) — usados pelos specs E2E (rastreabilidade em `testid-changes-report.md`) |
| Contraste | WCAG AA (texto #020617 sobre bg #ffffff = 19:1) |
| Reduzir movimento | `prefers-reduced-motion` desativa animações |

---

## 7. Mobile

| Breakpoint | Comportamento |
|------------|---------------|
| `< 640px` | Layout compacto, hamburger menu |
| `md: (768px)` | Grid de 2 colunas |
| `lg: (1024px)` | Grid de 3-4 colunas, nav desktop |

---

## 8. PWA

- Manifest com `display: standalone`, `theme_color: #020617`, `background_color: #ccff00`, ícones 192x192/512x512 (`icon-192.png`, `icon-512.png` — gerados por `npm run pwa:icons`)
- Service worker `public/sw.js`: navegações network-first com fallback offline; `_next/static` cache-first; **não cacheia** `/admin`, `/api`, `/dashboard`
- Registro automático via `PwaRegister` (somente https/localhost)

---

## 9. Regras Anti-Clichê

| ❌ Evitar | ✅ Correto |
|-----------|------------|
| Gradientes suaves | Cores sólidas |
| Glassmorphism | Cards sólidos |
| Neon como fundo dominante | Neon como acento apenas |
| Texto claro sobre brand-yellow | `text-brand-black` sobre bg amarelo |
| Dark mode apenas parcial | CSS vars em todos componentes |

---

## 9. Estrutura de Arquivos

```
src/
├── app/             → Páginas (App Router)
├── components/
│   ├── layout/      → Header, Footer
│   ├── medicines/   → Componentes de domínio (tabela, busca, etc.)
│   └── ui/          → Primitivos (Button, Input, Card, Badge, Toast)
├── hooks/           → Hooks customizados (favorites, recent searches)
├── lib/
│   ├── actions/     → Server Actions
│   └── prisma.ts    → DB client
└── types/           → Interfaces TypeScript
```
