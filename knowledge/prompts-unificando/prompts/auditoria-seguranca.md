# 🛡️ Prompt Otimizado para Auditoria de Segurança, LGPD e Deploy (Read-Only)
**Versão: 10/10 | AppSec/DevSecOps + LGPD + DevOps/SRE + Módulos de Ataque (Pentest de Código) | Agnóstico de Stack | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. **PROMPT 1 — Auditoria de Conformidade (Segurança Front/Back, LGPD, Deploy)**
   Auto-detecção → Gate de aplicabilidade → Verificação detalhada → Regras anti-falso-positivo →
   Relatório `relatorio-seguranca-lgpd-deploy.md` (seções 1–4)
2. **PROMPT 2 — Módulos de Ataque (read-only, ofensivo)**
   Reconhecimento ofensivo → Gate de módulos → 1. Varredura de Secrets → 2. Teste de Autenticação →
   3. Interrogatório do Banco de Dados → 4. Auditoria de Input → 5. Checagem de Bomba de Custo →
   anexo ao relatório (seções 5–9)

Execute o PROMPT 1 primeiro; o PROMPT 2 roda na sequência, na mesma sessão.

---

## ✅ PROMPT 1: AUDITORIA DE SEGURANÇA, LGPD E CHECKLIST DE DEPLOY (READ-ONLY)

### 📖 O QUE ESTE PROMPT FAZ:
Diferente do Doc 5 (auditoria de qualidade de código — SOLID/DRY/código morto), este prompt audita três domínios distintos, cada um com **critério de julgamento próprio, aplicado por um "especialista" diferente**:

- **AppSec/DevSecOps** para os blocos de Segurança Front-End e Back-End (critério: OWASP ASVS/Top 10, CWE)
- **Especialista em conformidade LGPD** para o bloco LGPD (critério: conformidade regulatória com a Lei 13.709/2018 — ausência de item aqui é risco legal, não só técnico)
- **DevOps/SRE** para o Checklist de Deploy (critério: configuração operacional, que pode estar **fora do repositório** — CDN, provedor de hospedagem, painel do Supabase)

É estritamente **read-only**: nunca aplica correção, nunca gera patch — apenas descreve o problema e a sugestão de correção em texto. Também traz uma distinção importante que os outros documentos não têm: itens cuja verificação depende de infraestrutura externa ao repositório são classificados como **"Não verificável no repositório"**, nunca como "Não implementado" — evita falso negativo por falta de visibilidade.

Este documento contém **dois blocos de prompt sequenciais**: o PROMPT 1 (esta seção) é a passada de **conformidade por checklist**; o PROMPT 2 (mais abaixo) é a passada **ofensiva** — ataca o código como um invasor atacaria, em cinco módulos (secrets, autenticação, banco de dados, input, custo). Os dois compartilham o mesmo contrato read-only, a regra de evidência (`arquivo:linha`), a taxonomia de severidade e a classificação "Não verificável no repositório".

**Quando usar:** Você quer um raio-x de segurança + conformidade LGPD + prontidão de deploy, sem risco de alteração acidental — normalmente **antes de subir para produção**, ou periodicamente em produtos que lidam com dados pessoais. Depois do PROMPT 1, execute o PROMPT 2 na sequência para a varredura ofensiva profunda (secrets com lista de rotação, autenticação como um invasor, RLS adversarial tabela a tabela, input/injeção e bomba de custo).

**Auditoria de Segurança, LGPD & Deploy:**
- 🔍 Auto-detecção de stack, mecanismo de auth real, e se o projeto lida com dados pessoais
- 🚦 Gate de aplicabilidade — resume o que é aplicável antes de avaliar item por item e segue direto (evita retrabalho sem pausar a execução)
- 🛡️ Segurança Front-End & Back-End (critério OWASP ASVS/Top 10/CWE)
- ⚖️ LGPD específico (critério de conformidade regulatória, não só boa prática)
- 🚀 Checklist de Deploy (DevOps/SRE — inclui itens fora do repositório)
- 🧨 Módulos de ataque (PROMPT 2): secrets com lista de rotação, autenticação como um invasor, RLS adversarial tabela a tabela, input/injeção e bomba de custo
- 🚫 Zero falso-positivo por design (regras explícitas anti-falso-positivo)
- 📄 Relatório único, `relatorio-seguranca-lgpd-deploy.md`, por severidade

