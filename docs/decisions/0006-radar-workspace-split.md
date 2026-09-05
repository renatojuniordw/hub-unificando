# ADR 0006: Radar workspace registered as two projects

Date: 2026-09-05

Status: accepted

## Context

The Radar codebase is a VS Code multi-root workspace at
`radar/radar.code-workspace` containing **two independent deliverables**:

1. `radar-unificando` — the Next.js app (chat, match, ATS analysis,
   `next` 16.3.1, `next-auth`, Prisma backend on `port` 11010).
2. `radar-unificando-extension` — a **Chrome extension** (Manifest V3, Side
   Panel) that analyzes the open vacancy and reuses the app's
   `POST /api/extension/analyze`; its own toolchain is Vite + `@crxjs/vite-plugin`
   (no Next.js at all).

A single "radar" registry row would have mixed stacks, mixed concerns
(web-app docs + browser-extension docs) and a folder layout that crosses two
package roots. The ingestion scanner walks **one folder per project row**
(`scanner.service.ts`), so one row = one tree; there is no concept of
"sub-project include".

## Decision

Register the workspace as **two registry projects**
(`prisma/seed/registry.ts`):

- `radar-unificando` — `folderPath: 'radar/radar-unificando'`,
  `metadata: { kind: 'web-app', port: 11010, workspace: 'radar' }`.
- `radar-unificando-extension` — `folderPath: 'radar/radar-unificando-extension'`,
  `metadata: { kind: 'chrome-extension', workspace: 'radar' }`.

`folderPath` is stored **relative** and resolved against `HUB_SCAN_ROOT` at
ingest time (`ingestion-orchestrator.service.ts`: absolute paths win,
relative paths are joined with the scan root). The shared `workspace: 'radar'`
metadata keeps the grouping discoverable (queries can filter on
`metadata.workspace`), and the actual `radar.code-workspace` file is not
indexed — only the two package trees.

## Alternatives considered

- **One `radar-unificando` project row scanning the whole `radar/`
  workspace.** Would conflate a web app and a browser extension under one
  description/stack/tag set; searches and context packages would mix
  extension-only knowledge into app questions and vice-versa. The single-folder
  scan model makes a clean split impossible. Rejected.
- **One row plus a per-subpath filter inside the scanner.** Adds a
  project-specific include/exclude configuration surface to `scanner.service.ts`
  for exactly one case, increasing complexity for everyone. Rejected — the
  two-row model needs no scanner changes.
- **A dedicated third "radar-workspace" aggregate row.** Duplicative; the
  ecosystem surface area is per-project, and aggregations can be built from the
  two real projects later if a UI needs them. Rejected for now.

## Consequences

Positive:

- Per-deliverable descriptions, stack (`next` vs `vite/@crxjs/vite-plugin`),
  tags, repo URL and `kind` are accurate for the classifier, context
  packages and MCP consumers.
- Ingest stays generic: each row points at exactly one folder to walk.
- `workspace: 'radar'` metadata preserves the grouping without schema change.

Negative / costs:

- Two slugs to maintain instead of one; anything that iterates "the projects"
  now sees two radar entries and must decide whether to group by
  `metadata.workspace`.
- The `radar-unificando-extension` row has `repoUrl: null` (no separate
  remote today); it inherits the workspace repo and this must be revisited if
  the extension is extracted to its own repository.
