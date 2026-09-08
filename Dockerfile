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

# Knowledge lib (committed docs) goes into the image build context; copy it
# here too so the runtime stage can COPY it without a second context fetch.
COPY knowledge ./knowledge

# ---------------------------------------------------------------------------
# Stage 2: runtime (non-root, migrations/seed no primeiro boot)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root user
RUN useradd --create-home --uid 1001 hubuser
# Model cache dir (mounted as a named volume): pre-create it owned by hubuser
# so a fresh volume inherits the right ownership — otherwise the root-owned
# mountpoint blocks the on-device model download (EACCES).
RUN mkdir -p /data/.transformers-cache && chown -R hubuser:hubuser /data

# node_modules completo: o entrypoint usa prisma CLI + tsx (migrate/seed).
COPY --from=build --chown=hubuser:hubuser /app/node_modules ./node_modules
COPY --from=build --chown=hubuser:hubuser /app/dist ./dist
COPY --from=build --chown=hubuser:hubuser /app/prisma ./prisma
# Cliente Prisma gerado (src/generated, saída do `prisma generate`): o seed
# roda via tsx a partir de prisma/seed.ts, que importa ../src/generated/... —
# o dist não resolve esse caminho (Prisma 7 emite .ts no output declarado).
COPY --from=build --chown=hubuser:hubuser /app/src/generated ./src/generated
# Knowledge lib commitada — fonte da ingestão (KNOWLEDGE_LIB_ROOT=/app/knowledge).
COPY --from=build --chown=hubuser:hubuser /app/knowledge ./knowledge
COPY --chown=hubuser:hubuser package.json prisma.config.ts ./
COPY --chown=hubuser:hubuser docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x docker/entrypoint.sh

USER hubuser
EXPOSE 11020

# Primeiro boot: migrate deploy + seed + protótipos; depois sobe a API/MCP.
ENTRYPOINT ["docker/entrypoint.sh"]