---

### 🎯 PROMPT (EXECUTE ISTO):

```
Você atuará simultaneamente como três especialistas, aplicando o julgamento de cada um ao domínio
correspondente — não trate os três checklists com o mesmo critério de avaliação:

1. AppSec / DevSecOps — para os blocos "Segurança Front-End" e "Segurança Back-End". Critério:
   aderência a práticas técnicas reconhecidas (OWASP ASVS, OWASP Top 10, CWE).
2. Especialista em conformidade LGPD — para o bloco "LGPD Específico". Critério: conformidade
   regulatória (Lei 13.709/2018), não apenas boa prática técnica. Ausência de um item aqui é risco
   legal, não só risco técnico.
3. DevOps / SRE — para o bloco "Checklist de Deploy". Critério: configuração operacional correta do
   ambiente, que pode estar fora do repositório de código (infraestrutura, provedor de hospedagem,
   CDN, painel do Supabase).

Modo de operação: estritamente leitura. Você audita e relata. Você nunca aplica correções, nunca
edita arquivos de configuração, nunca gera patches — apenas descreve o problema e a sugestão de
correção em texto, de forma clara o suficiente para que uma LLM (ou humano) aplique a correção
posteriormente, em outra etapa.

ETAPA 0 — AUTO-DETECÇÃO DE CONTEXTO (SOMENTE LEITURA)
Antes de avaliar qualquer item, identifique automaticamente, com base no código-fonte real:
- Framework(s) front-end e back-end em uso
- Se há backend próprio, BaaS (ex: Supabase/Firebase) ou é front-end puro consumindo API externa
- Mecanismo de autenticação/sessão realmente implementado (JWT em localStorage? cookie HttpOnly?
  sessão via BaaS?)
- Presença de arquivos de configuração de deploy/infra (.env, .env.example, configs de CDN,
  next.config, vercel.json, nginx.conf, headers customizados, CI/CD)
- Se o projeto lida com dados pessoais de usuários (formulários de cadastro, dados de contato, dados
  de pagamento, cookies de rastreamento) — isso determina se o bloco LGPD é aplicável e em que
  profundidade

Regra explícita: itens cuja evidência dependeria de configuração de infraestrutura externa ao
repositório (ex: CDN, WAF, painel de provedor, DNS) não podem ser classificados como "Não
implementado" só porque não aparecem no código. Devem ser classificados como "Não verificável no
repositório", com uma nota indicando onde essa verificação precisaria ocorrer (painel do provedor,
configuração de infra, etc.).

ETAPA 0.5 — GATE DE APLICABILIDADE (OBRIGATÓRIO, RESUMO SEM PAUSAR A EXECUÇÃO)
Após a Etapa 0, apresente uma tabela resumida de aplicabilidade para todos os itens do checklist
(as 4 categorias), com três colunas:

| Item | Aplicável ao projeto? (Sim/Não/Incerto) | Justificativa breve |

Critérios de "Não aplicável" (exemplos, não exaustivo):
- Item de Row-Level Security (RLS) se o projeto não usa Supabase/Postgres
- Item de CDN/DDoS se não há evidência de camada de CDN no projeto
- Item de cookie banner se o projeto não coleta dados pessoais nem usa cookies de rastreamento

Registre essa tabela no relatório e prossiga automaticamente para a verificação detalhada de
conformidade (Etapa 1), sem pedir autorização — a execução já foi solicitada ao rodar este prompt.
Solicite intervenção humana apenas se um item "Incerto" tiver impacto tão grande na classificação
dos demais que prosseguir sem esclarecer geraria retrabalho real (ex: não dá para saber se há
camada de auth alguma).

ETAPA 1 — VERIFICAÇÃO DETALHADA DE CONFORMIDADE
Para cada item marcado como "Aplicável" ou "Incerto" na Etapa 0.5, verifique:

1. Status: Conforme / Não conforme / Parcialmente conforme / Não verificável no repositório
2. Evidência: caminho de arquivo e linha (arquivo.ext:linha) sempre que a verificação for possível
   no código. Nunca afirme um status sem evidência correspondente.
3. Severidade (somente quando Não conforme ou Parcialmente conforme):

   | Nível | Segurança (Front/Back) | LGPD | Deploy |
   |---|---|---|---|
   | Crítico | Exploração remota direta (ex: XSS, SQL injection, secret exposto no client) | Violação direta da lei com risco de sanção (ex: sem base legal, sem opção de exclusão de conta) | Vulnerabilidade exposta em produção (ex: .env versionado, CORS aberto para * com credenciais) |
   | Alto | Falha que facilita exploração (ex: sem rate limiting, sem CSRF em ação sensível) | Item obrigatório ausente mas sem exposição imediata de dados (ex: política de privacidade incompleta) | Header de segurança ausente, sem HTTPS forçado |
   | Médio | Boa prática ausente que reduz defesa em profundidade | Processo documentado mas não automatizado (ex: retenção manual, não automática) | Ausência de monitoramento/backup automatizado |
   | Baixo | Melhoria incremental, sem risco prático imediato | Redação/documentação a melhorar sem risco de conformidade | Ajuste de configuração sem impacto de segurança |

4. Descrição do problema: o que está errado e por quê, em linguagem que uma LLM consiga interpretar
   sem ambiguidade.
5. Sugestão de correção: em texto/pseudocódigo, nunca aplicada diretamente — descreva a mudança
   necessária (ex: "mover token JWT de localStorage para cookie HttpOnly com flag Secure e
   SameSite=Strict", não apenas "corrigir armazenamento do token").

REGRAS ANTI-FALSO-POSITIVO
Antes de marcar qualquer item como "Não conforme", verifique:
- Armazenamento em localStorage: só é violação se o dado armazenado for sensível (token de sessão,
  dado pessoal, dado de pagamento). Preferências de UI (tema, idioma) não são violação.
- CSP ausente via header não é automaticamente "Não conforme" se houver CSP via <meta> tag
  equivalente — verificar ambos antes de reportar.
- RLS "ausente": só se aplica se o projeto de fato usa Supabase/Postgres como camada de dados; se
  não usa, o item é "Não aplicável", não "Não conforme".
- Rate limiting "ausente" no código: verificar se não está implementado em camada de infraestrutura
  (proxy, API Gateway, middleware de plataforma) antes de reportar como ausente — se não houver
  evidência de nenhuma camada, classificar como "Não verificável" com nota, não "Não conforme", a
  menos que haja confirmação de que não existe camada de infra nenhuma.
- Sanitização de output: frameworks modernos (React, Vue) já escapam por padrão — só reportar se
  houver uso explícito de dangerouslySetInnerHTML, v-html, innerHTML ou equivalente sem sanitização
  adicional.
- Cookie banner/LGPD: só é obrigatório se o projeto de fato coleta dados pessoais ou usa cookies não
  estritamente necessários — não reportar como ausente em projetos que não coletam nada.

Cada vez que um item for classificado como "Não aplicável" ou "Não verificável", registre a
justificativa explicitamente no relatório — nunca omita a linha, para que quem ler entenda que o
item foi avaliado e não apenas esquecido.

REGRAS NÃO-NEGOCIÁVEIS
- Modo estritamente read-only: nenhuma alteração de código, configuração ou dependência.
- Nenhuma suposição não confirmada: se não for possível determinar o status de um item com o que
  está disponível, classifique como "Não verificável" e explique o que seria necessário para
  verificar (ex: acesso ao painel do Supabase, acesso ao provedor de hospedagem).
- Terminologia agnóstica de ferramenta específica — descreva o problema e a solução em termos
  técnicos gerais, não amarrados a uma stack específica, exceto quando a auto-detecção da Etapa 0
  identificar a stack real do projeto (nesse caso, use os termos exatos da stack detectada).
- Registrar a tabela da Etapa 0.5 no relatório e seguir direto para a verificação completa, sem
  pausar para aprovação — a autonomia já foi concedida ao executar este prompt.
- Nunca gerar ou sugerir patch de código pronto para aplicar automaticamente — apenas descrição
  textual da correção.

FORMATO DE SAÍDA
Gerar um arquivo relatorio-seguranca-lgpd-deploy.md estruturado assim:

# Relatório de Auditoria — Segurança, LGPD e Deploy

## Resumo Executivo
- Total de itens avaliados / aplicáveis / não aplicáveis / não verificáveis
- Distribuição por severidade (Crítico / Alto / Médio / Baixo)

## 1. Segurança Front-End
### [Nome do item]
- Aplicável: Sim/Não/Incerto — justificativa
- Status: Conforme / Não conforme / Parcialmente conforme / Não verificável
- Severidade: (se aplicável)
- Evidência: arquivo:linha
- Problema: ...
- Sugestão de correção: ...

## 2. Segurança Back-End
(mesmo formato)

## 3. LGPD Específico
(mesmo formato)

## 4. Checklist de Deploy
(mesmo formato)

## Itens Não Verificáveis no Repositório
Lista consolidada com o que seria necessário para verificar cada um.
```

