# Regras de Negócio

## 1. Intercambialidade de Medicamentos

### Definição
Um medicamento **similar** é intercambiável com seu **medicamento de referência** quando atende aos requisitos da RDC 58/2014 da ANVISA.

### Regras
- Todo medicamento Similar possui um medicamento de Referência correspondente
- O farmacêutico pode substituir o medicamento de referência pelo similar (e vice-versa)
- Medicamentos Genéricos também são intercambiáveis com seus referências
- A intercambialidade não se aplica entre diferentes medicamentos de referência

## 2. Categorias ANVISA

| Categoria | Descrição | Origem |
|-----------|-----------|--------|
| Similar | Medicamento similar ao de referência | Registro ANVISA |
| Genérico | Medicamento genérico | Registro ANVISA |
| Novo | Medicamento inovador | Registro ANVISA |
| Específico | Indicação terapêutica específica | Registro ANVISA |
| Fitoterápico | Medicamento à base de plantas | Registro ANVISA |
| Biológico | Medicamento biológico | Registro ANVISA |
| Dinamizado | Medicamento homeopático | Registro ANVISA |
| Radiofármaco | Medicamento radioativo | Registro ANVISA |

Total: **32.661** registros de medicamentos (verificado 03/2026) — 32.658 referências distintas.
+ **53.422** preços CMED vinculados por número de registro.

## 3. Situação do Registro

- **Ativo**: registro válido e vigente → **10.273**
- **Inativo**: registro vencido, cancelado ou não renovado → **22.388**
- Medicamentos inativos não devem ser considerados para prescrição ou dispensação

## 4. Classificação ATC (Anatomical Therapeutic Chemical)

Sistema da OMS com 5 níveis hierárquicos para classificar medicamentos:

1. **Nível 1** (1 letra) — grupo anatômico: `N` = Sistema Nervoso
2. **Nível 2** (3 chars) — grupo terapêutico: `N06` = Psicoanalépticos
3. **Nível 3** (4 chars) — subgrupo farmacológico
4. **Nível 4** (5 chars) — subgrupo químico
5. **Nível 5** (7 chars) — princípio ativo específico

A aplicação navega pelos níveis 1-5 com:
- Busca textual + autocomplete com sugestões de código
- Navegação por teclado nos resultados
- Botões "Mostrar todos" para expandir/recolher listas longas
- Breadcrumbs hierárquicos (ATC > N1 > N2 > N3 > código)
- Paginação na lista de medicamentos
- Visualização em cards (mobile) ou tabela (desktop)

## 5. Preços CMED

A CMED define preços máximos por apresentação:

- **PF0**: Preço Fábrica sem ICMS
- **PF18**: Preço Fábrica com ICMS 18%
- Os preços são por apresentação (dosagem + embalagem)
- Exibidos em gráfico de barras (recharts) na página de detalhes, barras de progresso e tabela completa
- PDF exportável inclui tabela de preços

## 6. Busca por Descrição

### Arquitetura Híbrida com RRF Fusion

A busca combina **3 fontes** — pgvector (semântica), tsvector (keyword) e pg_trgm (trigram) — usando **Reciprocal Rank Fusion (RRF)** para combinar os rankings.

#### Busca Semântica (pgvector)

- Modelo: `Xenova/multilingual-e5-base` — 768 dimensões (processamento 100% local, zero custo de API)
- Texto indexado (prefixo `passage:`): nome + princípio ativo + forma farmacêutica + classe terapêutica + descrição ATC + indicações + sinônimos + concentração + categoria + tipo prescrição + detentor + situação + farmácia popular
- Índice: HNSW (cosine); `hnsw.ef_search` = 100 (`SEARCH.HNSW_EF_SEARCH`) para o `LIMIT` (topK × 5) não ser truncado no default de 40
- **Semantic Gate**: thresholds configuráveis em `SEARCH` (queries gerais vs. queries de nome de medicamento, mais restritivas)
  - Faixa fraca (`hardMin ≤ score < strong`): só aprova com suporte keyword/trigram
  - Faixa forte (`score ≥ strong`): aprova direto
  - **Exceção para condições**: queries de condição com confiança alta (`≥ CONDITION_GATE_MIN_CONFIDENCE`) aprovam na faixa fraca sem suporte textual — ex: "queimação e dor no estômago" → antiácidos ~0.84, mas o tsvector não cobre termos de condição compostos
