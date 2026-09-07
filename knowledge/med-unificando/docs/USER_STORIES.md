# Histórias de Usuário

> Última revisão: 03/09/2026 — fluxos atualizados para o estado real da UI (compare via URL, busca semântica com guard de resposta, debounce no detentor, a11y/PWA).

## US-01: Consultar Medicamento por Referência

**Como** usuário do sistema  
**Quero** pesquisar um medicamento pelo número de registro ANVISA  
**Para** verificar rapidamente se o medicamento está na lista de intercambiáveis

**Critérios de Aceitação:**
- Campo de busca por referência com auto-complete server-side
- Navegação por teclado (setas, Enter, Escape — Enter submete o form ao confirmar sugestão ou diretamente)
- Resultados em tabela paginada (com seletor de itens por página)
- Colunas: referência, princípio ativo, nome comercial, detentor, categoria, situação
- Checkbox de seleção (com "Selecionar todos") para ações em lote / comparar
- Ao clicar no nome, abre página de detalhes com breadcrumbs
- Formulário submete por Enter (corrigido em 2026-09-03)

## US-02: Busca por Princípio Ativo e Categoria

**Como** profissional de saúde  
**Quero** buscar medicamentos por princípio ativo e filtrar por categoria  
**Para** encontrar rapidamente opções disponíveis

**Critérios de Aceitação:**
- Campo de busca com auto-complete
- Dropdown de categoria (Similar, Genérico, Novo, etc.)
- Pills de situação (Todos, Ativo, Inativo) com highlight visual
- Resultados paginados

## US-03: Comparar Medicamentos

**Como** farmacêutico  
**Quero** selecionar 2 ou mais medicamentos e compará-los lado a lado  
**Para** identificar diferenças de concentração, forma farmacêutica, detentor, tarja, ATC e preço

**Critérios de Aceitação:**
- Seleção por checkbox na tabela **ou** adição na página `/compare` via `CompareSearch` (autocomplete por referência/princípio ativo/nome comercial)
- Comparação em `/compare?ids=` — estado sincronizado com a URL (back/forward preserva a seleção; desde 2026-09-03)
- Tabela comparativa com campos lado a lado + destaque visual para campos diferentes (badge "DIFERENTE")
- Estado de erro com "Tentar novamente" se o carregamento falhar (desde 2026-09-03)

## US-04: Explorar Medicamentos de Referência

**Como** usuário  
**Quero** navegar pela lista de medicamentos de referência  
**Para** ver todos os similares intercambiáveis de cada referência

**Critérios de Aceitação:**
- Lista de referências com paginação (20/página)
- Barra de navegação A-Z para filtrar por letra inicial
- Ordenação por contagem, A-Z ou Z-A
- Badge com contagem de similares
- Campo de busca com debounce e proteção contra race condition
- Ao clicar, mostra grid com cards de similares
- Cada card mostra nome, princípio ativo, categoria, situação
- Links para página de detalhes

## US-05: Navegar por Classificação ATC

**Como** pesquisador  
**Quero** explorar medicamentos organizados por classificação ATC  
**Para** entender o panorama terapêutico disponível

**Critérios de Aceitação:**
- Visualização em árvore com 3 níveis (Anatômico → Terapêutico → Químico)
- Contagem de subcódigos por nível
- Drill-down por código
- Tabela de medicamentos com nome, princípio ativo, detentor, categoria, situação

## US-06: Ver Detalhes Completos do Medicamento

**Como** usuário  
**Quero** acessar uma página com todas as informações de um medicamento  
**Para** ter uma visão completa antes de tomar uma decisão

**Critérios de Aceitação:**
- Breadcrumbs de navegação
- 17 campos informativos (referência, princípio ativo, ATC, tarja, preços, etc.)
- Botão "Copiar" ao lado do número de registro
- Botão "Baixar PDF" que gera relatório formatado
- Link para consulta no sistema ANVISA
- Card com medicamento de referência (se houver)
- Lista de similares (se for referência)
- Gráfico de barras com preços CMED
- JSON-LD (Schema.org) para SEO
- Meta tags dinâmicas (title, description, OG)

## US-07: Explorar Medicamentos por Detentor

**Como** profissional  
**Quero** ver todos os medicamentos de um determinado laboratório  
**Para** analisar o portfólio de uma empresa

**Critérios de Aceitação:**
- Link clicável no nome do detentor na página de detalhes
- Página com cards (mobile) e tabela (desktop) de todos os medicamentos da empresa
- Campo de busca com autocomplete server-side
- Cards de resumo visual (total, ativos, inativos, categorias)
- Filtro por situação
- Contagem total, ativos e categorias
- Paginação dos resultados

## US-08: Dashboard com Estatísticas e Filtros

**Como** administrador ou usuário  
**Quero** filtrar as estatísticas por ano, categoria e situação  
**Para** analisar segmentos específicos da base de dados

**Critérios de Aceitação:**
- Dropdown de ano com os anos disponíveis
- Dropdown de categoria (Similar, Genérico, Novo, etc.)
- Pills de situação (Todos, Ativo, Inativo)
- Botão "Filtrar" que recalcula totais e rankings
- Botão "Limpar" que volta ao dashboard completo
- Total de medicamentos, distintos, ativos e inativos
- Top 10 medicamentos e princípios ativos
- Distribuição por categoria
- Timeline de registros por ano

