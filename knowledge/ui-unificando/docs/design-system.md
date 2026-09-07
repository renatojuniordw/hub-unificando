# Design System — Unificando

> Documento de referência visual e de desenvolvimento. Descreve padrões,
> componentes e regras que garantem consistência em toda a aplicação.
>
> Migrado de `DESIGN_SYSTEM.md` (raiz) em 2026-09-05 com correções para
> refletir o estado real do código. Onde houver divergência entre este
> documento e o código, o código é a fonte da verdade — reporte para
> atualização.

---

## 0. Filosofia de Design — Brutalismo Digital

O design da Unificando segue o estilo **Neo-Brutalista**, caracterizado por:

- **Contraste extremo:** preto sólido (`slate-950`) sobre amarelo neon (`#ccff00`) e vice-versa.
- **Sem arredondamentos:** bordas retas (`border-radius: 0`). Quadrado é a forma.
- **Sombras brutalistas:** `box-shadow` manual com deslocamento visível (ex: `8px 8px 0px #000`).
- **Tipografia pesada:** `font-black` com `uppercase` e `tracking-tighter`.
- **Anti-clichê:** zero gradientes suaves, zero cards flutuantes genéricos, zero paleta indigo/blue.

**Framework base:** React (Vite) + Tailwind CSS v4 (CSS-first).

**Configuração real:** `src/index.css` é mínimo — contém apenas `@import "tailwindcss"`, `font-family: 'Inter'` no `body` e `scroll-behavior: smooth`. **Não existem tokens centralizados via `@theme`** (ver seção 1.1). Os valores de cor/sombra são aplicados como classes utilitárias arbitrárias diretamente no JSX, ex.: `bg-[#ccff00]`, `shadow-[8px_8px_0px_#000]`, `border-slate-950`.

---

## 1. Paleta de Cores

### Cores Primárias (de facto)

| Cor         | Valor                   | Uso                                                      |
| ----------- | ----------------------- | -------------------------------------------------------- |
| `Neon Lime` | `#ccff00`               | Cor de destaque principal, fundos de hero, badges ativos |
| `Ink`       | `slate-950` / `#020617` | Bordas, sombras, textos principais, fundos escuros       |
| `White`     | `#ffffff`               | Fundos de seção, texto sobre fundo escuro                |

### Variações Usadas

| Token       | Valor     | Uso                                                      |
| ----------- | --------- | -------------------------------------------------------- |
| `slate-900` | `#0f172a` | Superfícies escuras secundárias (ex.: botão do hamburger) |
| `slate-800` | `#1e293b` | Bordas internas em contexto dark (menu mobile, footer)   |
| `slate-700` | `#334155` | Texto/ícones secundários                                 |
| `slate-600` | `#475569` | Texto muted                                             |
| `slate-500` | `#64748b` | Texto muted (Micro Label)                                |
| `slate-200` | `#e2e8f0` | Bordas leves em contexto claro                           |
| `slate-100` | `#f1f5f9` | Fundos leves (bg-slate-50/100) e hover                   |
| `slate-50`  | `#f8fafc` | Fundo base do `body` (`index.html`), blocos de nota      |

### Cores de Suporte

| Cor            | Valor      | Uso                                                        |
| -------------- | ---------- | ---------------------------------------------------------- |
| `red-500`      | `#ef4444`  | Blocos "o que não somos"/alertas (About)                   |
| `red-600`      | `#dc2626`  | Ícones/estado de erro no Modal, asterisco obrigatório      |
| `green-500`    | `#22c55e`  | Indicador "No ar" (status de projetos), ponto "resposta 24h" |
| `green-600`    | `#16a34a`  | Estado de sucesso no Modal                                 |
| `green-700`    | `#15803d`  | Hover do botão de sucesso no Modal                         |
| `yellow-600`   | `#ca8a04`  | Estado warning no Modal                                    |
| `WhatsApp Green` | `#25D366` | Botão "ENVIAR MENSAGEM" do formulário de contato (hover `#1ebd5a`) |

> **Regra de ouro:** `purple`/`violet`/`indigo` são **proibidos** no projeto.
> O código ainda contém usos residuais de indigo (ver "Divergências conhecidas" na seção 10) que devem ser removidos em manutenções futuras — não os replique.

