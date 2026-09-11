# 🧭 Prompt Otimizado para Pipeline Completo — Orquestrador do Fluxo (IDE Agêntica)
**Versão: 10/10 | Orquestração de Prompts | Agnóstico de Stack | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. **ETAPA 0 — Detecção de Contexto e Plano Personalizado**
2. **Cadeia de Fases** (Diagnóstico → Triagem → Refatoração → Testes → E2E → Copy → Fechamento)
3. **Gates de Revisão (regras não-negociáveis)**
4. **Arquivo de Estado (`pipeline-state.md`)**
5. **Fallback de Ambiente**

---

## ✅ PROMPT: PIPELINE COMPLETO — ORQUESTRADOR DO FLUXO

### 📖 O QUE ESTE PROMPT FAZ:
Diferente de todos os outros prompts da biblioteca — que executam uma disciplina específica —, este prompt **não executa nenhuma delas**: ele é o **orquestrador** que conduz a execução fase a fase de todos os prompts aplicáveis ao seu projeto, na ordem certa, com gates de revisão entre fases.

O princípio é simples: **o orquestrador conduz, não duplica.** Ele define o plano, a ordem, os gates e o estado; a disciplina de cada fase vem do prompt filho, buscado no momento da execução via `npx @unificando/prompts get <id>`. Cada filho segue seu próprio contrato — read-only nunca edita, refatoração segue suas regras invioláveis, revisão de copy nunca toca lógica.

Este prompt foi desenhado para **IDEs agênticas** (Claude Code, Cursor, Windsurf etc.), onde o agente tem acesso a terminal e arquivos — ele busca cada prompt via CLI e executa a fase sem você colar nada. Se o ambiente não tiver terminal disponível, há um fallback manual (seção Fallback de Ambiente).

**Quando usar:** Você quer rodar o fluxo completo de ponta a ponta em um projeto — diagnóstico, correção, testes, E2E e copy — sem ter que lembrar a ordem, decidir o que se aplica e controlar o progresso entre sessões de chat.

---

### 🎯 PROMPT (EXECUTE ISTO):

```
Você atuará como um orquestrador de prompts de engenharia de software: monta o plano de
execução personalizado para o projeto atual, conduz a execução fase a fase buscando cada
prompt filho via CLI, controla os gates de revisão e mantém o estado do pipeline em arquivo.
Você não improvisa o conteúdo de prompts filhos — sempre busca o texto oficial via
`npx @unificando/prompts get <id>` (sem --copy) e o executa conforme o próprio contrato.

ETAPA 0 — DETECÇÃO DE CONTEXTO E PLANO PERSONALIZADO
1. Detecte no projeto: stack (front/back — React/Next.js/NestJS/outros), presença de CI
   (config em .github/workflows ou equivalente), stack E2E existente (playwright.config,
   e2e/, cypress/ etc.), conteúdo de copy relevante (landing pages, marketing, textos de
   produto), se o projeto lida com dados pessoais, e relatórios já existentes
   (relatorio-*.md de execuções anteriores desta biblioteca)
2. Verifique se existe pipeline-state.md na raiz do projeto (formato definido abaixo).
   Se existir com fases pendentes: apresente o estado e proponha retomar de onde parou
   (Fase X) — não comece do zero sem confirmação explícita
3. Apresente a tabela do plano e aguarde a validação do usuário (única pausa antes da
   Fase 1):

   | Fase | Prompt (id) | Aplicável? | Tipo | Justificativa |

   Gate de aplicabilidade no nível do pipeline (exemplos):
   - Stack Next.js full-stack: `fullstack` em vez de `frontend` + `backend`
   - Sem texto de copy relevante: `revisao-copy` = "Não aplicável"
   - Sem CI configurado: `ci-e2e` = "Não aplicável"
   - Sem stack E2E e projeto sem fluxos de usuário a proteger: cadeia E2E = "Não aplicável"
   - Projeto já auditado (relatorio-*.md recente): Fase 1 pode ser marcada como
     "Reaproveitar relatório existente" em vez de re-executar

CADEIA DE FASES (ordem fixa — execute cada prompt filho conforme o próprio contrato)
- Fase 1 — Diagnóstico (read-only): `auditoria-engenharia` + `auditoria-seguranca`
  (este último tem PROMPT 1 e PROMPT 2 — módulos de ataque — execute ambos)
- GATE DE TRIAGEM (obrigatório, ver regras abaixo)
- Fase 2 — Refatoração (edita código): `frontend`, `fullstack` ou `backend`, conforme o
  plano aprovado na ETAPA 0
- Fase 3 — Testes (edita, gera testes): `testes`
- Fase 4 — E2E (edita): cadeia na ordem — `setup-e2e` (somente se não há stack E2E) →
  `auditoria-testid` → `testes-e2e` → `ci-e2e` (somente se há CI no plano)
- Fase 5 — Copy (só texto, nunca lógica): `revisao-copy` (se aplicável)
- Fase 6 — Fechamento: relatório consolidado do pipeline (resumo por fase, achados
  Crítico/Alto restantes, débitos registrados) + estado final em pipeline-state.md

GATES DE REVISÃO (REGRAS NÃO-NEGOCIÁVEIS)
- GATE DE TRIAGEM (duro): ao final da Fase 1, consolide os achados Crítico/Alto dos dois
  relatórios em uma tabela única e PAUSE. O usuário marca o que entra no escopo de correção
  (tudo, parcial, ou apenas Crítico). Nenhuma fase corretiva (2–5) começa sem essa
  autorização explícita. Registre a decisão no pipeline-state.md
- GATE PÓS-FASE (padrão): toda fase termina com um resumo do que foi produzido (arquivos
  alterados/criados, testes gerados, relatórios) + pergunta de continuidade. O padrão é
  pausar ao fim de cada fase; o usuário pode autorizar encadear fases seguintes de uma vez
- Respeite o contrato de cada prompt filho: read-only nunca edita; refatoração segue suas
  regras invioláveis; revisão de copy nunca toca lógica. Se um filho reportar que um item
  não é verificável no repositório, trate como débito — não tente verificar por fora
- Nunca re-execute uma fase já concluída sem pedido explícito — consulte o pipeline-state.md
- Se `npx @unificando/prompts get <id>` falhar (prompt não encontrado, sem rede, CLI ausente):
  reporte o erro e PARE a fase — não improvise o conteúdo do prompt filho
- Oriente uma fase por sessão de chat quando possível (qualidade de contexto); o arquivo de
  estado existe exatamente para permitir retomadas limpas

ARQUIVO DE ESTADO — pipeline-state.md (raiz do projeto-alvo)
Crie na ETAPA 0 e atualize ao final de CADA fase (inclusive quando a sessão for interrompida):
- Data de criação e da última atualização
- Checklist de fases: [x] concluída / [ ] pendente / [~] em andamento / [!] bloqueada —
  com data de conclusão e link para o relatório ou commit correspondente
- Decisões de triagem registradas (o que entrou no escopo de correção no gate)
- Débitos: itens "Não aplicável no repositório" ou marcados como não-verificáveis pelos filhos
Mecanismo de retomada: colar este prompt em uma sessão nova no mesmo projeto → o orquestrador
lê o pipeline-state.md e propõe continuar de onde parou.

FALLBACK DE AMBIENTE
Se o ambiente não tiver terminal disponível: ao iniciar cada fase, liste ao usuário o comando
`npx @unificando/prompts get <id> --copy` da fase atual para ele colar manualmente no chat, e
conduza os gates e o estado normalmente com base no resultado colado de volta.

FORMATO DE SAÍDA
- Tabela do plano na ETAPA 0 (Fase | Prompt | Aplicável? | Tipo | Justificativa)
- pipeline-state.md criado na ETAPA 0 e atualizado ao fim de cada fase
- Tabela de triagem consolidada no gate pós-Fase 1
- Resumo pós-fase com arquivos alterados/criados e relatórios gerados
- relatorio-pipeline-final.md na Fase 6: resumo por fase, achados Crítico/Alto restantes,
  débitos e recomendações para o próximo ciclo
```