## US-09: Sincronizar Base com ANVISA

**Como** administrador  
**Quero** sincronizar a base com os dados abertos mais recentes da ANVISA  
**Para** manter as informações atualizadas

**Critérios de Aceitação:**
- Botão "Sincronizar" na página admin
- Verificação de data via `Last-Modified` (só baixa se alterado)
- Indicador visual de carregamento
- Substituição completa dos dados
- Registro em SyncLog (type, count, status, timestamp)
- Seção separada para preços CMED
- Exibição de data do arquivo ANVISA e última sincronização

## US-10: Busca Semântica por IA

**Como** usuário  
**Quero** descrever o medicamento que preciso em linguagem natural  
**Para** encontrar resultados mesmo sem saber o nome exato

**Critérios de Aceitação:**
- Campo de texto livre na home
- IA 100% local (Xenova Transformers), sem custo de API
- Resultados ordenados por relevância semântica (score %)
- Contexto enriquecido: nome, princípio ativo, sinônimos, indicações
- Cards com link para detalhes, badge de categoria e situação

## US-11: Exportar Dados

**Como** usuário  
**Quero** exportar os resultados da busca  
**Para** analisar offline ou compartilhar

**Critérios de Aceitação:**
- Botão de exportar na página de resultados
- Formatos: CSV e XLSX
- Respeita os filtros aplicados na busca
- Colunas: todas as informações disponíveis

## US-12: Feedback de Resultados de Busca

**Como** usuário  
**Quero** avaliar se um resultado de busca foi útil ou não  
**Para** ajudar a melhorar a relevância das buscas

**Critérios de Aceitação:**
- Botões "Útil" / "Não útil" nos resultados de busca
- Feedback enviado via POST /api/search-feedback
- Sem necessidade de autenticação
- Feedback é usado para ajustar scores em buscas futuras

## US-13: Favoritar Medicamentos

**Como** usuário  
**Quero** salvar medicamentos como favoritos  
**Para** acessá-los rapidamente depois

**Critérios de Aceitação:**
- Botão de coração na página de detalhes e nos resultados
- Favoritos persistem no navegador (localStorage)
- Indicador visual de item favoritado
- Lista de favoritos acessível

## US-14: Busca Híbrida (Semântica + Textual)

**Como** usuário  
**Quero** descrever um medicamento em linguagem natural  
**Para** encontrar resultados mesmo sem saber o nome exato

**Critérios de Aceitação:**
- IA 100% local (Xenova Transformers), sem custo de API
- Combinação de busca semântica (pgvector) e textual (tsvector)
- Resultados ordenados por relevância (score de 0-100%)
- Score mínimo de 0.80 para relevância semântica (queries de condição com confiança alta aprovam a partir desse score mesmo sem suporte textual)
- Fallback híbrido quando a semântica não passa no gate: funde semânticos ≥ 0.80 com keyword + trigram via RRF

## US-15: Exportar Resultados

**Como** usuário  
**Quero** exportar os resultados da busca  
**Para** analisar offline ou compartilhar

**Critérios de Aceitação:**
- Botão de exportar na página de resultados
- Formatos: CSV e XLSX
- Respeita os filtros aplicados na busca
- Colunas: todas as informações disponíveis

## US-16: Navegar por Detentor

**Como** profissional  
**Quero** ver todos os medicamentos de um determinado laboratório  
**Para** analisar o portfólio de uma empresa

**Critérios de Aceitação:**
- Link clicável no nome do detentor na página de detalhes
- Página com tabela paginada de todos os medicamentos da empresa
- Contagem total, ativos e inativos

## US-17: Gerenciar Medicamentos (Admin)

**Como** administrador  
**Quero** buscar, visualizar e editar medicamentos  
**Para** corrigir informações ou atualizar dados manualmente

**Critérios de Aceitação:**
- Busca por referência, princípio ativo, nome comercial
- Visualização de todos os campos do medicamento
- Edição de campos como indicações, classe terapêutica
- Salvamento com atualização do timestamp

## US-18: Visualizar Feedback de Buscas (Admin)

**Como** administrador  
**Quero** ver estatísticas de feedback das buscas  
**Para** identificar queries de baixa qualidade e melhorar o sistema

**Critérios de Aceitação:**
- Total de feedbacks, úteis e não úteis
- Taxa de utilidade (helpful rate)
- Lista de queries de baixa qualidade
- Detalhamento por query

## US-19: Busca por Classe Terapêutica

**Como** profissional de saúde  
**Quero** filtrar medicamentos por classe terapêutica  
**Para** encontrar medicamentos de uma mesma categoria terapêutica

**Critérios de Aceitação:**
- Filtro de classe terapêutica na busca avançada
- Lista de classes disponíveis
- Resultados filtrados corretamente

## US-20: Autocomplete na Busca

**Como** usuário  
**Quero** ver sugestões enquanto digito na busca  
**Para** encontrar medicamentos mais rapidamente

**Critérios de Aceitação:**
- Sugestões aparecem após 2 caracteres
- Debounce de 300ms para evitar requisições excessivas
- Sugestões incluem nome, princípio ativo e categoria
- Navegação por teclado (setas, Enter)