### 1.1 Estado dos Tokens (Tailwind v4)

**Situação atual:** não há blocos `@theme` nem variáveis CSS customizadas no projeto. Toda cor e sombra são escritas como valores arbitrários inline (`bg-[#ccff00]`, `shadow-[4px_4px_0px_#000]`, `border-slate-950`), com destaque para a repetição dos mesmos valores em vários componentes.

**Oportunidade documentada (não implementada):** centralizar os tokens mais usados no `src/index.css` via `@theme`, conforme o modelo do Tailwind v4:

```css
@theme {
  --color-neon: #ccff00;
  --color-ink: #020617;
  --shadow-hard-lg: 8px 8px 0px #000;
  --shadow-hard-md: 4px 4px 0px #000;
  --shadow-hard-neon: 8px 8px 0px #ccff00;
  --shadow-hard-white: 6px 6px 0px #fff;
}
```

Isso permitiria trocar `bg-[#ccff00]` por `bg-neon` e `shadow-[8px_8px_0px_#000]` por `shadow-hard-lg`, reduzindo drift. Decisão de produto/arquitetura — **não alterar sem autorização** (ver `docs/workflow.md`).

---

## 2. Tipografia

**Família Principal:** `Inter`, sans-serif. Carregada via Google Fonts no `index.html` (pesos 300–900), com `preconnect`, carregamento assíncrono (`media="print" onload="this.media='all'"`) e fallback `<noscript>`.

**Segunda família:** `font-mono` (monospace do sistema) usada extensivamente em descrições, labels e blocos de texto.

### Escala Tipográfica (de facto)

| Papel             | Classes Tailwind                                                                         | Uso                                       |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Display Hero**  | `text-5xl md:text-7xl lg:text-[7rem] font-bold tracking-tighter uppercase leading-[0.9]` | Títulos de seção principal (Hero)         |
| **Heading Seção** | `text-3xl md:text-5xl font-black uppercase tracking-tighter`                             | Subtítulos de seções internas             |
| **Card Title**    | `text-2xl font-black uppercase tracking-tighter leading-none`                            | Títulos de módulos/cards                  |
| **Label / Badge** | `text-[10px] font-black uppercase tracking-widest`                                       | Rótulos de seção, badges, tags            |
| **Micro Label**   | `text-[9px] font-black uppercase tracking-widest`                                        | Copyright, avisos legais, sub-labels      |
| **Body Mono**     | `text-sm font-mono font-bold uppercase`                                                  | Parágrafos de suporte, listas de features |
| **Body Normal**   | `text-base text-slate-950 font-medium leading-relaxed`                                   | Texto corrido                             |
| **Muted**         | `text-xs text-slate-500 font-mono uppercase tracking-widest`                             | Textos de apoio, hints                    |

---

## 3. Sistema de Espaçamento e Layout

- **Container padrão:** `max-w-7xl mx-auto px-6 lg:px-12`
- **Padding de seção:** `py-24 md:py-32` (seções hero/destaque) | `py-16` (seções intermediárias)
- **Gaps de Grid:** `gap-8` (padrão) | `gap-12` (seções espaçadas)
- **Header:** fixo, altura `h-20`; o conteúdo principal ganha `pt-20` para compensar (`Layout.tsx`).

### Z-Index Reference (usos reais no código)

| Camada   | Valor | Uso                                                    |
| -------- | ----- | ------------------------------------------------------ |
| `z-[100]`| 100   | Skip-link "pular para conteúdo" quando focado          |
| `z-50`   | 50    | Header fixo, Modal, WhatsAppFloating                   |
| `z-40`   | 40    | Menu mobile (overlay slide-in)                         |
| `z-10`   | 10    | Conteúdo relativo (ex.: formulário acima do fundo)     |

> O antigo `z-30` (sticky summary do extinto configurador de planos) não existe mais — o site atual não tem página de planos.

---

## 4. Sombras Brutalistas (Shadows)

Sombras são um elemento central do Brutalismo. Sempre sem `blur`, sempre com cor sólida. No código atual elas são aplicadas como classes arbitrárias:

