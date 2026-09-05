import { defineConfig } from 'prisma/config';

// Load .env into process.env (Node >= 20.12). Errors are ignored: dev
// fallback below keeps `prisma migrate` usable without a .env file.
try {
  process.loadEnvFile();
} catch {
  // no .env — fall back to docker-compose defaults
}

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://hub:hub@localhost:11022/hub_unificando';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: connectionString,
  },
});