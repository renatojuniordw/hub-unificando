#!/bin/sh
# Entrypoint do container app: migra, semeia (categorias + registry), gera os
# protótipos das categorias e ingere a knowledge lib commitada no primeiro
# boot; depois sobe a API.
#
# A ingestão lê de KNOWLEDGE_LIB_ROOT (/app/knowledge) — a lib copiada para a
# imagem. O ingest é idempotente (dedupe via sourceSha); para atualizar o
# índice basta subir uma imagem nova com a lib atualizada (ou reexecutar via
# `docker compose -f docker-compose.prod.yml exec app node dist/src/cli.js ingest`).
set -e

echo "[hub] apply migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[hub] seed categories + registry..."
node --import tsx prisma/seed.ts

echo "[hub] seed category prototypes (embeddings)..."
node dist/scripts/seed-categories.js || echo "[hub] warning: seed-categories falhou (sem rede/modelo?) — classificação segue por regras"

# Primeira ingestão da knowledge lib. Falha NÃO derruba o boot: o modelo
# on-device é baixado no primeiro uso (o seed-categories acima já o aquece),
# mas sem rede o app ainda sobe e o ingest pode ser reexecutado manualmente.
echo "[hub] ingesting committed knowledge lib (KNOWLEDGE_LIB_ROOT=$KNOWLEDGE_LIB_ROOT)..."
node dist/src/cli.js ingest || echo "[hub] warning: ingestão falhou no boot — reexecutar: docker compose -f docker-compose.prod.yml exec app node dist/src/cli.js ingest"

echo "[hub] starting API on :$PORT"
exec node dist/src/main.js