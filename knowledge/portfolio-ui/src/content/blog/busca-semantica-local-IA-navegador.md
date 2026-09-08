---
title: "IA local no navegador: busca semântica em 32 mil medicamentos sem um centavo de API"
description: "Como usar o modelo all-MiniLM-L6-v2 rodando 100% no servidor com Xenova Transformers para fazer busca por similaridade semântica em 32.585 registros — sem OpenAI, sem custo, sem dependência externa."
date: "2026-07-20"
tags:
  - IA
  - Machine Learning
  - TypeScript
  - Next.js
readingTime: "5 min"
---

## O problema

Sistemas de busca tradicionais são literais. Se o usuário digita "anti-inflamatório para articulação" e o banco só tem campos como "Diclofenato Sódico — Cápsula 50mg — Genérico", a busca textual falha. Zero resultados. Experiência frustrada.

A alternativa comum é chamar a API da OpenAI, mas isso significa:

- Custo por requisição
- Latência de rede
- Dependência de internet
- Dados trafegando para terceiros

E se desse pra fazer 100% local, no próprio servidor, sem pagar nada?

## A solução: embeddings + similaridade por cosseno

O [Med Unificando](https://med.unificando.com.br) é uma plataforma que consulta medicamentos intercambiáveis da ANVISA. São **32.585 medicamentos** com nome, princípio ativo, categoria, indicações, sinônimos e mais.

Cada medicamento foi convertido em um vetor numérico de **384 dimensões** — um embedding. Quando o usuário faz uma busca em linguagem natural, a query também é convertida em embedding, e o servidor calcula a similaridade por cosseno com todos os 32 mil vetores.

O resultado? O usuário digita "remedio pra pressao" e encontra Losartana, Enalapril, Hidralazina — ordenados por relevância semântica.

## A stack

| Componente | Tecnologia |
|------------|-----------|
| Modelo | `Xenova/all-MiniLM-L6-v2` (384 dim) |
| Runtime | `@xenova/transformers` (ONNX no Node.js) |
| Framework | Next.js 16 (Server Actions) |
| Armazenamento | Float32Array binário em arquivo estático |
| Similaridade | Cosseno via `O(n*d)` brute force |

## Como funciona o pipeline

### 1. Geração offline dos embeddings

Um script `scripts/generate-embeddings.ts` conecta ao banco PostgreSQL via Prisma, busca todos os medicamentos e, para cada um, concatena 11 campos em um texto único:

```
"NomeComercial | PrincípioAtivo | Categoria | Detentor | FormaFarmaceutica | Concentracao | Sinonimos | Indicacoes | Situacao | Referencia"
```

Esse texto é passado pelo modelo all-MiniLM-L6-v2, que retorna um vetor de 384 floats. O script processa em lotes de 50 e salva dois arquivos na pasta `public/`:

- **`embeddings-header.json`**: metadados (count, dim, array de IDs)
- **`embeddings.bin`**: raw Float32Array com 12.5 milhões de floats (~48 MB)

### 2. Carregamento lazy no servidor

A Server Action `semantic-search.ts` mantém um cache singleton em módulo:

```typescript
let extractor: FeatureExtractionPipeline | null = null
let embeddings: Float32Array | null = null
let header: { count: number; dim: number; ids: number[] } | null = null
```

Na primeira requisição, o modelo é carregado em memória (+- 23 MB) e o binário é mapeado como `Float32Array`. A partir da segunda, é cache hit — zero I/O.

### 3. Busca em tempo real

Quando o usuário digita e aperta Enter:

1. Server Action recebe a query
2. `extractor(query, { pooling: 'mean', normalize: true })` → vetor 384d
3. Loop exaustivo sobre os 32.585 embeddings calculando cosseno:

```typescript
function cosineSimilarity(a: Float32Array, b: Float32Array, dim: number): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < dim; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
}
```

4. Os top 20 scores são selecionados
5. Os IDs correspondentes são buscados no banco com `findMany`
6. Resultados retornam para o componente React com score de 0 a 100%

### 4. Interface no cliente

O componente `SemanticSearch` é `'use client'` e se comporta como um search bar normal:

- Input com placeholder sugestivo
- Loading state com skeleton
- Resultados em cards ou tabela (toggle)
- Score de relevância visível (ex: "92%")
- Buscas recentes salvas em localStorage
- Fallback: "Nenhum resultado encontrado. Tente descrever de outra forma."

## Performance

| Métrica | Valor |
|---------|-------|
| Modelo em disco | ~23 MB |
| Embeddings em disco | 48 MB |
| Cache em RAM (modelo + dados) | ~71 MB |
| Busca exaustiva (32k registros) | ~50ms no servidor |
| Batch de geração | 50 medicamentos por vez |
| Total de operações por busca | 12.5M de FLOPs |

O brute force `O(n*d)` pode parecer ingênuo para 32 mil registros, mas 384 dimensões × 32.585 = 12.5 milhões de operações de ponto flutuante é trivial para um servidor moderno. Em menos de 100ms o resultado volta.

## Por que não usar um banco vetorial?

Para 32 mil registros, um banco vetorial (Pinecone, pgvector, Qdrant) adiciona complexidade de infra sem ganho real de performance. O brute force cabe na RAM, não tem latência de rede e não custa nada.

Se o dataset crescesse para milhões de registros, aí sim valeria migrar para ANN (Approximate Nearest Neighbors) com `pgvector` ou `hnswlib`.

## O que essa arquitetura ensina

- **IA não precisa de API paga**: modelos pequenos como all-MiniLM-L6-v2 rodam em hardware modesto
- **Dados do usuário não saem do servidor**: sem enviar nada para OpenAI ou Google
- **Cache singleton em módulo ES**: padrão simples e eficaz para manter modelo em memória
- **Binário raw vs JSON**: Float32Array em arquivo binário é 4x menor que JSON equivalente
- **Server Actions do Next.js**: escondem a complexidade do RPC — o componente cliente chama a função como se fosse local

O resultado é uma busca semântica que parece mágica pro usuário, mas é só matemática do ensino médio (produto escalar + norma euclidiana) rodando localmente.
