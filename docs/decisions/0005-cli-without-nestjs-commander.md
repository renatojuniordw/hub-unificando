# ADR 0005: CLI with `commander` directly (no `@nestjs/commander`)

Date: 2026-09-05

Status: accepted

## Context

The Hub ships a developer/agent CLI (`hub ingest|scan|status|search|context|
summary|compare|classify|seed-categories`) that reuses domain services
(orchestrator, search, context assembler, classifier, prototype seeder) wired
by Nest DI. Two integration routes existed:

1. `@nestjs/commander` — the "official-looking" wrapper that decorates
   commands (`@Command()`, `@Option()`) and runs them through a Nest module.
2. `nestjs-commander` — a community package commonly used for this.
3. Plain `commander` driving a Nest **application context**.

Investigation for v1:

- **`@nestjs/commander` is not published on npm** (the name is reserved /
  unavailable), so there is nothing to install.
- **`nestjs-commander` is unmaintained** — last published at **0.2.6**, stale
  against Nest 11 and commander 15, with open incompatibility issues.
- Pulling an unmaintained decorator layer adds magic (parameter injection,
  lifecycle) that is hard to debug and easy to break on upgrades.

## Decision

Build the CLI with **`commander` `^15.0.0` directly** on top of a Nest
**application context** (`src/cli.ts`):

```ts
async function createContext() {
  return NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
}
```

- One `program` (name `hub`, version from `package.json`) with `.command(...)`
  definitions; each action resolves the services it needs with `app.get(...)`
  (PrismaService, IngestionOrchestrator, SearchService, ContextAssemblerService,
  CompareService, SummaryService, ClassifierService, CategoryPrototypeSeeder,
  RegistryScanService, `countEmbeddedChunks`), runs the work, and prints JSON
  or a human table.
- `createApplicationContext` boots **only the providers** (no HTTP listener),
  which is exactly what a CLI needs; `app.close()` (via `finally`) lets the
  process exit cleanly.
- Same pattern is reused by the standalone runners
  `scripts/seed-categories.ts` and `scripts/smoke-ingest.ts`.

## Alternatives considered

- **Wait for / vendor `@nestjs/commander`.** Unpublished; no roadmap. Rejected.
- **Adopt `nestjs-commander` 0.2.6.** Decorator ergonomics are nice, but an
  unmaintained core dependency on the Nest 11 path is a security/compat risk
  (ADR context in `docs/SECURITY.md` dependency policy). Rejected.
- **Hand-rolled argv parser.** Not worth it; commander 15 is maintained,
  declarative and dependency-light. Accepted.

## Consequences

Positive:

- Zero extra framework coupling; `commander` is a stable, tiny leaf
  dependency.
- Commands map 1:1 to service calls already covered by unit/integration
  tests — nothing hidden behind decorator magic.
- If Nest ever ships a first-party commander module, migrating is mechanical
  (swap `program.command` wiring for decorators).

Negative / costs:

- Command options are not class-validated like REST DTOs — every CLI action
  validates/normalizes its own arguments (values are used as filter inputs
  and are parameter-bound at the SQL layer, keeping the security posture from
  `docs/SECURITY.md`).
- Repetitive `app.get(...)` boilerplate in each action; acceptable at 9
  commands and contained in one file.