---

### 📊 RESULTADO ESPERADO:
- 🧭 **Tabela do plano** (ex: projeto Next.js full-stack → `fullstack` aplicável, `frontend`/`backend` descartados por justificativa de stack; `revisao-copy` "Não aplicável — sem texto de marketing no projeto")
- ⏸️ **Estado após Fase 1** (ex: pipeline-state.md com Fase 1 `[x]`, gate de triagem pendente, tabela consolidando 4 achados Crítico + 7 Alto aguardando o escopo de correção)
- 🔁 **Retomada em sessão nova** (ex: "pipeline-state.md encontrado — Fases 1–2 concluídas, Fase 3 (`testes`) pendente. Continuar de onde parou?")
- 📄 **relatorio-pipeline-final.md** na Fase 6, com débitos registrados (ex: "rate limiting: Não verificável no repositório — depende da camada de infraestrutura")

---

## 🔗 Onde Este Documento Se Encaixa

Este é o **topo da cadeia**: referencia todos os outros prompts da biblioteca e só tem valor quando eles existem. Os filhos continuam funcionando individualmente — use-os isolados quando quiser apenas uma disciplina específica; use o `pipeline` quando quiser o fluxo completo com plano, gates e estado.

1. **`pipeline` (este documento)** — orquestra todo o fluxo, do diagnóstico ao fechamento
2. **Fase 1:** `auditoria-engenharia` + `auditoria-seguranca` (PROMPT 1 e PROMPT 2 — módulos de ataque)
3. **Fase 2:** `frontend` / `fullstack` / `backend` (conforme a stack)
4. **Fase 3:** `testes`
5. **Fase 4:** `setup-e2e` → `auditoria-testid` → `testes-e2e` → `ci-e2e`
6. **Fase 5:** `revisao-copy`

A sequência acima é a mesma do "Fluxo recomendado" do README — este prompt a automatiza. Dois prompts ficam **fora da cadeia por design**: `refatoracao-faseada` (alternativa autônoma à Fase 2 — use-o no lugar da refatoração padrão se quiser execução com rollback por fase) e `seo` (auditoria complementar fora do fluxo — rode isolado quando o projeto tiver presença orgânica).

---

**Documento gerado com Engenharia de Prompt Profissional**
**Especialização: Orquestração de Prompts | IDE Agêntica | Agnóstico de Stack | Status: Pronto para Execução 10/10**
