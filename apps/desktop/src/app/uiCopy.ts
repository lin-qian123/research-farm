export const UI = {
  brand: 'Research Farm',
  importPdfFile: '导入 PDF 文件',
  importPdfFolder: '导入 PDF 文件夹',
  openBundleFolder: '打开现有 bundle 文件夹',
  loadDemo: '加载演示文档',
  importQueue: '后台导入',
  importIdle: '没有正在进行的导入任务',
  importReadingHint: '导入会在后台继续，你可以正常阅读已有文献。',
  library: '资料库',
  outline: '目录',
  reader: '阅读器',
  paragraphTools: '段落交互',
  searchPlaceholder: '搜索标题、段落、公式、引用...',
  noBundles: '还没有可阅读的 bundle',
  noBundlesHint: '先导入 PDF，或加载演示文档。',
  noHeadings: '当前文档还没有可用目录',
  noBlock: '请选择一个段落或标题',
  docStats: '文档信息',
  blockType: '区块类型',
  page: '页码',
  blockId: '区块 ID',
  selected: '当前段落',
  figures: '图片',
  equations: '公式',
  tables: '表格',
  citations: '引用',
  running: '进行中',
  completed: '已完成',
  partial: '部分完成',
  failed: '失败',
  futureTitle: '下一步交互接口',
  futureBody: '这里先保留段落级接口，后续会接入翻译、AI 对话与引用式笔记。',
  futureTranslate: '段落翻译接口已预留，下一步接入双语对照。',
  futureChat: '段落 AI 对话接口已预留，下一步接入上下文问答。',
  futureNote: '段落笔记接口已预留，下一步接入证据绑定笔记。',
  translate: '段落翻译',
  chat: 'AI 对话',
  note: '做笔记',
  leftRailLibraryShort: '库',
  leftRailOutlineShort: '目',
  collapseLeftRail: '收起左边栏',
  expandLeftRail: '展开左边栏',
  collapseRightRail: '收起右边栏',
  expandRightRail: '展开右边栏',
  renameFolder: '重命名文件夹',
  setTags: '设置标签',
  moveToFolder: '移动到文件夹',
  editBlock: '编辑区块',
  copyBlock: '复制',
  actionCancel: '取消',
  actionSave: '保存',
  rootFolder: '根目录',
  moveFolderHint: '选择一个已有文件夹作为目标位置。',
  settings: '设置',
  themes: {
    paper: 'Paper',
    journal: 'Journal',
    slate: 'Slate',
  },
} as const;

export function importStatusLabel(status: string) {
  switch (status) {
    case 'running':
    case 'queued':
      return UI.running;
    case 'completed':
      return UI.completed;
    case 'partial':
      return UI.partial;
    case 'failed':
      return UI.failed;
    default:
      return status;
  }
}
