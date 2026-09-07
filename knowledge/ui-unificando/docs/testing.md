# Testes — Unificando UI

> Como os testes do projeto funcionam: runner nativo do Node, arquivos cobertos, cobertura e como adicionar novos testes.

---

## 1. Framework: `node --test`

Os testes usam o **runner de testes nativo do Node** (`node:test`) — **não** há Vitest, Jest ou Mocha. Isso é possível porque o projeto exige Node ≥ 22 e o código testado é TypeScript puro (sem JSX/DOM), importado diretamente com extensão `.ts` (habilitado por `allowImportingTsExtensions` no `tsconfig.json`).

**Execução:** `npm test` (script `"test": "node --test"`).

> O runner nativo descobre, por padrão, arquivos `*.test.*` em `src/` (e demais). Não há configuração de teste dedicada.

---

## 2. Arquivos de Teste

| Arquivo | Módulo testado | Cobertura |
| ------- | -------------- | --------- |
| `src/utils/validators.test.ts` | `validatePhone` (`src/utils/validators.ts`) | Formatação de telefone BR/internacional: com DDI `+55`, fallback sem `+`, comprimento mínimo, casos inválidos (curtos, vazios) |
| `src/hooks/useContactValidation.test.ts` | `useContactValidation` (`src/hooks/useContactValidation.ts`) | Validação do formulário de contato: nome vazio, challenge vazio, nome < 3 caracteres, whatsapp inválido, dados válidos com/sem whatsapp. O hook é chamado dentro de cada `it` (evita violar regra de hooks) |
| `src/utils/analytics.test.ts` | `pushDataLayer` / `trackCtaClick` (`src/utils/analytics.ts`) | Inicialização do `window.dataLayer`, push de eventos, acúmulo, comportamento sem `window` (SSR) e evento `cta_click` com label/location/to. Simula `window` via `Object.defineProperty(globalThis, "window", ...)` |

**Total:** 15 casos (4 + 6 + 5). A auditoria de engenharia de 2026-09-03 registrou **100% de cobertura line/branch** nesses módulos de lógica — os testes cobrem todos os ramos (branches) das funções.

---

## 3. Convenções e Padrões

- **Imports:** `import { describe, it, beforeEach } from "node:test"` e `import assert from "node:assert/strict"`.
- **Suíte:** agrupar com `describe("nomeDoModulo", () => { it("caso", ...) ... })`.
- **Assertions strict:** `assert.equal`, `assert.deepEqual`, `assert.doesNotThrow`.
- **Hooks:** usar `beforeEach` para resetar estado (ex.: simulação de `window`).
- **Localização:** os testes ficam **ao lado do módulo testado** (em `utils/` e `hooks/`) — não há pasta `__tests__`.

### Regras ESLint para testes

`eslint.config.js` tem um bloco `**/*.test.ts` com:
- `globals: { ...globals.node }` (node:test imports são globals do Node);
- `react-refresh/only-export-components: "off"` (arquivo de teste não é componente).

---

## 4. Como Adicionar um Novo Teste

1. Criar o arquivo `src/<caminho>/<modulo>.test.ts` ao lado do código.
2. Testar **apenas lógica pura** (utils, hooks, validação, analytics). Componentes que dependem de DOM/JSX **não** são testados hoje (sem jsdom) — ver backlog abaixo.
3. Usar `node:test` + `assert/strict`.
4. Rodar `npm test` e `npm run lint` (o ESLint valida o arquivo de teste).
5. Meta de cobertura: manter 100% line/branch nos módulos de lógica.

---

## 5. Backlog Conhecido

- **Cobertura de componentes com jsdom** — não implementada; testes de lógica são o padrão atual.
- O `Suspense`/lazy e as animações (Framer Motion) não têm testes (render cai em `LoadingFallback` em ambiente Node).

---

## 6. Exemplo Rápido

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("meuModulo", () => {
  it("faz algo esperado", () => {
    assert.equal(minhaFuncao("x"), "esperado");
  });
});
```

---

## 7. Links Relacionados

- [`workflow.md`](./workflow.md) — gates de qualidade (lint + tsc + test + build)
- [`architecture.md`](./architecture.md) — onde vive a lógica (hooks/utils)
- [`data-and-content.md`](./data-and-content.md) — dados de conteúdo (não testados diretamente)