---

### 📊 RESULTADO ESPERADO:
Um relatório único de auditoria mostrando:
- 🔍 **Contexto detectado** (ex: "Next.js + Supabase, autenticação via JWT em localStorage — evidência: `src/lib/auth.ts:22`")
- 🚦 **Gate de aplicabilidade** (ex: tabela com todos os itens do checklist — "Item RLS: Aplicável (Sim) — projeto usa Supabase/Postgres")
- 🔴 **Crítico de segurança** (ex: `src/lib/auth.ts:22` — token JWT salvo em `localStorage`, vulnerável a XSS; sugestão: mover para cookie HttpOnly + Secure + SameSite=Strict)
- 🟠 **Alto de LGPD** (ex: formulário de cadastro em `src/app/signup/page.tsx` coleta CPF sem checkbox de consentimento explícito nem link para política de privacidade)
- 🟡 **Médio de deploy** (ex: sem rotina de backup automatizado documentada para o banco Supabase)
- ⚪ **Não verificável no repositório** (ex: "Rate limiting: não há evidência de camada de proxy/API Gateway no código — verificar se está configurado no painel do provedor de hospedagem")
- ⚫ **Não aplicável** (ex: "Item de cookie banner: Não aplicável — projeto não usa cookies de rastreamento nem coleta dados pessoais, evidência: nenhum formulário de captura encontrado")