| Nome de facto        | Classe no código            | Uso                                     |
| -------------------- | --------------------------- | --------------------------------------- |
| Hard Lg (preto)      | `shadow-[8px_8px_0px_#000]` | Cards, módulos de destaque              |
| Hard Md (preto)      | `shadow-[4px_4px_0px_#000]` | Badges, sub-cards, inputs               |
| Hard Sm (preto)      | `shadow-[2px_2px_0px_#000]` | Elementos menores, labels               |
| Hard White           | `shadow-[4px_4px_0px_#fff]` (logo) / `shadow-[6px_6px_0px_#fff]` (CtaButton) | Destaques neon sobre fundo claro |
| Hard Neon            | `shadow-[3px_3px_0px_#ccff00]` / `shadow-[4px_4px_0px_#ccff00]` | Destaques sobre fundo escuro (footer, ErrorBoundary) |
| Modal / Formulário   | `shadow-[12px_12px_0px_#000]` | Caixa do ContactForm                 |

Padrões de hover: elementos interativos costumam reduzir o deslocamento ao pressionar (`focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0px_#000]`, ex.: inputs do ContactForm) ou ampliar ao passar o mouse (`group-hover:shadow-[8px_8px_0px_#000]`, ex.: WhatsAppFloating).

---

## 5. Componentes Chave

> Importante: o projeto **não tem uma biblioteca de primitivos genéricos** (`Button`, `Card`, `Section`, `Container`). Existe apenas um primitivo de CTA reutilizável (`CtaButton`). Cards, badges e seções são construídos inline com classes utilitárias em cada página/feature. Abaixo, o catálogo **real** de componentes de `src/components/` e os padrões visuais de facto usados no JSX.

### 5.1 CtaButton (único primitivo)

Local: `src/components/common/CtaButton.tsx`. Navega para `/contato` e dispara analytics `cta_click` quando `trackingLabel` é passado.

```tsx
// Props: label (default "Vamos construir algo?"), size ("md" | "lg"), className, trackingLabel, trackingLocation
<CtaButton
  label="Falar com o laboratório"
  size="lg"
  trackingLabel="hero_cta"
  trackingLocation="hero"
/>
```

Estilo base: `bg-[#ccff00] text-slate-950 font-black hover:bg-white transition-all uppercase tracking-[0.2em] shadow-[6px_6px_0px_#fff]` + `borderRadius: 0` inline. Sizes: `md` = `px-10 py-5 text-sm md:text-base`; `lg` = `px-12 py-6 text-base`.

### 5.2 Header

Local: `src/components/layout/Header.tsx` (usa `src/hooks/useHeaderMenu.ts`).

- **Fundo:** `bg-slate-950` + borda inferior `border-b-4 border-[#ccff00]`, fixo no topo, `z-50`.
- **Logo:** bloco neon `bg-[#ccff00] p-2 border-2 border-slate-950 shadow-[4px_4px_0px_#fff]`, com `hover:-translate-y-1 hover:shadow-[6px_6px_0px_#fff]`.
- **Nav desktop** (`lg:flex`): links `text-xs font-black uppercase tracking-widest`; item ativo com `bg-[#ccff00] text-slate-950 border-[#ccff00]` (borda dupla transparente→neon no hover).
- **Não existe dropdown "Soluções".** O nav é plano: Início, Laboratório, Método, Sobre (definido em `Layout.tsx` → `navItems`).
- **Menu mobile:** botão hamburger (até `lg`) alterna um painel slide-in `fixed inset-0 top-20 bg-slate-950 z-40` com `translate-x-full` ↔ `translate-x-0` (transição 300ms), links em `text-[#ccff00] text-2xl font-black uppercase`. O hook `useHeaderMenu` fecha o menu ao trocar de rota ajustando estado durante o render (sem timers).

### 5.3 Footer

Local: `src/components/layout/Footer.tsx`.

- Fundo `bg-white`, separador `border-t-8 border-slate-950`, grid `grid-cols-2 md:grid-cols-4`.
- Logo em bloco neon com sombra `shadow-[6px_6px_0px_#000] md:shadow-[8px_8px_0px_#000]`.
- Colunas "Laboratório" (Projetos/Capacidades/Método), "Links" (Sobre/Contato/WhatsApp), ícone social Instagram (botão quadrado `border-4` com hover neon).
- Rodapé com copyright `bg-slate-950 text-[#ccff00]`, links Privacidade/Termos, bloco `bg-slate-50 border-4` "Recife - PE" e assinatura do Renato.

