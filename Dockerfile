# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# --ignore-scripts: o postinstall "prisma generate" precisa do schema, que é
# copiado logo abaixo (a ordem importa no cache de camadas).
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: runtime (non-root, migrations/seed no primeiro boot)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root user
RUN useradd --create-home --uid 1001 hubuser

# node_modules completo: o entrypoint usa prisma CLI + tsx (migrate/seed).
COPY --from=build --chown=hubuser:hubuser /app/node_modules ./node_modules
COPY --from=build --chown=hubuser:hubuser /app/dist ./dist
COPY --from=build --chown=hubuser:hubuser /app/prisma ./prisma
COPY --chown=hubuser:hubuser package.json prisma.config.ts ./
COPY --chown=hubuser:hubuser docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x docker/entrypoint.sh

USER hubuser
EXPOSE 11020

# Primeiro boot: migrate deploy + seed + protótipos; depois sobe a API/MCP.
ENTRYPOINT ["docker/entrypoint.sh"]