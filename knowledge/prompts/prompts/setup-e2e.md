# 🚀 Prompt de Bootstrap — Stack E2E para Projeto Novo
**Versão: 10/10 | Categoria: Bootstrap (Não Agnóstico) | Stack: Playwright | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. Confirmação de que é Bootstrap (não duplicar setup existente)
2. Instalação e Configuração do Playwright
3. Estrutura de Pastas Alinhada com a Biblioteca
4. Agent-Browser (Opcional, Não é Dependência de Pipeline)
5. Checklist de Próximos Passos

---

## ✅ PROMPT: BOOTSTRAP DE STACK E2E (PLAYWRIGHT)

### 📖 O QUE ESTE PROMPT FAZ:
Diferente dos outros 3 prompts da cadeia E2E da biblioteca (auditoria de testid, geração de specs, pipeline CI — todos agnósticos, todos detectam o que já existe antes de agir), este prompt é a exceção deliberada: ele **escolhe uma stack específica** (Playwright) e instala do zero, porque bootstrap de projeto sem nada configurado não tem "o que já existe" pra detectar.

**Quando usar:** só em projeto que ainda não tem nenhum framework E2E configurado. Se já existir Playwright, Cypress ou qualquer outro framework rodando, não use este prompt — use direto o `auditoria-testid` e o `testes-e2e`, que vão detectar e trabalhar em cima do que já existe.

**⚠️ Por que Playwright e não outro framework:** essa é uma escolha assumida, não uma decisão "melhor framework do mercado" universal. Se seu próximo projeto novo tiver um motivo pra usar Cypress ou outro framework, este prompt não serve pra ele sem adaptação — ele é stack-specific por natureza, ao contrário do resto da biblioteca.

**⚠️ Agent-browser é opcional, não é dependência de pipeline:** nenhuma das outras 3 skills da cadeia E2E depende do agent-browser — isso foi decisão explícita anterior, justamente pra manter a auditoria de testid focada sem competir atenção com ferramenta de exploração. Aqui ele entra só como conveniência pra exploração manual durante o desenvolvimento do teste, numa etapa isolada e claramente marcada como opcional.

**⚠️ Diferença de execução em relação aos outros 3:** como é bootstrap de projeto vazio (não há código de produção nem spec existente pra colidir), este prompt escreve arquivos de config e instala pacotes direto, sem gate de confirmação — o risco de sobrescrever algo é baixo por definição (Etapa 0 garante isso). A única coisa que continua proibida é commit.

---

### 🎯 PROMPT (EXECUTE ISTO):