- **Standalone threshold**: quando a busca semântica roda sozinha, threshold mais alto
- **Isenção de penalidade "sem suporte"**: resultados com score semântico ≥ `SEMANTIC_NO_SUPPORT_EXEMPT` (0.80) não recebem o multiplicador `NO_SUPPORT_PENALTY` no pós-processamento — a similaridade semântica já é evidência suficiente
- **Prioridade Ativo**: no ajuste de score, medicamentos com `status !== 'Ativo'` recebem penalidade moderada (`INACTIVE_STATUS_PENALTY` = 0.06) — o embedding não distingue status e registros suspensos/cancelados dominavam o topo

#### Busca Textual (tsvector)

- Índice GIN com stemming português; coluna `search_document` regular, populada por `generate-tsvector.ts` (resolve nomes de forma farmacêutica/ATC)
- Mapa de sinônimos médicos (`SYNONYM_MAP` em `dictionaries/synonyms.ts`, 23+ entradas; ex: "coração" ↔ "cardíaco", "pressão" ↔ "hipertensão")
- **Synonym expansion**: termos médicos são expandidos automaticamente antes da consulta
- **Compound subject parsing**: expressões compostas (ex: "ácido acetilsalicílico") são analisadas como unidades

#### Busca Trigram (pg_trgm)

- Índice GIN trigram; operador `%` + `similarity` em `tradeName`/`activeIngredient`
- Thresholds próprios para queries gerais e de nome de medicamento

#### RRF Fusion

```
RRF(d) = 0.40/(60 + rank_semantica) + 0.35/(60 + rank_keyword) + 0.25/(60 + rank_trigram)
```

(k=60; pesos em `SEARCH.RRF_K`, `SEMANTIC_WEIGHT`, `KEYWORD_WEIGHT`, `TRIGRAM_WEIGHT`)

#### Score Adjustments / Pós-processamento

- Feedback dos usuários (útil/não útil) gera **boost** ou **penalty** no score final
- Boosts/penalties são aplicados por medicineId e tipo de query
- Ajustes normalizados para evitar distorção dos resultados
- Penalidade de falso positivo por substring, boost por match de nome (exato/prefixo/princípio ativo), penalidade de fonte única e de falta de suporte

#### Fallbacks

- Sem resultados semânticos aprovados no gate → **fallback híbrido**: semânticos reprovados (mas com `score ≥ SEMANTIC_FALLBACK_MIN` = 0.80) são mesclados com keyword + trigram via RRF, reaproveitando o mesmo pipeline de pós-processamento/ajustes do caminho principal
- Apenas semântica disponível → **semântica pura**
- Fallbacks também persistem no `search_logs` (antes ficavam fora do analytics — "queries sem resultado" não podiam ser auditadas)

## 7. Farmácia Popular

### Definição
O programa Farmácia Popular do Ministério da Saúde disponibiliza medicamentos gratuitos para 12 indicações (hipertensão, diabetes, asma, osteoporose, dislipidemia, rinite, Parkinson, glaucoma, anticoncepção, diabetes mellitus + doença cardiovascular, incontinência urinária e dignidade menstrual).

### Regras
- Cada medicamento no banco pode ter a flag `farmaciaPopular = true` se seu princípio ativo estiver na lista oficial
- A lista é obtida do PDF oficial "Elenco de Medicamentos e Insumos PFPB" do Ministério da Saúde
- O matching é feito por **princípio ativo** (campo `activeIngredient`)
- A sincronização é manual via painel admin (`/admin/import`, card "5. Farmácia Popular")
- A lista contempla ~40 princípios ativos, cobrindo ~2.400 medicamentos da base ANVISA
- Cada sincronização é registrada em `SyncLog` (type: `farmacia-popular`)
- O campo é exibido como badge verde destacado **"✅ FARMÁCIA POPULAR"** na página de detalhe e **"FP"** nos resultados e tabelas

## 8. Sincronização com ANVISA