Executando o PROMPT 2 em sequência, o relatório ganha as seções 5–9 (módulos de ataque).

---

## ✅ PROMPT 2: MÓDULOS DE ATAQUE (READ-ONLY)

### 📖 O QUE ESTE PROMPT FAZ:
Diferente do PROMPT 1 — que **verifica conformidade contra checklists** —, o PROMPT 2 **ataca o código como um invasor atacaria**: enumera rotas, endpoints, tabelas, buckets e operações caras, e tenta quebrar cada um deles estaticamente. A persona aqui é um **Red Team de código em modo read-only** (AppSec), reutilizando o critério OWASP ASVS/Top 10/CWE.

São cinco módulos, executados em sequência:

1. **Varredura de Secrets e Credenciais** — inclui lista de rotação ("credencial que já tocou um commit é queimada") e verificações manuais de histórico do git
2. **Teste de Autenticação como um Invasor** — matriz de sessão por rota, ciclo de vida de sessão, abuso de reset
3. **Interrogatório do Banco de Dados** — RLS/autorização tabela a tabela, com queries adversariais entre usuários
4. **Auditoria de Input e Injeção** — SQL/NoSQL, execução de código, uploads, XSS
5. **Checagem de Bomba de Custo** — rotas de IA, brute force, e-mail/SMS, queries sem teto, medição fail-closed

Herda do PROMPT 1: o contrato read-only, a regra de evidência (`arquivo:linha`), os níveis de severidade (Crítico/Alto/Médio/Baixo — coluna "Segurança (Front/Back)" da matriz do PROMPT 1), a classificação "Não verificável no repositório" e as regras anti-falso-positivo. Achados já reportados nas seções 1–4 do PROMPT 1 recebem **referência cruzada** ("já reportado na seção N"), nunca duplicata — o PROMPT 2 só adiciona o que a passada de conformidade não enxerga (histórico, padrões adversariais, exposição de custo).

---

### 🎯 PROMPT (EXECUTE ISTO):

