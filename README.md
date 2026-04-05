# Vibe Researching

Markdown-first local research runtime with a desktop-style research interface.

## Core Idea

- PDF is only a source artifact.
- Canonical paper representation is a `paper bundle` centered on `paper.md`.
- Agents operate on bundle ids, block ids, and asset ids rather than raw PDFs.

## Current Scaffold

- `apps/cli`: batch import and Markdown bundle indexing
- `apps/desktop`: modularized React + Tauri research workspace with `app / features / shared` structure
- `packages/research-domain`: shared research models
- `packages/markdown-engine`: block and asset indexing
- `packages/paper-ingest`: MinerU-native ingest and bundle generation
- `packages/agent-core`: runtime task and notification primitives
- `packages/research-memory`: evidence-backed memory helpers
- `python/sidecar`: MinerU conversion sidecar
- `docs/`: architecture, bundle, runtime, and roadmap docs

## Architecture Docs

- `docs/paper-bundle-spec.md`: canonical bundle file layout
- `docs/research-runtime-spec.md`: runtime roles, task kinds, and research workflow
- `docs/desktop-architecture.md`: desktop layering, module boundaries, and reader runtime

## Quick Start

```bash
npm install
npm test
npm run desktop:dev
```

## Desktop Preview

The first desktop version is a local-first reader shell:

- loads a local paper bundle folder
- reads `paper.md`, `manifest.json`, `anchors.json`, `equations.json`, `tables.json`, and `citations.json`
- exposes block-level reading, search, citations, graph preview, and workspace notes

In browser preview mode, bundles are loaded through a folder picker and notes are stored in browser storage.

To create a production build:

```bash
npm run desktop:build
```

To preview the production build locally:

```bash
npm run desktop:preview
```

## Native Desktop

The desktop app now also ships with a Tauri native shell.

Run the native development app:

```bash
npm run desktop:native:dev
```

Build the native macOS debug app bundle:

```bash
npm run desktop:native:build
```

The build outputs:

- `apps/desktop/src-tauri/target/debug/bundle/macos/Research Farm.app`

Native mode adds:

- Tauri window shell
- native folder picker for bundle directories
- automatic discovery of bundles under `data/bundles`
- workspace notes persisted to `data/workspace-notes/<bundle_id>.md`
- native PDF file / PDF directory import via the desktop app
- imported PDF directories mirrored under `data/bundles`

## CLI Help

```bash
node apps/cli/src/index.mjs help
```

## MinerU Import

```bash
MINERU_API_KEY=... node apps/cli/src/index.mjs import-paper /path/to/paper.pdf --output data/bundles
```

Import a single PDF or an entire directory tree of PDFs while preserving folder structure:

```bash
MINERU_API_KEY=... node apps/cli/src/index.mjs import-source /path/to/pdfs --output data/bundles
```

## Bundle Reindex

```bash
node apps/cli/src/index.mjs index-markdown /path/to/bundle
```
