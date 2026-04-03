# Research Runtime Spec

## Runtime Principles

- Research execution is task-driven, not chat-log-driven.
- Agents operate over bundle ids, block ids, and asset ids.
- Coordinator output is only valid when backed by explicit evidence references.
- Memory writes are serialized per project.

## Agent Roles

### `Scout Agent`

- Searches and filters paper candidates.
- Deduplicates sources and prepares import tasks.

### `Conversion Agent`

- Runs MinerU.
- Checks conversion quality.
- Repairs missing manifest fields and bundle indexes.

### `Reader Agent`

- Produces block-level summaries.
- Extracts claims, methods, and open questions.

### `Figure Agent`

- Inspects images using image asset ids and surrounding blocks.

### `Equation Agent`

- Interprets equation assets and connects them to nearby evidence blocks.

### `Curator Agent`

- Builds concept links, comparison notes, and graph edges across papers.

### `Memory Agent`

- Persists project, team, and long-term research memory from validated evidence.

## Task Schema

Each task should include:

- `task_id`
- `kind`
- `agent_role`
- `bundle_ids`
- `project_id`
- `status`
- `created_at`
- `input`
- `result`

## Notification Shape

Notifications should stay close to the Claude Code async task model:

```xml
<task-notification>
<task-id>task_123</task-id>
<status>completed</status>
<summary>Indexed bundle and extracted 12 equations</summary>
<result>{"bundle_id":"paper_abc"}</result>
</task-notification>
```

## Research Plan Mode

- Before deep reading, the user or coordinator can enter a research protocol mode.
- In protocol mode the runtime records:
  - goal
  - inclusion criteria
  - exclusion criteria
  - expected outputs
  - evidence rules
- Agents should not write durable project memory until the protocol exists or the user explicitly bypasses it.

## Concurrency Rules

- Bundle conversion can run in parallel.
- Figure, equation, and reader tasks for the same bundle can run in parallel.
- Bundle repair for the same bundle must run serially.
- Project memory writes must run serially.
