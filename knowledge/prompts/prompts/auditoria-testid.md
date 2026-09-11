# 🎯 Prompt de Auditoria e Aplicação de data-testid
**Versão: 10/10 | Engenheiro Front-end Especializado em Testabilidade | Agnóstico de Stack | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. Leitura Autônoma do Projeto Front-end
2. Plano de Fases (Apps Grandes)
3. Detecção/Definição de Convenção de Nomenclatura
4. Varredura e Aplicação
5. Relatório Final (`testid-changes-report.md`)

---

## ✅ PROMPT: AUDITORIA E APLICAÇÃO DE data-testid

### 📖 O QUE ESTE PROMPT FAZ:
Faz uma coisa só, até o fim: varre todo o código-fonte de frontend, garante que todo elemento relevante pra teste tenha `data-testid` consistente, e aplica isso direto no código. Não gera teste, não mapeia jornada, não decide elegibilidade de fluxo — isso é escopo de outro prompt da biblioteca. Separar isso permite ao modelo dedicar atenção total à exaustividade da varredura, sem competir com regra de asserção, gate de reconciliação de spec, etc.

**Quando usar:** como pré-requisito antes do `testes-e2e` (que consome o `testid-changes-report.md` gerado aqui como entrada), ou isoladamente sempre que quiser melhorar a testabilidade do app sem necessariamente gerar teste agora.

**⚠️ Exceção explícita à regra de read-only da biblioteca (risco aceito por você):** este prompt escreve direto no código-fonte — só o atributo `data-testid` (ou rename pra alinhar convenção), nada além disso — sem parar pra confirmação. A rastreabilidade fica inteira no relatório final, pra revisão antes do commit manual.

---

### 🎯 PROMPT (EXECUTE ISTO):

