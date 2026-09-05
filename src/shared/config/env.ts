import { z } from 'zod';

/**
 * Centralized environment configuration. Validated at bootstrap (fail-fast)
 * with zod. Everything the app needs from the environment lives here.
 */

const boolFromEnv = (def: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(def)
    .transform((v) => v === 'true');

const intFromEnv = (def: number) =>
  z.coerce.number().int().min(0).default(def);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: intFromEnv(11020),
  DATABASE_URL: z
    .string()
    .default('postgresql://hub:hub@localhost:11022/hub_unificando'),
  REDIS_URL: z.string().default('redis://localhost:11023'),
  REDIS_ENABLED: boolFromEnv('true'),
  ADMIN_API_KEY: z.string().default(''),
  HUB_SCAN_ROOT: z
    .string()
    .default('/Users/renatobezerra/Developer/Unificando Hub'),
  EMBEDDING_MODEL: z.string().default('Xenova/multilingual-e5-base'),
  EMBEDDING_DIMS: intFromEnv(768),
  EMBEDDING_CACHE_DIR: z.string().default('/tmp/.transformers-cache'),
  EMBEDDING_BATCH_SIZE: intFromEnv(50),
  MAX_CONCURRENT_JOBS: intFromEnv(2),
  INGESTION_RETRIES: intFromEnv(3),
  MCP_API_KEY: z.string().default(''),
  MCP_ALLOWED_ORIGINS: z.string().default(''),
  MCP_SESSION_TTL_MIN: intFromEnv(60),
  MCP_ENABLE_JSON_RESPONSE: boolFromEnv('false'),
  MCP_RATE_LIMIT: intFromEnv(120),
  THROTTLE_READ: intFromEnv(120),
  THROTTLE_WRITE: intFromEnv(30),
  CORS_ORIGINS: z.string().default('http://localhost:11020'),
  SEARCH_CACHE_TTL_SECONDS: intFromEnv(60),
});

export type Env = z.infer<typeof EnvSchema>;

/** DI token for the validated environment object. */
export const ENV = Symbol('ENV');

/**
 * Validates a raw env record (process.env) against the schema.
 * Throws with a descriptive message on the first validation failure.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = JSON.stringify(parsed.error.flatten().fieldErrors, null, 2);
    throw new Error(`Invalid environment configuration:\n${fields}`);
  }
  return parsed.data;
}

export const envProvider = {
  provide: ENV,
  useFactory: (): Env => validateEnv(process.env),
};