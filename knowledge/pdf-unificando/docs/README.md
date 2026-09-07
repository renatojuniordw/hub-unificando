# Documentação — Unificando PDF (pdf-unificando)

Suite de ferramentas online para manipulação de PDFs (comprimir, juntar, dividir, converter, proteger, redigir, etc.), construída com **Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind CSS v4**.

Esta pasta reúne toda a documentação técnica do projeto. Cada arquivo tem uma responsabilidade única:

| Arquivo | Responsabilidade |
|---|---|
| [`architecture.md`](./architecture.md) | Visão geral da arquitetura: stack, camadas, fluxo de uma requisição, padrão de ferramenta e decisões de arquitetura |
| [`api.md`](./api.md) | Referência completa da API: as 19 rotas, envelope de erro, rate limiting, limites de upload e exemplos |
| [`data.md`](./data.md) | Modelo de dados: ausência de banco, configs estáticos, estado em memória e implicações |
| [`tools.md`](./tools.md) | Como funcionam as ferramentas e guia passo a passo para criar uma nova |
| [`development.md`](./development.md) | Guia de desenvolvimento: setup, scripts, lint, testes, cobertura e estrutura de `tests/` |
| [`deployment.md`](./deployment.md) | Deploy: Docker, docker-compose, nginx, healthcheck e atualização |
| [`security.md`](./security.md) | Postura de segurança: validação de upload, honeypot, rate limit, origem, headers, hardening |
| [`observability.md`](./observability.md) | Logs, analytics (GA4), Web Vitals, endpoint de health e o que monitorar |
| [`env-vars.md`](./env-vars.md) | Referência de variáveis de ambiente (nomes, defaults, onde são usadas) |
| [`projecao-futura-pdf.md`](./projecao-futura-pdf.md) | Roadmap e visão de produto (documento pré-existente) |

## Resumo do projeto

- **16 ferramentas** em `/ferramentas/*` (comprimir, juntar, dividir, extrair páginas, converter PDF↔Word/JPG/PNG/TXT/Markdown, JPG→PDF, rodar, organizar, proteger, marca d'água, numerar, redigir).
- **19 rotas de API**: `GET /api/health` + 18 `POST /api/pdf/*`.
- **Sem banco de dados**: conteúdo estático em `src/config/` (tools, tutorials) e estado apenas em memória (rate limit, fila).
- **Processamento PDF no servidor**: pdf-lib, pdfjs-dist, sharp, @napi-rs/canvas, Ghostscript, LibreOffice e poppler via `src/lib/pdf/*`.
- **Deploy**: Docker standalone + docker-compose + nginx (TLS, rate limit, limites de upload) em `pdf.unificando.com.br`.
- **Proxy/middleware ativo** (`src/proxy.ts`): valida origem, opcionalmente Bearer token, e injeta `x-request-id`.

## Links rápidos

- Código principal: `src/app/`, `src/lib/`, `src/components/`, `src/hooks/`
- Variáveis de ambiente: [`env-vars.md`](./env-vars.md)
- Criar nova ferramenta: [`tools.md`](./tools.md)
- Rodar localmente: [`development.md`](./development.md)
- Publicar: [`deployment.md`](./deployment.md)

## Convenções da documentação

- Escrita em PT-BR.
- Referências de código usam caminho relativo a partir da raiz do repo.
- Informações deriváveis do código (assinaturas, listas) podem envelhecer; quando divergirem, o **código é a fonte da verdade**.