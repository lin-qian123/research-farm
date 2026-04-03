# Vibe Researching v1 Plan

## Summary

- The system is Markdown-first. PDF is an input artifact, not the main working representation.
- Every paper must first be converted into a `paper bundle` before agents summarize, compare, or store memory from it.
- The runtime should inherit the Claude Code skeleton: tools, tasks, agents, plan mode, and memory, while replacing coding-specific workflows with research-specific ones.
- The v1 product is local-first desktop plus CLI support. The first closed loop is import, convert, index, read, compare, and write into personal or team knowledge memory.

## Product Shape

- `apps/desktop` owns the user-facing workspaces: `Inbox`, `Library`, `Reader`, `Graph`, and `Workspace`.
- `apps/cli` owns batch import, conversion, bundle validation, re-indexing, and background processing.
- `packages/agent-core` defines research agents, tasks, notifications, and concurrency rules.
- `packages/research-domain` defines shared paper bundle, block, asset, evidence, graph, memory, and task models.
- `packages/paper-ingest` turns PDF or Markdown sources into normalized paper bundles.
- `packages/markdown-engine` indexes Markdown blocks and extracts figure, equation, table, and citation anchors.
- `packages/research-memory` stores project, team, and long-term research memory.
- `python/sidecar` owns MinerU conversion and later OCR, LaTeX, and scientific sidecars.

## Markdown-First Constraints

- `paper.md` is the single source of truth for paper text.
- All summaries and extracted claims must cite `evidence_refs`.
- Every image, equation, and table must have a stable asset id.
- Every paragraph block must have a stable `block_id`.
- The original PDF is retained only for provenance, validation, and re-conversion.

## v1 Closed Loop

1. Import a PDF or existing Markdown source.
2. Convert PDF with MinerU into a paper bundle.
3. Validate the bundle and expose manual repair entry points.
4. Build block, figure, equation, table, and citation indexes.
5. Run reader and curator agents on block-level evidence.
6. Store notes, graph edges, and research memory.

## Deliverables In This Scaffold

- A documented paper bundle spec.
- A documented research runtime spec.
- A documented v1 roadmap.
- A working CLI for `import-paper` and `index-markdown`.
- A MinerU-native Python sidecar entrypoint.
- A Markdown indexing engine with stable block and asset ids.
- Bundle manifest and JSON index generation for figures, equations, tables, and citations.
