# LinkedIn e Currículo — Unificando (Laboratório de Projetos Autorais / P&D)

> Como usar: cole os bullets abaixo como **texto plano** na descrição da experiência no LinkedIn
> (a plataforma não renderiza markdown — remova os `**` e listas, ou use o editor de rich text).
> No currículo PDF, use a versão enxuta da seção 5.

---

## 1. Cabeçalho da experiência (já configurado)

- **Cargo:** Software Engineer / Criador de Produtos
- **Empresa:** Unificando · Laboratório de Projetos Autorais / P&D
- **Período:** nov de 2025 — o momento (Meio período)
- **Local:** Paulista, Pernambuco, Brasil

---

## 2. Bullets por projeto (prontos para o LinkedIn)

### Radar Unificando — job board + assistente de carreira com IA
> Link para adicionar como Mídia/Atividade: https://radar.unificando.com.br · GitHub: https://github.com/renatojuniordw/radar-unificando

- **Radar Unificando** — Plataforma de busca de vagas em tempo real, para todas as áreas e modalidades (remoto, híbrido, presencial), integrando **Gupy via MCP oficial** com fallback automático para a API REST da InHire — sem base pré-carregada: cada consulta busca ao vivo nas plataformas.
- **Assistente de carreira com IA**: importa o currículo (PDF exportado do LinkedIn ou texto), calcula **score ATS 0-100**, gera carta de apresentação, currículo adaptado por vaga, perguntas de entrevista e recomenda cursos para fechar lacunas técnicas.
- **Robustez em produção**: defesa contra **prompt injection em 3 camadas** (validação de input, detecção de jailbreak, hardening de system prompt), **redação LGPD automática** (CPF/CNPJ/RG/telefone) e limites de custo (100k tokens/dia e 2M/mês por usuário) para manter o produto 100% gratuito, sustentado por doações via PIX.
- **Stack & extras**: Next.js 16, Prisma, Redis, Vercel AI SDK, Auth.js, IndexedDB (anônimo, sem conta) e extensão Chrome (MV3, side panel) em homologação na Chrome Web Store.

### Med Unificando — busca semântica em dados abertos da ANVISA
> Link: https://med.unificando.com.br · GitHub: https://github.com/renatojuniordw/med-unificando

- **Med Unificando** — Busca semântica em linguagem natural sobre **medicamentos intercambiáveis da ANVISA** com **embeddings 100% locais** (Xenova Transformers / ONNX, modelo all-MiniLM-L6-v2) — nenhum dado de busca trafega para APIs externas de IA.
- Comparação de medicamentos lado a lado, **preços máximos da tabela CMED**, navegação pela árvore de classificação **ATC**, exportação CSV/Excel/PDF e **sincronização automática** dos dados abertos da ANVISA.
- Container de produção endurecido (rootfs read-only, `cap_drop ALL`, usuário non-root) e rate limiting de 60 req/min.

### Unificando PDF — suíte de 16 ferramentas com privacidade por design
> Link: https://pdf.unificando.com.br · GitHub: https://github.com/renatojuniordw/pdf-unificando

- **Unificando PDF** — Suíte com **16 ferramentas de PDF** (compressão, divisão, conversão Word/JPG/PNG/Markdown, proteção, censura, numeração…) com **processamento efêmero**: arquivos em `/tmp` descartados após o download, sem persistência — privacidade por design, sem cadastro.
- **Engine híbrida**: orquestração de bibliotecas TypeScript (pdf-lib, pdfjs-dist) com binários nativos (Ghostscript, LibreOffice, Poppler, qpdf) e fila com controle de concorrência para estabilidade sob picos.

### Engenharia de IA & Automação (atendimento multicanal)
- Agentes de IA (GPT) para **automação de atendimento em WhatsApp/Instagram** com **detecção de intenção e sentimento** para roteamento dinâmico; agentes de triagem com **saída estruturada JSON via n8n**, **RAG sobre Google Docs** e persistência de estado no **Supabase**.
- Integração com a **Instagram Graph API** para automação de respostas a comentários com conversão estruturada para conversas privadas (DM).

### Estudo de Caso — Cliente de Advocacia (DataJud / CNJ)
- Agente jurídico via WhatsApp integrado à **API oficial do CNJ (DataJud)** para consultas processuais, **validação de documentos**, cache de dados e **handoff estruturado** para atendimento humano.

### prompts-unificando — biblioteca de prompts como pacote npm/CLI
> npm: https://www.npmjs.com/package/prompts-unificando

- Biblioteca de prompts publicada como **pacote npm / CLI** (`npx prompts-unificando list`) com 6 templates versionados — frontend, fullstack, backend, testes, auditoria de engenharia e segurança/LGPD — **agnóstica de stack e de LLM** (Claude, ChatGPT, Gemini).

### promptcraft-unificando — CLI de engenharia de prompt via npx
> npm: https://www.npmjs.com/package/promptcraft-unificando · GitHub: https://github.com/renatojuniordw/promptcraft-unificando