```
Você atuará como um pentester ofensivo em modo estritamente read-only: enumera a superfície de
ataque do projeto, tenta quebrá-la por raciocínio estático sobre o código e relata. Você nunca
aplica correções, nunca edita arquivos, nunca gera patches, nunca executa comandos, queries ou
código — apenas descreve o problema e a sugestão de correção em texto.

CONTRATO DE EXECUÇÃO (herdado do PROMPT 1 acima)
- Estritamente leitura: nenhuma alteração de código, configuração ou dependência; nenhuma
  execução de comando git, query de banco ou chamada a endpoint — só análise estática.
- Toda evidência: arquivo:linha. Nunca afirme um status sem evidência correspondente.
- Severidade: use os níveis Crítico/Alto/Médio/Baixo da matriz do PROMPT 1 (coluna "Segurança
  (Front/Back)"). Achado já reportado nas seções 1–4 do PROMPT 1 recebe referência cruzada
  ("já reportado na seção N") em vez de duplicata.
- As regras anti-falso-positivo do PROMPT 1 continuam valendo, além das específicas de cada
  módulo abaixo. Itens dependentes de infraestrutura externa ao repositório são "Não verificável
  no repositório", nunca "Não implementado".

ETAPA 0 — RECONHECIMENTO OFENSIVO (SOMENTE LEITURA)
Mapeie, com base no código real, a superfície de ataque:
- Todas as rotas/endpoints (método + se verificam sessão no servidor)
- O modelo de dados: tabelas/coleções, policies (RLS ou equivalente) ou camada de autorização
  aplicada na aplicação (middleware, scoping de ORM)
- Integrações pagas: chamadas a APIs de IA/LLM, envio de e-mail, SMS, pagamento
- Fluxos de upload de arquivos e onde dados sensíveis trafegam (client ↔ server ↔ banco)
Registre esse mapeamento no início do relatório — ele fundamenta os módulos seguintes.

ETAPA 0.5 — GATE DE MÓDULOS (OBRIGATÓRIO, RESUMO SEM PAUSAR A EXECUÇÃO)
Apresente uma tabela resumida de aplicabilidade dos 5 módulos:

| Módulo | Aplicável ao projeto? (Sim/Não/Adaptar) | Justificativa breve |

Critérios (exemplos, não exaustivo):
- Sem fluxo de auth próprio (BaaS gerencia a sessão): Módulo 2 restringe-se às rotas que consomem
  a sessão e à configuração do ciclo de vida no provedor
- Sem Supabase/Postgres: Módulo 3 adapta-se à camada de autorização equivalente (scoping de ORM,
  middleware de autorização) — nunca é simplesmente pulado se há dado de usuário no projeto
- Sem rotas de IA/LLM nem envio de e-mail/SMS: Módulo 5 perde esses sub-itens, mantém o resto

Registre a tabela no relatório e prossiga automaticamente para os módulos aplicáveis, sem pedir
autorização — a execução já foi solicitada ao rodar este prompt.

MÓDULO 1 — VARREDURA DE SECRETS E CREDENCIAIS (papel: DevSecOps de credenciais)
Verifique:
1. Chaves de API, tokens, senhas, private keys ou connection strings hardcoded em qualquer arquivo
2. Arquivos .env versionados ou ausentes do .gitignore (compare o conteúdo do .gitignore com os
   arquivos presentes no repositório)
3. Secrets no histórico de commits — veja regra específica abaixo
4. Secrets embarcados no bundle client: variáveis públicas (ex: NEXT_PUBLIC_) carregando credencial
   real, chaves em componentes client, valores sensíveis renderizados no HTML
5. Chaves públicas/anon executando operação privilegiada (bypass de RLS, invocação de RPC
   privilegiada, acesso a rotas administrativas)
Regra sobre histórico de commits: você não executa comandos git — o modo é estritamente read-only
e a análise cobre o estado atual dos arquivos. Para o histórico, classifique como "Não verificável
no repositório (histórico)" e monte a seção "Verificações Manuais de Histórico" com os comandos
exatos que o mantenedor deve rodar localmente (ex: git log --all --full-history -- .env,
git log -p -S "<prefixo-identificador-da-chave>", ou um scanner dedicado como gitleaks/trufflehog).
Regra conservadora: credencial presente em arquivo versionado = queimada (comprometida); credencial
apenas em arquivo ignorado = rotacionar preventivamente se não for possível confirmar o histórico.
Saída obrigatória deste módulo:
- Tabela: arquivo:linha | o que vazou | como um atacante encontra | severidade | correção sugerida
- Lista de Rotação: toda credencial comprometida ou sob suspeita, com a instrução de revogar e
  emitir nova — remover do código atual não resolve
- Seção "Verificações Manuais de Histórico (git)" com os comandos para o mantenedor

MÓDULO 2 — TESTE DE AUTENTICAÇÃO COMO UM INVASOR (papel: pentester de auth)
Verifique:
1. Matriz por rota/endpoint sensível: rota | método | verificação de sessão no servidor? |
   evidência. Toda rota que lê ou muta dado de usuário precisa de verificação server-side —
   proteção apenas no client (redirect, esconder botão) não conta.
2. Armazenamento de sessão: onde o token vive (localStorage com token de sessão é violação —
   regra do PROMPT 1), flag HttpOnly/Secure/SameSite em cookies
3. Ciclo de vida da sessão: expiração configurada, logout invalidando a sessão de fato,
   troca de senha invalidando sessões antigas em todos os dispositivos
4. Regras de senha: comprimento mínimo, checagem contra senhas vazadas, ausência de requisitos
   arbitrários que degradem segurança real
5. Abuso de reset de senha e verificação de e-mail: token previsível, sem expiração, reutilizável,
   possibilidade de trocar o e-mail da conta sem re-verificação, e o uso do app com e-mail não
   verificado

MÓDULO 3 — INTERROGATÓRIO DO BANCO DE DADOS (papel: especialista em autorização de dados)
Verifique (raciocínio estático sobre schema, policies e código — você não executa queries):
1. Auditoria tabela a tabela: tabela | SELECT | INSERT | UPDATE | DELETE | filtro da policy |
   evidência. Tabela alcançável com a chave pública e sem RLS/policy é Crítico. Policies ausentes
   em operações de escrita (INSERT/UPDATE/DELETE), não só SELECT.
2. Queries adversariais entre usuários: para cada tabela, descreva a query que o usuário A
   tentaria para ler ou editar linhas do usuário B e determine, analisando schema e policies,
   se ela seria bloqueada
3. Policies que filtram por valor enviado pelo client (user_id vindo do body, header ou query
   string) em vez de auth.uid() ou equivalente server-side
4. Buckets de storage: públicos sem necessidade, sem política por objeto, ou com nome/URL
   previsível permitindo acesso cruzado entre usuários
Anti-falso-positivo herdado: só se aplica a RLS se o projeto usa Supabase/Postgres; senão,
adapte à camada de autorização equivalente e registre a adaptação no relatório.

MÓDULO 4 — AUDITORIA DE INPUT E INJEÇÃO (papel: especialista em validação de entrada)
Trace todo caminho onde input do usuário alcança algo perigoso:
1. SQL/NoSQL: queries raw com concatenação de string ou template literal em vez de parâmetros;
   operadores/objetos injetáveis em drivers NoSQL
2. exec: input passado a eval, new Function, child_process ou comandos de shell
3. Uploads: filename sanitizado? tipo verificado server-side (magic bytes, não só content-type)?
   é possível subir um executável ou fazer path traversal (contorno de caminho) com ../
4. XSS: conteúdo user-controlled renderizado como HTML sem escape — dangerouslySetInnerHTML,
   v-html, innerHTML, markdown renderizado sem sanitizer, href="javascript:" montável
5. Endpoints sem validação server-side nenhuma (aceitam payload arbitrário, sem schema validation)
Anti-falso-positivo herdado: frameworks modernos (React, Vue) escapam por padrão — só reportar
com uso explícito das formas acima sem sanitização adicional.

MÓDULO 5 — CHECAGEM DE BOMBA DE CUSTO (papel: SRE + AppSec de abuso de recursos)
Encontre todo endpoint que custa dinheiro ou recurso quando chamado, e verifique a proteção:
1. Rotas que disparam chamadas a IA/LLM: o que impede um script de chamá-la 100.000 vezes hoje?
   Verifique auth, limite por usuário, limite por IP
2. Login, signup e reset de senha: rate limits, proteção contra bots, e se diferenças na resposta
   permitem enumerar e-mails válidos
3. Rotas de envio de e-mail ou SMS que alguém pode usar para disparo reincidente
4. Queries caras ou exports sem teto: ausência de LIMIT, agregações sobre tabelas inteiras
   alimentadas por input do client, page size ilimitado
5. Medição de uso: é aplicada server-side e falhe fechado (fail-closed: sem medição válida,
   bloquear)? Medição feita apenas no client é burlável
Anti-falso-positivo herdado: rate limiting pode estar na camada de infraestrutura (proxy, API
Gateway, middleware de plataforma) — sem evidência de nenhuma camada, classifique como "Não
verificável no repositório", não "Não conforme".

REGRAS ANTI-FALSO-POSITIVO ESPECÍFICAS DOS MÓDULOS
- .env.example com valores placeholder (your-api-key-here, changeme) não é vazamento
- Chave pública/anon no client não é violação por si só — só se executar operação privilegiada
- Constantes de teste/demonstração visivelmente fictícias não são credenciais reais — confirme
  o formato antes de reportar
- ORM com queries parametrizadas (Prisma, Drizzle, etc.) não é injection — só interpolação em
  raw queries conta
- Área autenticada de administração não entra no escopo de teste de abuso do Módulo 5
- Cada classificação "Não aplicável" ou "Não verificável" deve ter a justificativa registrada
  explicitamente no relatório

FORMATO DE SAÍDA
Anexe as seções abaixo ao relatorio-seguranca-lgpd-deploy.md gerado pelo PROMPT 1. Se o relatório
ainda não existir nesta sessão (PROMPT 2 executado isoladamente), crie o arquivo contendo apenas
o Resumo Executivo (com os totais dos módulos) + as seções 5–9.

## 5. Secrets e Credenciais
(tabela: arquivo:linha | o que vazou | como o atacante encontra | severidade | correção)
### Lista de Rotação
### Verificações Manuais de Histórico (git)

## 6. Autenticação e Sessão
(matriz de rotas + achados no formato padrão: Status/Evidência/Severidade/Problema/Sugestão)

## 7. Banco de Dados — Acesso entre Usuários
(matriz tabela a tabela + achados)

## 8. Input e Injeção
(achados)

## 9. Exposição de Custo
(achados)
```

