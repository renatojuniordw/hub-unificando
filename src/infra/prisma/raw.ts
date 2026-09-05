import type { PrismaService } from './prisma.service.js';

/**
 * Typed raw query helper. The generated client types `$queryRawUnsafe` as
 * `Promise<any>`; this wrapper narrows results to `T` in one place so the rest
 * of the codebase stays `any`-free (strict TS + lint).
 *
 * All values are bound parameters — never concatenated user input.
 */
export async function queryRows<T>(
  prisma: PrismaService,
  sql: string,
  ...params: unknown[]
): Promise<T> {
  // The generated client returns PrismaPromise<unknown, any>; double-cast keeps
  // callers `any`-free without tripping no-unnecessary-type-assertion.
  return prisma.$queryRawUnsafe(sql, ...params) as unknown as Promise<T>;
}