### 5.4 WhatsAppFloating

Local: `src/components/common/WhatsAppFloating.tsx`.

- `motion.a` fixo `bottom-20 md:bottom-6 right-6 z-50`, entra com `delay: 1.5, duration: 0.5` (opacity/scale/y), hover `scale 1.05 / translateY -5`.
- Balão "FALE CONOSCO" (`bg-white border-4 shadow-hard`) revelado no hover (desktop).
- Quadrado `w-14 h-14 md:w-16 md:h-16 bg-[#ccff00] border-4 border-slate-950` com `WhatsAppIcon` (fonte única do símbolo: `src/components/common/icons/WhatsAppIcon.tsx`, path oficial do Simple Icons).
- Clique dispara `cta_click` com `location: "floating_button"`.

### 5.5 ContactForm

Local: `src/components/contact/ContactForm.tsx`.

- Caixa `bg-white p-8 md:p-12 border-4 border-slate-950 shadow-[12px_12px_0px_#000] max-w-lg`, com tag decorativa "//" no canto.
- Inputs brutalistas: `border-4 border-slate-950 px-5 py-4 font-black uppercase`, foco com "afundamento" (`focus:translate-*` + sombra reduzida).
- Honeypot `company` (campo escondido) para bots.
- Validação via `useContactValidation` (ver `docs/testing.md`); erros abrem `Modal` com `type: warning`.
- Envio redireciona para o WhatsApp (`SOCIAL_LINKS.whatsapp` + mensagem `wa.me`), disparando `lead_submit` / `lead_submit_success` / `lead_submit_error` no dataLayer.
- Botão principal `bg-[#25D366]` (WhatsApp green), hover `#1ebd5a` com "afundamento".
- Selo "RESPOSTA EM ATÉ 24H" com ponto verde `animate-pulse`.

### 5.6 Modal

Local: `src/components/common/Modal.tsx`.

- **Divergência:** o Modal **não segue o brutalist** — usa `rounded-2xl`, `shadow-2xl`, ícones circulares coloridos (`bg-green-100`, `bg-red-100`, `bg-yellow-100`) e botão `rounded-xl`. É um componente de feedback (success/error/warning) usado pelo ContactForm.
- Pontos fortes de acessibilidade: `role="dialog" aria-modal`, `tabIndex={-1}` + foco no open, focus trap (Tab circula), fecha com `Escape`, restaura foco ao elemento que abriu, trava scroll do body.
- A referência brutalista desejada para uma futura reformulação está na seção 11.

### 5.7 LoadingFallback

Local: `src/components/common/LoadingFallback.tsx`. Spinner `animate-spin rounded-full border-t-2 border-b-2 border-indigo-600` + texto `sr-only`. Usado como fallback do `Suspense` do router.

- **Divergência:** usa `indigo-600` (cor proibida no design system) e `rounded-full` (regra anti-clichê) — item de dívida técnica; não replicar em código novo.

### 5.8 ErrorBoundary

Local: `src/components/common/ErrorBoundary.tsx`. Classe React com `getDerivedStateFromError`. Fallback brutalista coerente: `bg-slate-50`, título `font-black uppercase`, botão `bg-slate-950 text-white border-4 shadow-[4px_4px_0px_#ccff00]` com "Recarregar".

### 5.9 PageTransition

Local: `src/components/common/PageTransition.tsx`. `motion.div` com fade de opacidade `duration: 0.2, ease: "linear"` (initial/animate/exit). Envolve o conteúdo de cada página; combinado com `AnimatePresence mode="wait"` no router (ver `docs/architecture.md`).

### 5.10 Padrões Visuais de Facto (referência de classes)

Estes são os snippets que aparecem repetidos no JSX — use como referência ao criar novas seções:

#### CTA principal

```tsx
<button className="bg-[#ccff00] text-slate-950 px-8 py-5 font-black uppercase tracking-[0.2em] hover:bg-white transition-colors border-2 border-transparent">
  COMEÇAR AGORA
</button>
```

