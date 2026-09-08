# Content & Surfaces (portfolio integration)

How the Hub models **display surfaces**, the **portfolio registry** and the
**blog** (ADR 0011). Frontends (ui-unificando, portfolio-ui) are expected to
consume this API instead of their local sources — that migration is a separate
step per frontend.

## Surfaces

`Project.surfaces` declares where a project is displayed:

| Surface | Meaning |
|---|---|
| `unificando` | Unificando landing/ecosystem (ui-unificando) |
| `portfolio` | Personal portfolio case studies (portfolio-ui) |
| `internal` | Internal tooling — never shown publicly |

Combos are allowed (`["unificando","portfolio"]`). `status` is
`live|beta|alpha|maintenance`; `featured` marks home highlights.

```bash
curl "localhost:11020/api/v1/projects?surface=portfolio"   # the 13 case studies
curl "localhost:11020/api/v1/projects?featured=true"       # pdf, med, radar
curl "localhost:11020/api/v1/projects?surface=internal"    # portfolio-ui itself
```

## Registry kinds

- **Ingested projects** (`sourceType: "local"|"git"`) have a `folderPath` and
  go through scan → chunk → embed (docs/INGESTION.md).
- **Manual projects** (`sourceType: "manual"`) are display-only registry
  entries (the portfolio's 13 case studies: 5 lab + 2 ecosystem marketing
  sites + 6 personal/client). They have no folderPath, are never scanned, and
  exist so `?surface=portfolio` returns the complete portfolio list from one
  source of truth.

## Blog posts

Blog content lives in the portfolio repo (`portfolio-ui/src/content/blog/*.md`,
YAML frontmatter with `title`, `description`, `date`, `tags`, `readingTime`,
optional `draft`). The Hub:

1. **Mirrors** the posts into the knowledge lib (`knowledge/portfolio-ui/
   src/content/blog/*.md`) via `hub sync-docs` — commit the diff (ADR 0009
   autonomy: the VPS ingests from the lib, no portfolio checkout needed).
2. **Ingests** them as documents with `contentKind="blog-post"`,
   `publishedAt` (frontmatter date), `tags`, `metadata.readingTime`, and
   `title`/`summary` from the frontmatter (not the first heading).
3. **Skips** files without `title`+`date` frontmatter or with `draft: true`,
   and removes any previously published document for that path (drafts are
   never embedded or exposed).

### API

```bash
# List published posts (newest first)
curl "localhost:11020/api/v1/posts?pageSize=100"
# → { success, data: [{ slug, title, summary, date, tags, projectSlug, path }], meta }

# Filter by tag / project
curl "localhost:11020/api/v1/posts?tag=IA"
curl "localhost:11020/api/v1/posts?project=portfolio-ui"

# Post detail (raw markdown + metadata); slug = file basename without .md
curl "localhost:11020/api/v1/posts/mcp-gupy-vagas-personalizadas-com-ia"
# → { success, data: { slug, title, summary, date, tags, content, readingTime, ... } }

# Search restricted to posts (REST and MCP buscar_trechos both accept contentKind)
curl "localhost:11020/api/v1/search?q=Gupy&contentKind=blog-post"
```

## Workflow (adding a blog post)

```bash
# in portfolio-ui: write src/content/blog/my-post.md (frontmatter title+date)
cd "/Users/renatobezerra/Developer/Unificando Hub/hub-unificando"
npm run hub -- sync-docs --project portfolio-ui   # mirrors into knowledge/
git add knowledge/portfolio-ui && git commit -m "docs: sync portfolio blog"
npm run hub -- ingest portfolio-ui                # indexes the post
```

Unpublishing = add `draft: true` (or remove the frontmatter) in the source,
then sync + ingest: the document is removed from the index and the API.