---

### 📊 RESULTADO ESPERADO:
- 🔑 **Linha na tabela de secrets** (ex: `src/lib/stripe.ts:12` — chave secreta hardcoded; atacante encontra no bundle client; Crítico; sugestão: mover para variável de ambiente server-only + rotacionar)
- 🚪 **Linha na matriz de auth** (ex: `app/api/orders/route.ts` — sem verificação de sessão; usuário não autenticado lê pedidos de qualquer conta; Crítico)
- 🗄️ **Achado adversarial de banco** (ex: policy de SELECT em `documents` filtra por `user_id` do header em vez de `auth.uid()` — usuário A lê documentos do usuário B; Crítico)
- 💉 **Achado de input** (ex: markdown de comentário renderizado via `dangerouslySetInnerHTML` sem sanitizer em `src/components/comment.tsx:40` — XSS armazenado; Alto)
- 💸 **Achado de custo** (ex: `/api/ai/summarize` sem rate limiting nem teto por usuário — chamada em loop esgota a cota da API de LLM; Alto)
- ⚪ **Não verificável no repositório (histórico)** (ex: "não é possível confirmar se a chave em `.env` já passou por commits — rodar `git log -p -S 'sk_live_'` localmente; rotação preventiva recomendada")

---

## 🔗 Onde Este Documento Se Encaixa

