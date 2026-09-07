<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Stack versions — read before touching anything

| Tech         | Version          | Key docs                              |
| ------------ | ---------------- | ------------------------------------- |
| Next.js      | **16.2.4**       | `node_modules/next/dist/docs/01-app/` |
| React        | **19.2.4**       | —                                     |
| Tailwind CSS | **4.x**          | `node_modules/tailwindcss/`           |
| TypeScript   | **5.x** (strict) | —                                     |

---

## Next.js 16 — what changed

- **App Router only.** `pages/` directory does not exist in this project. Never create files under `pages/`.
- **`getServerSideProps`, `getStaticProps`, `getStaticPaths` are gone.** Data fetching happens inside Server Components directly (async functions, `fetch`, etc.).
- **`next/head` is gone.** Use the `metadata` export or `generateMetadata()` in `layout.tsx` / `page.tsx`.
- **Server Components are the default.** A component without `'use client'` runs only on the server — no hooks, no browser APIs.
- **`'use client'` is required** for any component that uses `useState`, `useEffect`, `useRef`, event handlers, or any browser-only API.
- **Route handlers replace API routes.** Use `src/app/api/**/route.ts` with exported `GET`, `POST`, etc. functions — not `pages/api/`.
- **`next/image`** — `layout` prop is removed; use `fill` + a positioned wrapper instead.
- **Read `node_modules/next/dist/docs/01-app/03-api-reference/`** before using any Next.js API.

## React 19 — what changed

- **`use()` hook** is now stable — use it to unwrap Promises and Context inside render.
- **`useFormStatus` and `useActionState`** replace the old `useFormState` from `react-dom`.
- **Server Actions** — functions marked `'use server'` can be called directly from Client Components.
- **`ref` is now a plain prop** — no more `forwardRef` wrapper needed.
- **`ReactDOM.render` is removed** — use `createRoot` if needed anywhere.

## Tailwind CSS v4 — what changed

- **No `tailwind.config.js`.** Configuration lives in CSS via `@theme {}` in `src/styles/index.css`.
- **No `@tailwind base/components/utilities` directives.** Import with `@import "tailwindcss"` only.
- **Plugins declared in CSS** with `@plugin`, not in a JS config.
- **Custom tokens** are CSS variables defined inside `@theme {}`. This project defines:
  - `--color-neon-yellow: #ccff00`
  - `--color-brutalist-black: #020617`
  - `--shadow-hard-lg/md/sm/neon/white`
- **`bg-opacity-*`, `text-opacity-*`, etc. are removed.** Use slash syntax: `bg-black/50`.
- **`ring-offset-color` utilities changed** — check v4 docs before using.
- **PostCSS plugin** is `@tailwindcss/postcss`, not `tailwindcss` directly. Config is in `postcss.config.mjs`.