#### Card ativo (neon)

```tsx
<div className="p-8 border-4 border-slate-950 bg-[#ccff00] shadow-[8px_8px_0px_#000]">
  {/* conteúdo */}
</div>
```

#### Card / box claro

```tsx
<div className="p-8 border-4 border-slate-950 bg-white shadow-[4px_4px_0px_#000]">
  {/* conteúdo */}
</div>
```

#### Badge primário

```tsx
<span className="bg-slate-950 text-[#ccff00] font-black uppercase tracking-widest text-[10px] px-2 py-1 border-2 border-slate-950 shadow-[4px_4px_0px_#ccff00]">
  RÓTULO
</span>
```

#### Badge invertido

```tsx
<span className="bg-[#ccff00] text-slate-950 font-black uppercase tracking-widest text-[10px] px-2 py-1 border-2 border-slate-950 shadow-[2px_2px_0px_#000]">
  RÓTULO
</span>
```

#### Seção padrão

```tsx
<section className="py-24 bg-white border-t-8 border-slate-950">
  <div className="max-w-7xl mx-auto px-6 lg:px-12">
    {/* header + grid de cards */}
  </div>
</section>
```

---

## 6. Animações e Transições

### 6.1 Padrões de Framer Motion (real)

| Padrão | Implementação | Onde |
| ------ | ------------- | ---- |
| **Transição de página** | `AnimatePresence mode="wait"` + `Suspense` + `Routes key={location.pathname}`; páginas envolvidas em `PageTransition` (fade `0.2s linear`) | `src/router/index.tsx`, páginas |
| **Reveal on scroll** | `motion.div initial={{opacity:0, y:20}} whileInView viewport={{once:true}} transition={{delay, duration:0.5, ease:"easeOut"}}` com stagger por índice (`delay: i * 0.05`) | grids de Laboratory e Home (capacidades/P&D) |
| **Entrada do WhatsAppFloating** | `initial={{opacity:0, scale:0.8, y:20}} animate transition={{delay:1.5, duration:0.5}}`, hover/tap via `whileHover`/`whileTap` | `WhatsAppFloating.tsx` |
| **Modal** | overlay fade + container `scale 0.95 / y 20 → 1 / 0`, com `AnimatePresence` para exit | `Modal.tsx` |
| **Hover lift** | `hover:-translate-y-1 transition-transform` | logo header, cards, badges sociais |

### 6.2 Diretrizes (convenções)

- **Easing de entrada:** `ease: "easeOut"` (equivalente a `[0.23, 1, 0.32, 1]`).
- **Easing de saída:** `[0.4, 0, 1, 1]` (In).
- **Durações:** `0.2s` para micro-interações e transições de página; `0.4–0.5s` para reveals de seção.
- **Sem loops decorativos:** não há shimmer; `animate-pulse` é usado pontualmente (sinal "resposta 24h", pontos de status "No ar").
- **Grain/textura:** overlay de ruído SVG via `feTurbulence` (data-URI) com `mix-blend-overlay`, centralizado em `src/constants/backgrounds.ts` (`NOISE_BACKGROUND`), reutilizado em Hero, CTA e Laboratory.

---

## 7. Mobile First

| Breakpoint        | Prefixo Tailwind | Comportamento                                  |
| ----------------- | ---------------- | ---------------------------------------------- |
| Default (< 640px) | —                | Layout compact, tipografia reduzida            |
| Small             | `sm:`            | 640px+                                         |
| Medium            | `md:`            | 768px+ — grid em 2 colunas quando necessário   |
| Large             | `lg:`            | 1024px+ — nav desktop, grids de 3 colunas      |

### Padrões Mobile Específicos

- **Header:** hamburger (até `lg`) abre painel slide-in sobre `bg-slate-950` (`transition-transform duration-300`); links grandes `text-2xl` em listra com `border-b-2 border-slate-800`.
- **WhatsAppFloating:** balão "FALE CONOSCO" oculto em mobile (`hidden md:block`); botão posicionado mais alto (`bottom-20`) para não cobrir conteúdo/CTA.
- **Conteúdo:** seções com `py-24 md:py-32` e grids `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`.

