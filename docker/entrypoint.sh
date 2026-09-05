#!/bin/sh
# Entrypoint do container: migra, semeia (categorias + registry) e gera os
# protótipos das categorias no primeiro boot; depois sobe a API.
set -e

echo "[hub] apply migrations (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[hub] seed categories + registry..."
node --import tsx prisma/seed.ts

echo "[hub] seed category prototypes (embeddings)..."
node dist/scripts/seed-categories.js || echo "[hub] warning: seed-categories falhou (sem rede/modelo?) — as ferramentas seguirão por regras"

echo "[hub] starting API on :$PORT"
exec node dist/src/main.js