- CLI instalável via **npx** que monta um prompt de "Engenheiro de Prompt" a partir do texto cru do usuário e imprime no stdout — pronto para **pipe em CLIs de LLM** (validado com Claude Code e Gemini CLI).
- Flags: `--project` (ativa contexto de arquitetura do projeto atual) e `--save` (persiste o resultado como `.md`). Publicado no npm com **131 downloads semanais** em poucos dias.

---

## 3. Bullets consolidados (se preferir menos entradas, agrupando por projeto)

- **Radar Unificando** — job board com busca de vagas em tempo real (Gupy via MCP oficial + InHire) e assistente de carreira com IA (score ATS 0-100, currículo adaptado, carta, entrevista simulada e recomendação de cursos); defesa contra prompt injection, LGPD por design e modelo gratuito viável via controle de tokens. → radar.unificando.com.br
- **Med Unificando** — busca semântica em linguagem natural sobre medicamentos da ANVISA com embeddings 100% locais (ONNX, sem APIs externas), preços CMED e sincronização automática de dados abertos. → med.unificando.com.br
- **Unificando PDF** — 16 ferramentas de PDF com processamento efêmero (sem persistência), engine híbrida TypeScript + binários nativos e fila com controle de concorrência. → pdf.unificando.com.br
- **Automação com IA** — agentes de triagem com saída JSON via n8n, RAG sobre Google Docs, detecção de intenção/sentimento e Instagram Graph API (comentário→DM).
- **Case Legal Tech** — agenté jurídico via WhatsApp com API do CNJ (DataJud), validação de documentos, cache e handoff para atendimento humano.
- **promptcraft-unificando / prompts-unificando** — ferramentas open-source publicadas no npm/npx para engenharia de prompt (biblioteca de templates e CLI para pipe em Claude Code/Gemini CLI).

---

## 4. Sugestão de atualização da seção "Sobre"

> Colar como novo sobr no LinkedIn, substituindo o texto atual:

```
Engenheiro de Software com +7 anos de experiência em front-end (React, Angular, Next.js) e
arquitetura de software (pós-graduação FIAP, certificações Microsoft). Nos últimos meses, foco em
IA Generativa aplicada a produtos reais: desenvolvo prodtos autorais completos no laboratório
Unificando — Radar Unificando (busca de vagas com assistente de carreira IA), Med Unificando
(busca semântica em dados da ANVISA com IA 100% local), Unificando PDF (suite de ferramentas),
além de agentes de atendimento com orquestração n8n, RAG e integrações com APIs públicas
(Gupy, Instagram, CNJ/DataJud). Busco construir produtos que unem performance, privacidade e
IA de forma sustentável.
```

---

## 5. Competências para adicionar no LinkedIn

- Desenvolvimento Front-end (React, Next.js, Tailwind) — já listado
- Inteligência Artificial Generativa — já listado
- **MCP (Model Context Protocol)** — novo
- **n8n / Workflow Automation** — novo
- **RAG (Retrieval-Augmented Generation)** — novo
- **Prompt Engineering** — já listado
- **LGPD / Privacidade por Design** — novo
- **Chrome Extension (MV3)** — novo
- **Graph API (Instagram)** — novo
- **Node.js / Serverless** — novo

---

## 5. Currículo PDF — versão enxuta (1-2 linhas por projeto)

- **Radar Unificando** — Busca de vagas em tempo real (Gupy via MCP oficial + InHire) e assistente de carreira IA: score ATS, currículo adaptado e carta; defesa contra prompt injection e LGPD por design. Next.js 16, Prisma, Redis.
- **Med Unificando** — Busca semântica sobre medicamentos da ANVISA com embeddings 100% locais (ONNX); preços CMED e sincronização automática de dados abertos.
- **Unificando PDF** — 16 ferramentas de PDF com processamento efêmero (privacidade por design); engine híbrida TS + binários nativos (Ghostscript, LibreOffice, Poppler, qpdf).
- **IA & Automação** — Agentes de atendimento (WhatsApp/Instagram) com triagem JSON via n8n, RAG e Instagram Graph API (comentário → DM).
- **Case Advocacia** — Agente jurídico via WhatsApp integrado ao CNJ (DataJud) com handoff humano.
- **prompts-unificando** — Biblioteca de prompts open-source como pacote npm/CLI.
- **promptcraft-unificando** — CLI via npx que monta prompts de engenheiro a partir de texto cru, com pipe validado em Claude Code e Gemini CLI (131 downloads/semana).

---

## 6. Checklist antes de publicar

- [ ] Substituir os `**` por negrito real no editor do LinkedIn (ou colar sem eles).
- [ ] Adicionar **Mídia** (print/protótipo) e o **link do site** em cada projeto (Radar, Med, PDF).
- [ ] Confirmar números antes de publicar: uso/métricas reais (ex.: resposta de horas → segundos no case de automação) — só inclua o que conseguir medir de forma honesta.
- [ ] Atualizar o **título** e a seção **Sobre** com as palavras-chave novas (MCP, RAG, n8n, LGPD).
- [ ] Reordenar a experiência para deixar Unificando destacado como "Fundador / Criador de Produtos".