---

## 8. Regras Anti-Clichê (Purple Ban + Boas Práticas)

| Proibido                      | Correto                                        |
| ----------------------------- | ---------------------------------------------- |
| `rounded-xl`, `rounded-full`  | `rounded-none` (sem bordas arredondadas)       |
| `indigo`, `purple`, `violet`  | `[#ccff00]`, `slate-950`, `white`              |
| Sombras com blur (`shadow-lg`)| Sombras brutalistas (`shadow-[8px_8px_0px_#000]`) |
| Gradientes suaves             | Cor sólida ou neon                             |
| Cards "flutuando" sem contexto| Cards com borda grossa e sombra hard           |
| Tipografia leve (`font-light`)| `font-black`, `font-bold`, `uppercase`         |

---

## 9. Estados de Feedback e Erro

### 9.1 Erro (Danger)

- **Cor de facto:** `red-500`/`red-600` (Tailwind) — ex.: bloco "o que não somos" com sombra `[4px_4px_0px_#ef4444]` (About), ícone/botão do Modal em `bg-red-600`.
- **Estética:** bordas pretas grossas sobre vermelho, texto `slate-950`/branco.

### 9.2 Sucesso

- **Cor de facto:** `green-600` (Modal), `green-500` (status "No ar"), `#25D366` (botão WhatsApp do formulário).
- **Estética:** blocos sólidos com borda `border-4 border-slate-950` e sombra hard.

### 9.3 Loading (Skeletons / spinners)

- **Estilo desejado:** blocos `bg-slate-200` com `animate-pulse` (mudança de opacidade sólida, sem shimmer).
- **Atenção:** o `LoadingFallback` atual usa spinner circular com `border-indigo-600` — divergência a corrigir (seção 10).

### 9.4 Acessibilidade (Focus States)

- **Skip link:** link "PULAR PARA O CONTEÚDO" (`sr-only focus:not-sr-only`, `z-[100]`, fundo branco, borda), em `Layout.tsx`.
- **Ring/foco:** preferir `focus:outline-none` + sombra/borda que "afunda" (inputs do ContactForm) ou borda visível; o padrão `ring-4 ring-slate-950 ring-offset-2 ring-offset-[#ccff00]` é a referência desejada.
- **Contraste:** texto sobre neon usa `slate-950`; texto sobre fundo escuro usa branco ou `#ccff00`.
- **ARIA:** Header usa `aria-label`/`aria-expanded`/`aria-controls` no hamburger; Modal e LoadingFallback têm `role` adequado; ícones decorativos com `aria-hidden`.

---

## 10. Divergências Conhecidas (dívida técnica)

Documentado para guiar manutenções futuras — **não** são padrões a replicar:

1. **`LoadingFallback.tsx`** — spinner `border-indigo-600` + `rounded-full` (viola purple ban e regra de bordas).
2. **`Layout.tsx`** — `selection:bg-indigo-100 selection:text-indigo-900` (purple ban).
3. **`Modal.tsx`** — `rounded-2xl`, `shadow-2xl`, ícones circulares (foge do brutalist; estética "soft").
4. **Documentação antiga** citava `animate-in`/`fade-in`/shimmer e dropdown com `scheduleClose` — **removidos** nas refatorações de 2026-09-03; este documento já reflete o estado atual.

---

## 11. Referência (modal brutalista desejado)

Caso o `Modal` seja reformulado para o estilo brutalist, esta é a referência:

```tsx
<div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
  <div className="bg-white border-4 border-slate-950 p-8 max-w-lg w-full shadow-[12px_12px_0px_#000] relative">
    <button className="absolute -top-4 -right-4 bg-[#ccff00] border-4 border-slate-950 p-2 shadow-[4px_4px_0px_#000] font-black">
      X
    </button>
    <h3 className="text-3xl font-black uppercase mb-4">Título do Modal</h3>
    <p className="mb-6">Conteúdo explicativo com tipografia clara.</p>
    <div className="flex gap-4">
      <button className="flex-1 bg-slate-950 text-white py-3 font-black uppercase">
        Confirmar
      </button>
    </div>
  </div>
</div>
```