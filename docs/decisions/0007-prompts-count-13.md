# ADR 0007: prompts-unificando ships 13 prompts (not 14)

Date: 2026-09-05

Status: accepted

## Context

The build brief described `prompts-unificando` as a library of **14 prompts**.
The repository at `SITE_HIGH_CONVERSION_ARQUITETURA/prompts/` (the folder
registered as `prompts-unificando`) contains **14 entries**, of which
**13 are `.md` prompt files** and **1 is `manifest.json`** (the package
manifest that the `npx`-based prompt runner consumes):

```
auditoria-engenharia.md     auditoria-seguranca.md   auditoria-testid.md
backend.md                  ci-e2e.md                frontend.md
fullstack.md                refatoracao-faseada.md   revisao-copy.md
seo.md                      setup-e2e.md             testes-e2e.md
testes.md                   manifest.json            ← metadata, not a prompt
```

The "14" figure almost certainly counted `manifest.json` or an older file
list. The project registry (`prisma/seed/registry.ts`) records
`metadata: { kind: 'cli-package', promptCount: 13 }` and the description says
"Prompts (13)".

## Decision

Accept **13** as the canonical count and treat the **folder as the source of
truth**:

- `metadata.promptCount = 13` on the `prompts-unificando` seed row, matching
  the 13 markdown prompt files.
- Prompts are enumerated from the filesystem at ingest time (the scanner
  already walks `prompts/*.md`), so any future addition/removal of a prompt
  file automatically changes the indexed corpus — the registry value is a
  display/registry hint, not an authoritative enumeration.
- A one-line note was added to the registry seed header documenting the
  divergence ("reality wins, see ADR") so nobody "fixes" the count back to 14.

## Alternatives considered

- **Store 14 to match the brief.** Stores a number that does not correspond to
  any file count in the repo; would mislead context packages, summaries and
  MCP consumers that surface `promptCount`. Rejected.
- **Count `manifest.json` as a prompt.** It is metadata, not a prompt file;
  conflating the two would also break the "folder is source of truth" rule for
  future audits. Rejected.
- **Recompute programmatically on every registry sync.** The seed is
  curated/upserted and the registry scanner (`registry-scan.service.ts`) only
  enriches known rows from live `package.json`; a live count would need a new
  contract between seed and scanner. Deferred as an enhancement; the folder is
  authoritative either way.

## Consequences

Positive:

- Registry, context packages, summaries and the MCP tooling report a number
  that can be verified against `SITE_HIGH_CONVERSION_ARQUITETURA/prompts/`.
- The documented rationale prevents a future regressions-by-rounding
  ("brief said 14").

Negative / costs:

- `promptCount` is a static hint: if the repo diverges from the seed (new
  prompts merged later), the hint lags until the seed is refreshed — mitigated
  by the folder-as-truth note above.