```
Você é um engenheiro responsável por dar o pontapé inicial numa stack de testes E2E com Playwright,
num projeto que ainda não tem nada configurado.

ETAPA 0: CONFIRMAÇÃO DE QUE É BOOTSTRAP
Antes de instalar qualquer coisa, confirme que não há stack E2E já configurada:
- Procure por playwright.config.*, cypress.config.*, wdio.config.* ou qualquer outro config de E2E
- Procure por pasta e2e/, cypress/, tests/e2e/ com specs já existentes
Se encontrar QUALQUER coisa configurada, PARE aqui e avise: este prompt é só pra bootstrap de projeto
vazio. Se já existe stack, use o auditoria-testid e o testes-e2e em
vez deste — eles trabalham em cima do que já existe.

ETAPA 1: INSTALAÇÃO E CONFIGURAÇÃO DO PLAYWRIGHT
- Identifique o gerenciador de pacote já usado no projeto (npm/yarn/pnpm) pelo lockfile existente
- Instale o Playwright como dependência de desenvolvimento
- Rode a instalação dos browsers (Chromium no mínimo; Firefox/WebKit se o projeto já sinalizar
  necessidade de cross-browser — se não houver sinal nenhum, instale só Chromium pra manter o setup
  enxuto, documentando que os outros browsers podem ser adicionados depois)
- Gere o playwright.config.ts (ou .js, conforme o projeto já usa TypeScript ou não) com:
  - baseURL apontando pro ambiente de desenvolvimento local do projeto (detecte a porta/comando de
    dev já configurado, ex: package.json → scripts.dev)
  - testDir apontando pra pasta e2e/
  - Retry configurado em 0 localmente (retry é decisão do ci-e2e pro ambiente de CI, não
    daqui)
  - Reporter padrão (html) para uso local
- Adicione os scripts no package.json: "test:e2e" (roda a suíte) e "test:e2e:ui" (modo interativo)
- Adicione test-results/ e playwright-report/ ao .gitignore, se ainda não estiverem

ETAPA 2: ESTRUTURA DE PASTAS ALINHADA COM A BIBLIOTECA
Crie a estrutura de pastas que os outros prompts da cadeia já esperam encontrar:
- e2e/ — onde os specs vão viver
- e2e/pages/ — Page Object Model / componentes reutilizáveis (usado pelo testes-e2e)
- e2e/fixtures/ — dados de setup sintéticos e fixtures customizadas
Não crie nenhum spec de exemplo além de um único smoke test mínimo (ex: verificar que a home carrega)
só pra validar que a instalação funciona — geração de spec de verdade é escopo do outro prompt.

ETAPA 3: AGENT-BROWSER (OPCIONAL, NÃO É DEPENDÊNCIA DE PIPELINE)
Só execute esta etapa se explicitamente solicitado. Se solicitado:
- Instale/configure o agent-browser como ferramenta de desenvolvimento local
- Deixe claro no relatório final que isso é conveniência de exploração manual — nenhuma das skills da
  cadeia E2E (testid, specs, CI) depende dele pra funcionar

ETAPA 4: RELATÓRIO FINAL setup-e2e-report.md
Gere com:
4.1 O que foi instalado (Playwright + versão, browsers instalados)
4.2 Arquivos de config gerados (playwright.config.ts, scripts no package.json)
4.3 Estrutura de pastas criada
4.4 Se agent-browser foi incluído ou não, e por quê
4.5 Checklist de Próximos Passos:
    1. Rode o auditoria-testid pra garantir seletor estável antes do primeiro spec real
    2. Rode o testes-e2e pra mapear jornadas e gerar os primeiros specs
    3. Rode o ci-e2e quando a suíte já tiver specs suficientes pra justificar CI

REGRAS INVIOLÁVEIS:
1. Só executa se a Etapa 0 confirmar que não há stack E2E já configurada. Nunca sobrescreve config
   existente.
2. Não gera spec de teste real — só o smoke test mínimo de validação da instalação.
3. Agent-browser só entra se explicitamente pedido, e sempre marcado como opcional no relatório.
4. Não commita nada — nunca executa git add, git commit, git push. O usuário revisa e commita
   manualmente.
5. Estrutura de pastas segue exatamente o padrão que os outros 3 prompts da cadeia esperam
   (e2e/, e2e/pages/, e2e/fixtures/) — não inventa nome diferente.

FLUXO DE EXECUÇÃO:
1. Confirma que não há stack já configurada (Etapa 0) — se houver, para e redireciona pros outros
   prompts da cadeia
2. Instala e configura Playwright (Etapa 1)
3. Cria estrutura de pastas (Etapa 2)
4. Configura agent-browser, só se pedido (Etapa 3)
5. Gera setup-e2e-report.md com checklist de próximos passos
6. Pronto — sem commit, sem push
```

---

### 📊 RESULTADO ESPERADO:
- Playwright instalado e configurado, rodando localmente com `npm run test:e2e`
- Estrutura de pastas já alinhada com o que os outros 3 prompts da cadeia esperam encontrar
- Agent-browser presente só se pedido, e nunca como dependência de fluxo
- `setup-e2e-report.md` com checklist claro de qual prompt rodar em seguida

---

## 🔗 Onde Este Documento Se Encaixa
Passo zero da cadeia de testes E2E da biblioteca — só entra em cena uma vez, no início de um projeto
sem stack E2E nenhuma:
1. **Este documento** — bootstrap do zero
2. **`auditoria-testid`** — garante seletor estável em todo o app
3. **`testes-e2e`** — mapeia jornadas e gera specs
4. **`ci-e2e`** — coloca a suíte pra rodar em CI

**Documento gerado com Engenharia de Prompt Profissional**
**Especialização: Bootstrap de Stack E2E (Playwright) | Status: Pronto para Execução 10/10**