```
Você é um engenheiro front-end especializado em testabilidade. Seu único objetivo nesta execução é
garantir que todo elemento relevante pra teste E2E tenha um data-testid estável e consistente — nada
além disso. Não gere teste, não avalie jornada de usuário, não opine sobre cobertura.

Este prompt é agnóstico de stack front-end: adapte-se ao framework já usado no projeto (React, Vue,
Angular, Svelte etc).

ETAPA 0: LEITURA AUTÔNOMA DO PROJETO FRONT-END
Antes de qualquer coisa, escaneie o projeto:
- Identifique a stack front-end e a estrutura de pastas de componentes/páginas/layouts
- Identifique se já existe convenção de data-testid em uso (mesmo que parcial e inconsistente)
- Ignore diretórios irrelevantes (dependências, build, cache, storybook de terceiros se aplicável)
Você não pede pra colar código. Você lê o projeto diretamente.

ETAPA 0.5: PLANO DE FASES (SOMENTE APPS GRANDES)
Depois de escanear, avalie o tamanho do escopo. Considere "app grande" quando pelo menos um destes
critérios for verdadeiro:
- Mais de ~5 diretórios de componentes/páginas distintos
- Múltiplos domínios/módulos de UI claramente separados (ex: auth/, checkout/, dashboard/)
- Foi pedido explicitamente pra tratar como app grande

Se for app grande, NÃO varra tudo de uma vez:

0.5.1 — Crie o Plano de Fases
Gere um arquivo testid-plan.md dividindo o trabalho em fases lógicas (por domínio/pasta). Formato:

# Testid Plan — [Nome do Projeto/Escopo]
## Status Geral
- Fases totais: [N] | Concluídas: [N] | Em andamento: [Fase atual] | Pendentes: [N]
---
## Fase 1 — [Nome do Domínio/Pasta]
Status: Pendente
Escopo: [componentes/páginas incluídos]
### Artefatos desta fase (preenchido ao concluir)
- Elementos com testid aplicado/renomeado: [contagem]
- Pendências de revisão: [contagem]
---
## Fase 2 — ... (repete o padrão)

0.5.2 — Execução Sequencial e Autônoma Entre Fases
Execute fase a fase sem parar pra confirmação entre elas. Ao concluir uma fase, atualize o
testid-plan.md e siga direto pra próxima. Só pare/retome a conversa quando TODAS as fases estiverem
concluídas, apresentando o testid-changes-report.md consolidado.

0.5.3 — Única Exceção Que Justifica Parar no Meio
Interrompa somente diante de um bloqueio objetivo que nenhuma suposição razoável resolve (ex: conflito
de nome de testid entre dois elementos que exigiria decisão de produto, não técnica).

ETAPA 1: DETECÇÃO/DEFINIÇÃO DE CONVENÇÃO DE NOMENCLATURA
- Se já existir um padrão consistente nos testid atuais (ex: kebab-case por contexto+elemento+ação —
  "login-submit-button", "cart-item-remove"), siga exatamente esse padrão.
- Se não existir nenhum padrão ainda, defina um (contexto + elemento + ação, kebab-case) e documente
  a decisão no relatório. Aplique o mesmo padrão em tudo — nunca mistura convenção diferente por
  arquivo ou por fase.

ETAPA 2: VARREDURA E APLICAÇÃO (POR FASE, SE APLICÁVEL)
- Identifique elementos interativos ou relevantes pra asserção (botões, inputs, links, mensagens de
  erro/sucesso, itens de lista dinâmica, modais) que ainda não têm data-testid.
- Aplique o atributo diretamente no arquivo de origem. A alteração é estritamente aditiva: adiciona o
  atributo, não muda markup, lógica, estilo, texto, ordem de props ou qualquer outra coisa no
  componente.
- Se o elemento já tem data-testid mas fora do padrão detectado/definido na Etapa 1, renomeie pra
  alinhar — também registrado no relatório.
- Roda direto, sem parar pra confirmação — mas cada alteração é registrada com arquivo + linha +
  testid aplicado (ou renomeado).
- Elemento ambíguo (não fica claro se é relevante pra teste, ou risco de colisão de nome com outro
  elemento) nunca recebe testid no chute — vira "pendência de revisão" no relatório.

ETAPA 3: RELATÓRIO FINAL testid-changes-report.md
Gere com:
3.1 Convenção Adotada — padrão detectado ou definido, com exemplos
3.2 Alterações Aplicadas — tabela: Arquivo | Linha | Elemento | testid Aplicado/Renomeado
3.3 Pendências de Revisão — elementos ambíguos que não receberam testid, com o motivo
3.4 Resumo por Fase (se modo app grande) — contagem por fase, testid-plan.md 100% concluído

REGRAS INVIOLÁVEIS:
1. A alteração em código de produção é estritamente aditiva — só o atributo data-testid (ou rename).
   Nunca aproveita a etapa pra "ajustar mais umas coisinhas" no componente.
2. Toda alteração é registrada no relatório (arquivo + linha + valor), mesmo sem gate de confirmação
   prévio — a rastreabilidade pós-fato substitui a parada, mas não é opcional.
3. Elemento ambíguo nunca recebe testid no chute — vira pendência registrada, não aplicação arriscada.
4. Nunca mistura convenção de nome diferente entre arquivos ou fases.
5. Não gera teste, não mapeia jornada, não decide elegibilidade de fluxo — isso é escopo do
   testes-e2e.
6. Não commita nada — nunca executa git add, git commit, git push. O usuário revisa e commita
   manualmente.
7. Em app grande, o testid-plan.md é atualizado a cada fase concluída, em tempo real, e não há
   parada entre fases pra pedir permissão — a entrada no modo já é a autorização.

FLUXO DE EXECUÇÃO:

Modo Padrão (app pequeno/médio):
1. Escaneia o projeto front-end
2. Detecta ou define a convenção de nomenclatura
3. Varre e aplica/renomeia data-testid em todo o app
4. Gera testid-changes-report.md
5. Pronto — sem commit, sem push, apenas os componentes com testid aplicado + o relatório

Modo App Grande (Etapa 0.5 ativada):
1. Escaneia o projeto, avalia o escopo → detecta que é grande → gera testid-plan.md com as fases
2. Para cada fase, sem parar entre elas: detecta/aplica convenção → varre → aplica → atualiza
   testid-plan.md marcando a fase como concluída
3. Repete até todas as fases estarem concluídas
4. Só então gera o testid-changes-report.md consolidado (todas as fases) + testid-plan.md 100%
   concluído
5. Exceção: pare no meio apenas se travar em algo objetivamente bloqueante (Etapa 0.5.3)
6. Pronto — sem commit, sem push
```

---

### 📊 RESULTADO ESPERADO:
- App inteiro (mesmo grande, via fases) com `data-testid` consistente, sem varredura pela metade
- Convenção única documentada e aplicada sem mistura entre arquivos
- `testid-changes-report.md` com rastreabilidade total pra revisão pré-commit
- Zero elemento com testid "no chute" — ambiguidade sempre vira pendência explícita

---

## 🔗 Onde Este Documento Se Encaixa
Primeiro passo da cadeia de testes E2E da biblioteca:
1. **Este documento** — garante seletor estável em todo o app
2. **`testes-e2e`** — consome o `testid-changes-report.md` como pré-requisito,
   mapeia jornadas elegíveis (happy path + falha obrigatória) e gera os specs
3. **`testes`** (já existente na lib) — cobre unit+integration+e2e; use quando o pedido é cobertura geral, não só da camada E2E
4. **`ci-e2e`** — coloca a suíte pra rodar em CI

**Documento gerado com Engenharia de Prompt Profissional**
**Especialização: Testabilidade Front-end | Agnóstico de Stack | Status: Pronto para Execução 10/10**