Diferente do Doc 5 (qualidade de código — SOLID/DRY/código morto), este documento audita **segurança, conformidade legal e prontidão operacional**, além de executar a varredura ofensiva — os três com critérios de julgamento diferentes entre si. O documento em si é sequenciado: **PROMPT 1 (conformidade) → PROMPT 2 (módulos de ataque)**, ambos read-only, idealmente na mesma sessão para o relatório único consolidar as seções 1–9. Ordem recomendada:

1. **Doc 5 (Auditoria de código)** e/ou **Doc 6 (Segurança/LGPD/Deploy)** — ambos são read-only e podem rodar em qualquer ordem, inclusive em paralelo, já que avaliam domínios diferentes
2. **Doc 1 (Front-End)**, **Doc 2 (Full-Stack)** e/ou **Doc 3 (Backend)** — corrija os achados críticos/altos de segurança primeiro (Prompt de Segurança OWASP em cada documento, incluindo os dos módulos de ataque), depois o restante
3. **Doc 4 (Testes)** — cobertura de testes sobre o código já corrigido

**Quando é obrigatório rodar:** antes de qualquer deploy em produção que lide com dados pessoais de usuários brasileiros — o bloco LGPD trata ausência de item como risco legal, não apenas técnico.

---

**Documento gerado com Engenharia de Prompt Profissional**
**Especialização: Segurança, LGPD, Deploy & Módulos de Ataque | Read-Only | Agnóstico de Stack | Status: Pronto para Execução 10/10**
