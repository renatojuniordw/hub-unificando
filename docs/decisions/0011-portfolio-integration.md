# 0011 — Portfolio integration & multi-surface registry

Date: 2026-09-08 · Status: accepted

## Context

The portfolio-integration addendum (written against the original spec) asks the
Hub to serve **multiple display surfaces** — the Unificando landing
(`ui-unificando`), the personal portfolio (`portfolio-ui`) and internal tooling —
from one registry and one knowledge base. Since the addendum was written the Hub
gained the committed knowledge lib (ADR 0009) and TS prompt extraction (ADR
0010); the addendum's `HUB_SCAN_ROOTS` array idea is superseded by per-project
source resolution (absolute folderPath → knowledge lib → scan root).

The portfolio-ui lives **outside** the scan root (`/Users/renatobezerra/
Developer/portfolio-ui`) and its blog posts live under `src/content/blog/*.md`
with YAML frontmatter (title/description/date/tags/readingTime) — invisible to
the curated scope, which only indexes docs/, root README/CLAUDE/AGENTS and
prompts/.

## Decision

1. **Surfaces on the registry** — `Project.surfaces String[]`
   (`unificando` | `portfolio` | `internal`), plus `status` (live/beta/alpha/
   maintenance) and `featured` (home highlights). `GET /projects?surface=`
   and `?featured=true` filter on them.
2. **portfolio-ui as an ingested project** — seed entry with an **absolute
   folderPath** (dev) and `surfaces: ["internal"]`. The knowledge lib mirrors
   its indexable files (`knowledge/portfolio-ui/…`, including
   `src/content/blog/*.md`), so the VPS ingests the blog from the lib without
   the portfolio checkout (ADR 0009 autonomy preserved).
3. **Blog scope exception** — `isKnowledgePath` additionally accepts
   `src/content/blog/<slug>.md` (exactly one level; the single `content/`
   exception). Whether a file is a real post is decided at ingestion:
   frontmatter must carry `title` + `date` (parseable). Files failing that —
   or with `draft: true` — are **skipped and any previously published document
   for the path is removed** (drafts are never embedded or exposed).
4. **Blog posts as documents** — `contentKind="blog-post"`, `publishedAt`
   (frontmatter date), `tags` (frontmatter tags, merged into categories for
   search), `isDraft=false`, `title`/`summary` from frontmatter,
   `metadata.readingTime`. New `Document` columns: `tags String[]`,
   `publishedAt DateTime?`, `isDraft Boolean @default(false)`.
5. **13 manual case studies** — the portfolio's 13 case studies are registry
   entries with `sourceType="manual"` (no folderPath, never scanned/ingested):
   5 lab (radar/pdf/med/prompts/promptcraft — slugs kept as-is) + 2 ecosystem
   marketing sites (`unificando-automacao`, `unificando-vitrine`) + 6 personal/
   client projects (mariaclarasantos, seu-barraco-esperto, oferticando,
   ariano-suassuna, sheik, sistema-18ia). Ingestion and sync-docs skip
   `sourceType="manual"` projects. `?surface=portfolio` returns exactly these
   13.
6. **Public API** — new `GET /api/v1/posts` (published posts, newest first,
   `?tag=`/`?project=` filters) and `GET /api/v1/posts/:slug` (raw markdown +
   metadata; slug = file basename). Search gains a `contentKind` filter and
   hits carry `contentKind`/`tags`/`publishedAt`; drafts never match. MCP
   `buscar_trechos` gains `contentKind`. `HUB_PUBLIC_CORS_ORIGINS` allows
   browser consumers (falls back to `CORS_ORIGINS`).
7. **Frontends untouched** — ui-unificando and portfolio-ui keep reading their
   own sources for now; consuming the Hub API from them is the documented next
   step (docs/CONTENT.md).

## Alternatives considered

- **`HUB_SCAN_ROOTS` array** (addendum's original idea): unnecessary —
  absolute folderPath already wins per project, and the lib covers the VPS.
- **Generic "any folder with rich frontmatter" scope rule**: broader than
  needed; the single `src/content/blog/` exception keeps the curated scope
  tight.
- **Serving the TSX case studies through the Hub**: `ProjectDetails` is almost
  entirely `string | ReactNode` — not serializable. Manual registry entries
  give the portfolio a single source of truth for the *list* while the rich
  content stays in code.

## Consequences

- The Hub now knows the whole portfolio surface: 16 registry projects, 13 on
  the portfolio surface, blog posts searchable and served via `/posts`.
- Blog ingestion depends on frontmatter discipline (title+date); malformed
  posts are skipped loudly and unpublished cleanly.
- Dev DB chunks must be re-ingested (`hub ingest --force`) when the chunker
  changes — sourceSha dedupe alone does not re-chunk (see AGENTS.md rule 13).
