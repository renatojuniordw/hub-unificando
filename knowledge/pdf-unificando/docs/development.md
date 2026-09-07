# Desenvolvimento — setup, scripts e testes

Guia para desenvolver localmente o **Unificando PDF**.

## Requisitos

- Node.js 22+ (pdfjs-dist v6 exige >=22.13; testado com v24 no dev; Docker usa node:22-alpine)
- npm (lockfile `package-lock.json` presente)
- Linux/macOS com **binários opcionais** para certas ferramentas: Ghostscript (compress), LibreOffice (to-word), poppler-utils/pdftoppm (to-jpg/to-png). No Docker eles já vêm instalados.

## Setup

```bash
npm install
cp .env.example .env   # se existir; senão crie o .env (ver docs/env-vars.md)
npm run dev            # http://localhost:11005
```

O `dev` usa a porta **11005** (mesma do container). Se a porta estiver ocupada pelo container de produção rodando na máquina, use `PORT=3005 npm run dev`.

## Scripts (`package.json`)

| Comando | Descrição |
|---|---|
| `npm run dev` | Next dev na porta 11005 |
| `npm run build` | Build de produção (Next) |
| `npm run start` | Sobe o build standalone na porta 11005 |
| `npm run lint` | ESLint (eslint-config-next) |
| `npm test` | Suite completa Vitest (unit + integração) |
| `npm run test:unit` | Somente testes unitários |
| `npm run test:integration` | Somente testes de integração de API |
| `npm run test:coverage` | Suite com cobertura (v8) |
| `npm run test:e2e` | Playwright (3 browsers) |
| `npm run audit` | `npm audit --audit-level=high` |

## Estrutura de testes

```
tests/
├── fixtures/            # PDFs de exemplo (sample.pdf, multi-page.pdf)
├── unit/                # Unit tests (Vitest; ambiente node por padrão, jsdom por arquivo via comentário)
│   ├── api/             # routes-validation.test.ts — contrato das 18 rotas (honeypot/arquivo inválido)
│   ├── hooks/           # useFileProcessor, usePdfPages, useRetryCountdown
│   ├── lib/             # motores pdf (compress, merge, split, rotate, ...), queue, limits, utils
│   │   └── utils/       # api-error, fetch-error, file, http, logger, rate-limit, tmp
│   ├── components/      # layout-and-status, componentes de upload/pwa
│   └── *.test.tsx       # isolated (CommandPalette, PWAInstallBanner, cobertura extra)
├── integration/
│   └── api/routes.test.ts   # rotas reais: 400/413/200 /api/pdf/*
└── e2e/
    └── main.spec.ts     # Playwright (página inicial)
```

### Configuração Vitest (`vitest.config.ts`)

- Ambiente: `node` (com `// @vitest-environment jsdom` nos arquivos de componente que precisam de DOM).
- `setupFiles: tests/setup.ts`.
- Alias `@` → `src`.
- Cobertura (v8): inclui `src/lib`, `src/hooks`, `src/components`, `src/app/api`; exclui `src/lib/analytics.ts`.

## Convenções

- **TypeScript strict** — rode `npx tsc --noEmit` antes de push (há 2 erros conhecidos e pré-existentes em arquivos de teste de cobertura extra: `tests/unit/components-coverage-extra.test.tsx` e `tests/unit/lib/pdf-branch-coverage.test.ts`; não os agrave).
- **Componentes**: Server Components por padrão; `'use client'` apenas quando há hooks/eventos.
- **Mensagens de usuário em PT-BR**; logs técnicos em inglês (JSON).
- Formatação: sem Prettier configurado; siga o estilo dos arquivos vizinhos (aspas simples/sem `;` — exceto arquivos que já usam aspas duplas).

## Fluxo de trabalho típico

1. Criar/alterar motor em `src/lib/pdf/*`
2. Expor via route em `src/app/api/pdf/*`
3. Registrar em `src/config/tools.ts`
4. Criar/ajustar página `src/app/ferramentas/*`
5. Testes: unidade do motor + validação de rota + integração
6. Validar: `npm run lint`, `npm test`, `npm run build`

## Debugging

- Logs em JSON (info/warn/error) — ver [`observability.md`](./observability.md).
- Endpoint de saúde: `GET http://localhost:11005/api/health`.
- Erros de upload grande: lembre-se do `proxyClientMaxBodySize` (55mb) e do limite do nginx (55M) — ver [`api.md`](./api.md).
- Testes e2e: `npm run test:e2e` sobe o dev automaticamente (Playwright `webServer`).