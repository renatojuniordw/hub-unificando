/**
 * Initial project registry — source of truth for the ecosystem.
 * Data collected from the real sibling folders on 2026-09-05 + §2 of the
 * build brief. `folderPath` is relative to `HUB_SCAN_ROOT` (the scanner
 * resolves it); scanner upgrades metadata from live package.json files.
 *
 * Divergences from the brief are documented in docs/decisions/.
 * (prompts-unificando ships 13 prompts, not 14 — reality wins, see ADR.)
 */

export interface StackEntry {
  name: string;
  version: string;
  role: string;
}

export interface ProjectSeed {
  slug: string;
  name: string;
  description: string;
  repoUrl: string | null;
  folderPath: string;
  stack: StackEntry[];
  tags: string[];
  sourceType: 'local' | 'git';
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export const REGISTRY_SEEDS: ProjectSeed[] = [
  {
    slug: 'ui-unificando',
    name: 'Unificando UI',
    description:
      "Institutional website 'Unificando — Laboratório de Projetos Autorais & IA' (unificando.com.br). " +
      'Static SPA (no backend) with the Neo-Brutalist brand design system — the central DS of the brand.',
    repoUrl: 'git@github.com:renatojuniordw/ui-unificando.git',
    folderPath: 'ui-unificando',
    stack: [
      { name: 'react', version: '19.2.3', role: 'framework' },
      { name: 'react-dom', version: '19.2.3', role: 'framework' },
      { name: 'react-router-dom', version: '7.18.3', role: 'framework' },
      { name: 'vite', version: '6.2.0', role: 'framework' },
      { name: 'framer-motion', version: '12.24.0', role: 'ui' },
      { name: 'tailwindcss', version: '4.1.18', role: 'ui' },
      { name: 'react-helmet-async', version: '3.0.0', role: 'ui' },
      { name: 'typescript', version: '5.8.2', role: 'dev' },
    ],
    tags: ['frontend', 'vite', 'react', 'neo-brutalism', 'institutional-site'],
    sourceType: 'local',
    metadata: { kind: 'web', port: 11004 },
  },
  {
    slug: 'med-unificando',
    name: 'Med Unificando',
    description:
      'ANVISA interchangeable-medicine search with on-device hybrid semantic search ' +
      '(pgvector + tsvector + pg_trgm, RRF fusion) — the ecosystem reference implementation ' +
      'of MCP Streamable HTTP and local embeddings.',
    repoUrl: 'git@github.com:renatojuniordw/med-unificando.git',
    folderPath: 'med-unificando',
    stack: [
      { name: 'next', version: '16.2.10', role: 'framework' },
      { name: 'react', version: '19.2.4', role: 'framework' },
      { name: 'next-auth', version: '5.0.0-beta.32', role: 'runtime' },
      { name: 'prisma', version: '7.8.0', role: 'data' },
      { name: '@prisma/adapter-pg', version: '7.8.0', role: 'data' },
      { name: 'pgvector', version: '0.7.0', role: 'data' },
      { name: '@xenova/transformers', version: '2.17.2', role: 'ai' },
      { name: '@modelcontextprotocol/sdk', version: '1.30.0', role: 'mcp' },
      { name: 'zod', version: '4.5.4', role: 'runtime' },
      { name: 'pdf-parse', version: '1.1.1', role: 'runtime' },
      { name: 'pdfmake', version: '0.2.17', role: 'runtime' },
      { name: 'recharts', version: '3.10.0', role: 'ui' },
      { name: 'tailwindcss', version: '4.0.0', role: 'ui' },
      { name: 'vitest', version: '4.1.10', role: 'dev' },
      { name: '@playwright/test', version: '1.62.1', role: 'dev' },
    ],
    tags: ['nextjs', 'hybrid-search', 'pgvector', 'anvisa', 'mcp', 'pwa'],
    sourceType: 'local',
    metadata: { kind: 'web-app', port: 11006 },
  },
  {
    slug: 'pdf-unificando',
    name: 'Unificando PDF',
    description:
      '16 privacy-first PDF tools (nothing persisted, files only in /tmp) plus tutorials ' +
      'and a PDF→Markdown (RAG/AI) workflow.',
    repoUrl: 'git@github.com:renatojuniordw/pdf-unificando.git',
    folderPath: 'pdf-unificando',
    stack: [
      { name: 'next', version: '16.3.4', role: 'framework' },
      { name: 'react', version: '19.2.4', role: 'framework' },
      { name: 'pdf-lib', version: '1.17.1', role: 'native' },
      { name: 'pdfjs-dist', version: '6.3.289', role: 'native' },
      { name: 'sharp', version: '0.35.4', role: 'native' },
      { name: '@napi-rs/canvas', version: '0.1.100', role: 'native' },
      { name: 'archiver', version: '7.0.1', role: 'runtime' },
      { name: 'framer-motion', version: '12.38.0', role: 'ui' },
      { name: '@dnd-kit/core', version: '6.3.1', role: 'ui' },
      { name: 'tailwindcss', version: '4.0.0', role: 'ui' },
      { name: 'vitest', version: '4.1.5', role: 'dev' },
      { name: '@playwright/test', version: '1.59.1', role: 'dev' },
    ],
    tags: ['nextjs', 'pdf', 'tools', 'privacy'],
    sourceType: 'local',
    metadata: { kind: 'web-app', port: 11005 },
  },
  {
    slug: 'radar-unificando',
    name: 'Radar Unificando',
    description:
      'Smart remote-job search platform (Gupy/InHire) with AI: chat, match & ATS analysis ' +
      '(score 0-100), adapted resume (PDF/DOCX), recommended Udemy courses and Chrome extension pairing.',
    repoUrl: 'git+https://github.com/renatojuniordw/radar-unificando.git',
    folderPath: 'radar/radar-unificando',
    stack: [
      { name: 'next', version: '16.3.1', role: 'framework' },
      { name: 'react', version: '19.0.0', role: 'framework' },
      { name: 'next-auth', version: '5.0.0-beta.25', role: 'runtime' },
      { name: 'prisma', version: '7.9.1', role: 'data' },
      { name: 'pg', version: '8.22.0', role: 'data' },
      { name: 'ioredis', version: '5.11.1', role: 'infra' },
      { name: '@mui/material', version: '7.0.0', role: 'ui' },
      { name: 'recharts', version: '3.10.1', role: 'ui' },
      { name: 'ai', version: '7.0.43', role: 'ai' },
      { name: '@ai-sdk/openai-compatible', version: '3.0.18', role: 'ai' },
      { name: '@react-pdf/renderer', version: '4.6.0', role: 'native' },
      { name: 'docx', version: '9.7.1', role: 'native' },
      { name: 'resend', version: '6.20.0', role: 'runtime' },
      { name: 'zod', version: '4.4.3', role: 'runtime' },
      { name: 'tailwindcss', version: '4.0.0', role: 'ui' },
      { name: 'vitest', version: '4.1.10', role: 'dev' },
    ],
    tags: ['nextjs', 'remote-jobs', 'ai', 'ats', 'redis', 'chrome-extension'],
    sourceType: 'local',
    metadata: { kind: 'web-app', port: 11010, workspace: 'radar' },
  },
  {
    slug: 'radar-unificando-extension',
    name: 'Radar Unificando Extension',
    description:
      'Chrome extension (Manifest V3, Side Panel) that analyzes the open vacancy and shows ' +
      'ATS resume-adjustment tips, reusing POST /api/extension/analyze.',
    repoUrl: null,
    folderPath: 'radar/radar-unificando-extension',
    stack: [
      { name: 'react', version: '18.3.1', role: 'framework' },
      { name: 'vite', version: '5.4.0', role: 'framework' },
      { name: '@crxjs/vite-plugin', version: '2.0.0-beta.23', role: 'dev' },
      { name: 'typescript', version: '5.5.4', role: 'dev' },
      { name: 'vitest', version: '2.0.5', role: 'dev' },
      { name: '@types/chrome', version: '0.0.268', role: 'dev' },
    ],
    tags: ['chrome-extension', 'ats', 'vite', 'manifest-v3'],
    sourceType: 'local',
    metadata: { kind: 'chrome-extension', workspace: 'radar' },
  },
  {
    slug: 'prompts-unificando',
    name: 'Prompts Unificando',
    description:
      'Library of standardized, LLM/stack-agnostic prompts (13) for auditing, refactoring, ' +
      'testing, security/LGPD and copy review, consumed via npx.',
    repoUrl: 'git+https://github.com/renatojuniordw/prompts-unificando.git',
    folderPath: 'SITE_HIGH_CONVERSION_ARQUITETURA',
    stack: [],
    tags: ['prompts', 'cli', 'llm', 'library'],
    sourceType: 'local',
    metadata: { kind: 'cli-package', promptCount: 13 },
  },
  {
    slug: 'promptcraft-unificando',
    name: 'Promptcraft Unificando',
    description:
      'One-step prompt-refining CLI: builds an engineering meta-prompt and delegates execution ' +
      'to a local LLM CLI (claude/gemini/opencode), with --raw for the raw meta-prompt.',
    repoUrl: 'git+https://github.com/renatojuniordw/promptcraft-unificando.git',
    folderPath: 'unificando-promptgen',
    stack: [],
    tags: ['cli', 'prompts', 'llm', 'meta-prompt'],
    sourceType: 'local',
    metadata: { kind: 'cli-package' },
  },
];
