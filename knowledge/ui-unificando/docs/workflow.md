# Workflow e Contribuição — Unificando UI

> Gate de qualidade, convenções de git, contratos de automação e pontos de entrada para quem (humano ou agente) vai mexer neste repositório.

---

## 1. Gate de Qualidade (obrigatório)

Antes de dar uma tarefa como concluída, os 4 comandos precisam estar **verdes**:

```bash
npm run lint        # ESLint 10 (flat config)
npx tsc --noEmit    # TypeScript strict
npm test            # node --test (15 casos, cobertura 100% na lógica)
npm run build       # gera sitemap + build de produção (valida o bundle)
```

Estado em 2026-09-05: todos verdes. Mantenha assim — qualquer PR/edição que quebre um desses gates precisa ser corrigida antes de terminar.

---

## 2. Git e Convenções

- **Linguagem dos commits:** português (ex.: `feat: adicionar página Laboratório`, `fix: remover dependência não utilizada`).
- **Tipo:** seguir Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
- **Commits por quem?** O padrão do projeto: o **humano decide**. Agentes (assistentes/CLI) **não devem** criar commits nem push **sem autorização explícita** — ver contratos na seção 4.
- **Push:** somente quando solicitado.

---

## 3. Estrutura de Documentação

- `docs/` é a **fonte canônica** de documentação do projeto (este conjunto de arquivos). Nome dos arquivos em kebab-case, idioma pt-BR.
- Histórico de processos e relatórios ficam em `.refactor/` (ver seção 5) — **fora do git**.
- `README.md` da raiz é a porta de entrada; aponta para `docs/`.

---

## 4. Contratos de Automação (`prompts-unificando`)

Renato mantém uma CLI própria de prompts de workflow:

```bash
npx prompts-unificando get <nome>
```

Exemplos de contratos já usados neste repositório:

- **`refatoracao-faseada`** — pipeline de 10 fases (código morto → DRY → responsabilidades → contratos → segurança → performance → erros → framework → a11y/SEO → testes), com Etapa 0 de reconhecimento, gates de build por fase e patches reversíveis (`fase-N.patch`).
- **`auditoria-engenharia`** — auditoria read-only (zero edição): avalia SOLID/DRY/KISS/YAGNI/Clean Code com evidência `arquivo:linha`, código morto, dependências não usadas, cobertura, e gera relatório único classificado por severidade em pt-BR.

Regras comuns dos contratos (a autoridade é o output do comando):

- **Proibido commit/push** sem autorização.
- **Proibido adicionar dependências novas** sem autorização (exceção conhecida: devDeps de tooling autorizadas explicitamente, como foi o ESLint em 2026-09-03).
- Itens de **decisão de produto** ficam **report-only** (o agente reporta, o humano decide).
- Execuções autônomas rodam o pipeline inteiro sem pausar e aplicam todas as correções (preferência registrada do usuário).
- **Verificação adversarial independente** é obrigatória ao fim (veredito PASS/FAIL com comandos reproduzíveis).

> Uso: quando um contrato for citado, buscar o conteúdo via `npx prompts-unificando get <nome>` antes de agir.

---

## 5. `.refactor/` (artefatos de processo, gitignored)

A pasta `.refactor/` guarda o que foi produzido durante refatorações/auditorias autônomas — **não versionada** (`.gitignore`):

- `plano-mestre.md` — plano da refatoração.
- `RESUMO-FINAL.md` — resumo executivo pós-pipeline.
- `auditoria-engenharia.md` — relatório da auditoria read-only.
- `aplicacao-auditoria.md` — registro das correções aplicadas (M1–M10, B1–B8 na última).
- `fase-N-relatorio.md` / `fase-N.patch` — relatório e patch reversível por fase.

Última execução relevante: **auditoria de engenharia aplicada em 2026-09-03** (0 críticos; remodelou `useHeaderMenu`, criou `WhatsAppIcon.tsx` e `src/data/capabilities.ts`, removeu `constants/cta.ts`, `tailwind.config.js`, `autoprefixer`, `react-international-phone`, tokens CSS mortos e sombra inválida `#red-500` → `#ef4444`).

---

## 6. Backlog / Dívidas Conhecidas

Documentado em `docs/design-system.md` (seção 10) e aqui para referência rápida:

- **Indigo residual:** `LoadingFallback.tsx` (spinner) e `Layout.tsx` (`selection:bg-indigo-100`) violam o purple ban.
- **Modal soft:** `Modal.tsx` usa `rounded-2xl`/`shadow-2xl` (foge do brutalist).
- **Dockerfile legado:** ARGs `VITE_TURNSTILE_SITE_KEY`/`VITE_N8N_WEBHOOK_URL`/`VITE_CHATWOOT_TOKEN` não são lidos pelo código (apenas `VITE_SITE_URL` é usado).
- **Code-splitting de framer-motion** (entra no bundle inicial).
- **Cobertura de componentes com jsdom** (hoje só lógica pura é testada).
- **Tokens de design não centralizados** (`@theme` ausente).
- **Dados dos ProjectCards da Home** ainda no JSX (não centralizados em `data/`).

Itens de **dívida técnica** (visual/refactor) só devem ser corrigidos com autorização — não são blockers do dia a dia.

---

## 7. Pontos de Entrada para Trabalho

| Área | Arquivos principais |
| ---- | ------------------- |
| Copy/conteúdo | `src/data/`, `src/constants/`, `public/llms.txt` (ver `docs/data-and-content.md`) |
| Visual | `src/components/`, `src/features/*/components/` (ver `docs/design-system.md`) |
| SEO | `src/components/common/SEO.tsx`, `index.html`, `public/robots.txt`, `scripts/generate-sitemap.js` (ver `docs/seo.md`) |
| Lógica/testes | `src/hooks/`, `src/utils/` (ver `docs/testing.md`) |
| Infra/deploy | `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `vite.config.ts` (ver `docs/build-and-deploy.md`) |
| Regras de agente | `.agents/rules/` (ex.: `especialistaemtrafego.md`) |

---

## 8. Links Relacionados

- [`architecture.md`](./architecture.md)
- [`design-system.md`](./design-system.md)
- [`seo.md`](./seo.md)
- [`build-and-deploy.md`](./build-and-deploy.md)
- [`testing.md`](./testing.md)
- [`data-and-content.md`](./data-and-content.md)