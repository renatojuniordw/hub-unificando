#!/bin/sh
# Entrypoint do container app: migra, semeia (categorias + registry) e gera
# os protótipos das categorias no primeiro boot; depois sobe a API.
#
# A INGESTÃO do conhecimento NÃO roda aqui — em produção ela é feita pelo
# serviço `sync` (docker-compose.prod.yml), que extrai o knowledge bundle e
# re-ingere em loop (cron). Em dev, use `npm run hub -- ingest` (HUB_SCAN_ROOT
# aponta para as pastas locais dos projetos irmãos).
set -e

echo "[hub] apply migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[hub] seed categories + registry..."
node --import tsx prisma/seed.ts

echo "[hub] seed category prototypes (embeddings)..."
node dist/scripts/seed-categories.js || echo "[hub] warning: seed-categories falhou (sem rede/modelo?) — classificação segue por regras"

echo "[hub] starting API on :$PORT"
exec node dist/src/main.js