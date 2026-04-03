# Paper Bundle Spec

## Goal

The paper bundle is the system's canonical representation for a paper after ingestion. All downstream agent work must operate on a bundle, not directly on a PDF.

## Required Layout

```text
<bundle-dir>/
├── paper.md
├── images/
├── manifest.json
├── anchors.json
├── equations.json
├── tables.json
└── citations.json
```

## Required Files

### `paper.md`

- Canonical Markdown transcription for the paper.
- Must preserve section structure as much as possible.
- May include page comments such as `<!-- page: 4 -->` to improve traceability.

### `images/`

- Extracted images, figures, and diagrams.
- Image references inside `paper.md` should point into this directory whenever possible.

### `manifest.json`

Top-level metadata for the bundle.

Required fields:

- `bundle_id`
- `source_type`
- `source_path`
- `source_checksum`
- `pdf_path`
- `markdown_path`
- `manifest_path`
- `asset_root`
- `parser`
- `parser_version`
- `conversion_status`
- `quality_score`
- `created_at`

Recommended fields:

- `title`
- `block_count`
- `figure_count`
- `equation_count`
- `table_count`
- `citation_count`
- `quality_flags`

### `anchors.json`

Block-level semantic index. Each block should include:

- `block_id`
- `section_path`
- `block_type`
- `markdown`
- `source_page_start`
- `source_page_end`
- `preceding_block_id`
- `following_block_id`

Optional fields:

- `start_line`
- `end_line`

### `equations.json`

Each equation record should include:

- `equation_id`
- `block_id`
- `section_path`
- `latex`
- `raw_text`
- `source_page_start`
- `source_page_end`

### `tables.json`

Each table record should include:

- `table_id`
- `block_id`
- `section_path`
- `markdown`
- `source_page_start`
- `source_page_end`

### `citations.json`

Each citation record should include:

- `citation_id`
- `block_id`
- `kind`
- `value`
- `source_page_start`
- `source_page_end`

## Stability Rules

- `block_id` must be deterministic from bundle identity plus normalized content.
- Asset ids must be stable across re-index runs if content and path are unchanged.
- Re-conversion can create new ids only when content materially changes.

## Validation Rules

- `paper.md` must exist and be non-empty.
- `manifest.json`, `anchors.json`, `equations.json`, `tables.json`, and `citations.json` must exist after indexing.
- `quality_score` should decrease when the bundle has no sections, no text, or unresolved missing assets.
- Long-term research memory must not be created from bundles without evidence-bearing block ids.
