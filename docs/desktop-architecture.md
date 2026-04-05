# Desktop Architecture

## Goal

Desktop 端现在承担两件事：

- 作为 `paper bundle` 的本地研究工作台
- 作为后续 `vibe research` 智能体能力的 UI 宿主

这轮重构的目标不是继续堆页面，而是把桌面端整理成一个可以长期演进的工程底座。

## Layering

### UI Layer

位于 `apps/desktop/src/app`、`apps/desktop/src/features`、`apps/desktop/src/shared/ui`

职责：

- 只负责布局、组件和交互编排
- 不直接调用 Tauri bridge
- 不负责 bundle、导入、记忆或 AI 任务的业务流程

当前主入口：

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/app/AppProviders.tsx`
- `apps/desktop/src/app/AppShell.tsx`

### Application Service Layer

位于 `apps/desktop/src/app/services`

职责：

- 向 feature hooks 暴露稳定 service facade
- 收口 web/native 差异
- 管理 bundle、导入、资源、笔记、阅读器定位、AI 任务占位接口

当前服务：

- `bundleService`
- `importService`
- `assetService`
- `notesService`
- `readerService`
- `aiTaskService`

feature 层只能依赖这些 service interface，不应再直接散落调用 `runtime.ts`。

### Research Runtime Layer

位于 `packages/*`

职责：

- `research-domain`：领域模型唯一来源
- `markdown-engine`：`paper.md -> block index`
- `paper-ingest`：PDF/Markdown -> bundle
- `agent-core`：研究任务与 agent runtime contract
- `research-memory`：单篇、中期、长期记忆文档

这里的目标不是做 UI，而是为后续研究工作流提供稳定语义层。

## Frontend Structure

```text
apps/desktop/src
├── app
│   ├── AppProviders.tsx
│   ├── AppShell.tsx
│   ├── providers
│   └── services
├── features
│   ├── ai
│   ├── imports
│   ├── library
│   ├── reader
│   └── settings
├── shared
│   ├── contracts
│   └── lib
└── lib
    └── runtime.ts
```

### `app/`

- provider 装配
- 顶层三栏布局
- 全局浮层、上下文菜单、对话框的宿主

### `features/library`

- 资料库树
- 目录展开/收起
- 文献右键操作
- 资料库管理弹窗

### `features/reader`

- block-based reader
- TOC 映射
- block selection
- inline edit
- virtualization

### `features/imports`

- 后台导入任务面板
- 轮询与状态展示

### `features/settings`

- 导入入口
- 主题切换
- 后台任务入口

### `features/ai`

目前只保留 block action schema、hook 和占位面板，不做真实 LLM 调用。

## Reader Runtime

阅读器以 `block_id` 为中心，而不是以“整篇 markdown 页面”为中心。

固定规则：

- 所有选中统一走 `selectedBlockId`
- 所有目录跳转统一走 `navigateToBlockId(blockId)`
- 所有区块编辑统一走 `saveBlock(blockId, markdown)`
- 所有右侧交互统一围绕当前 `selectedBlockId`

### TOC Mapping

目录项与正文标题块是一一映射关系：

- `buildReaderBlocks()` 先把 bundle blocks 映射成 reader blocks
- `buildTocEntries()` 只从可见 heading block 里构造目录
- 点击目录项时直接按 `blockId` 跳到真实正文块

### Visible Content Rules

正文中疑似目录区段默认隐藏：

- `Contents`
- `Table of Contents`
- `目录`
- `目次`

但不隐藏：

- 标题
- 作者
- 摘要
- 正文 heading

### Virtualization

长文档默认只挂载视口附近的 block：

- 使用 `useVirtualBlocks()`
- 用上下 spacer 保持整体滚动长度
- 跳转到远处 block 时会临时把目标附近窗口补进渲染范围

这个策略优先保证：

- 长文档/书籍可打开
- block id 导航仍然成立
- markdown 渲染器不会一次性挂载整本书的全部节点

## Native Boundary

`apps/desktop/src/lib/runtime.ts` 现在只承担 bridge adapter：

- Tauri invoke
- native picker
- native asset/note/bundle 命令桥接

它不再承载业务规则。

Tauri 后端按模块拆分：

- `paths.rs`
- `models.rs`
- `state.rs`
- `bundle_repo.rs`
- `library_service.rs`
- `import_service.rs`
- `notes_service.rs`
- `commands.rs`

约束：

- 文件系统逻辑只能通过 repo/service 模块访问
- 外部 `node` 命令只能存在于 import/reindex 相关 service
- `commands.rs` 只负责 Tauri 参数适配和错误边界

## AI Integration Surface

下一阶段 AI 只接在 block workflow 上，不直接从 UI 随意长入。

### Block Action

输入：

- `bundleId`
- `blockId`
- `actionType`
- `selection`

动作类型：

- `translate`
- `summarize`
- `explain`
- `rewrite`
- `correct`

### Article / Library / Durable Memory

运行时规划保留三层记忆：

- article outline memory
- library synthesis memory
- durable research memory

这些 contract 已经在 `packages/research-domain`、`packages/agent-core`、`packages/research-memory` 里铺底，但当前桌面端只展示 block action 占位入口。

## Current Workflow

### 1. Ingest

- 导入 PDF 或 PDF 目录
- 调用 MinerU sidecar
- 生成 bundle
- 重建 markdown 索引

### 2. Read

- 打开 bundle
- 构造 reader blocks
- 按 `blockId` 定位、选中、编辑

### 3. Act on Block

- 预留翻译/总结/解释/改写/纠错入口
- 结果后续挂回 block action log

### 4. Build Memory

当前只定义 contract，不做完整 UI 编排：

- article memory
- library memory
- durable memory

## Next Engineering Steps

- 给 `ReaderBlock` 渲染增加 markdown AST/cache，减少重复解析
- 给搜索结果、图表、引用跳转统一接入 `navigateToBlockId`
- 给 `features/ai` 接入真正的 task queue 和结果面板
- 给 `research-memory` 增加 article outline -> library synthesis 的批处理 pipeline
