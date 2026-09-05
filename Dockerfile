# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---------------------------------------------------------------------------
# Stage 2: runtime (non-root, read-only rootfs, no secrets baked in)
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Run as non-root user
RUN useradd --create-home --uid 1001 hubuser

COPY --from=build --chown=hubuser:hubuser /app/node_modules ./node_modules
COPY --from=build --chown=hubuser:hubuser /app/dist ./dist
COPY --from=build --chown=hubuser:hubuser /app/prisma ./prisma
COPY --chown=hubuser:hubuser package.json ./

USER hubuser
EXPOSE 11020

# The app serves the REST API + MCP on the same port; migrations run via
# entrypoint on first boot (prisma migrate deploy + seed-categories).
CMD ["node", "dist/src/main.js"]