- Base atualizada via CSV dos Dados Abertos ANVISA
- Verificação do header `Last-Modified` antes de baixar (evita downloads desnecessários)
- **Importação por diff preservando IDs** (desde 2026-09-03): `src/lib/sync-diff.ts` casa as linhas por `reference` (multiplicidade para duplicatas) e executa apenas INSERT/UPDATE/DELETE do que mudou, **dentro de uma transação com advisory lock** — as URLs `/medicamento/[slug]` (ID preservado no sufixo), favoritos e comparações sobrevivem aos syncs (não é mais "apaga tudo e recria")
- **Trigger de tsvector** garante busca textual imediatamente após o import (preenche `search_document` no INSERT/UPDATE); refinamento em background melhora a qualidade com nomes ATC/forma resolvidos
- Preços CMED importados separadamente (na mesma transação com diff de medicamentos? preços: replace transacional simples)
- Farmácia Popular sincronizado separadamente (lista do Ministério da Saúde)
- **therapeuticClass**: sincronizado do CSV DADOS_ABERTOS_MEDICAMENTOS (campo `SUBSTANCIA` mapeado para classe terapêutica)
- **Embeddings**: sincronizados apenas para novos medicamentos (sem embedding existente), em batches de 50 — modelo `multilingual-e5-base` (768d). Para regeneração completa, usar `scripts/reindex-embeddings.ts`
- Cada sincronização é registrada em `SyncLog` (type, count, status, timestamp)

### Backfill Scripts

Scripts disponíveis para operações únicas de atualização em massa:

- `backfill-indications`: preencher indicações terapêuticas ausentes
- `backfill-therapeutic-class`: preencher classe terapêutica de registros existentes
- `add-active-ingredients`: popula princípios ativos de medicamentos que estão sem

## 9. Estatísticas (Dashboard)

O dashboard permite filtrar os dados por:
- **Ano**: filtra registros por ano de publicação
- **Categoria**: filtra por Similar, Genérico, Novo, etc.
- **Situação**: filtra por Ativo ou Inativo

Os filtros recalculam totais, top 10 medicamentos e top 10 princípios ativos em tempo real.

Uma **timeline interativa** exibe a evolução temporal dos registros ao longo dos anos, permitindo visualizar tendências de aprovação de medicamentos por categoria.

## 10. Relatório PDF

Cada medicamento possui um botão "Baixar PDF" que gera um relatório server-side com:
- Cabeçalho com a marca (Med Unificando)
- Informações completas do medicamento em grid 2 colunas
- Medicamento de referência (se houver)
- Tabela de preços CMED
- Rodapé com data de geração e fonte dos dados

Tecnologia: pdfmake (PdfPrinter API).

## 11. SEO

- Cada página de medicamento possui meta tags dinâmicas (title, description, OG)
- JSON-LD estruturado (Schema.org/MedicalDrug) para buscadores
- Sitemap com 32K+ URLs para indexação completa
- Robots.txt bloqueia áreas administrativas

## 12. PWA

Aplicativo instalável via navegador com `manifest.json`. Ideal para acesso mobile.

## 13. Segurança

- Rate limit por rota via `src/lib/rate-limit.ts`: `/api/medicines` 60/min, `/api/autocomplete` 120/min, `POST /api/search-feedback` 20/min
- **proxy.ts**: rate limit adicional para `POST /admin/login` (10/min)
- **CSP headers**: Content-Security-Policy configurado para evitar XSS e injeção (fontes self-hosted via next/font)
- Security headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- Docker: read-only filesystem, non-root user, sem privilégios
- Body size limit de 10MB para uploads
- Páginas `/admin/(protected)/*` exigem sessão; actions admin usam `withAdmin`; APIs de analytics/feedback exigem role `ADMIN`

## 14. Feedback de Busca

Usuários podem avaliar resultados como "útil" ou "não útil".

### Regras
- Feedback é armazenado em SearchFeedback (query, medicineId, medicineName, feedback)
- Score adjustments usam feedback para boost/penalty em buscas futuras
- Admin pode visualizar estatísticas e queries de baixa qualidade em /admin/search-feedback
- Dados ajudam a melhorar a relevância da busca continuamente

## 15. Classes Terapêuticas

### Definição
Campo therapeuticClass no modelo Medicine, importado do CSV DADOS_ABERTOS_MEDICAMENTOS da ANVISA.

### Regras
- Cada medicamento pode ter uma classe terapêutica associada
- Usado para filtro e agrupamento na busca avançada
- Indicações terapêuticas mapeadas por classe (therapeutic-class-indications.ts)
