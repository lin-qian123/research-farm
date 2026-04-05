import type { ChangeEvent } from 'react';
import { UI } from '../../../app/uiCopy';
import { useReaderTheme } from '../../../app/providers/ThemeProvider';
import { useWorkspaceSession } from '../../../app/providers/WorkspaceSessionProvider';
import type { ReaderTheme } from '../../../app/providers/ThemeProvider';
import { ImportQueuePanel } from '../../imports/components/ImportQueuePanel';
import { DEMO_BUNDLES } from '../../../lib/demoBundle';

type SettingsPanelProps = {
  isOpen: boolean;
};

export function SettingsPanel({ isOpen }: SettingsPanelProps) {
  const { theme, setTheme } = useReaderTheme();
  const { isNative, openBundle, openBundleFolder, startImport } = useWorkspaceSession();

  async function handleOpenBundleFolder(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      await openBundleFolder(files);
    } finally {
      event.target.value = '';
    }
  }

  if (!isOpen) return null;

  return (
    <section className="settings-panel">
      <div className="settings-group">
        <div className="panel-header">
          <p>{UI.brand}</p>
        </div>
        <div className="settings-actions">
          <button type="button" className="reader-button primary" onClick={() => void startImport('file')}>
            {UI.importPdfFile}
          </button>
          <button type="button" className="reader-button secondary" onClick={() => void startImport('folder')}>
            {UI.importPdfFolder}
          </button>
          {!isNative ? (
            <label className="reader-button secondary">
              {UI.openBundleFolder}
              <input type="file" multiple webkitdirectory="" directory="" onChange={handleOpenBundleFolder} />
            </label>
          ) : null}
          <button type="button" className="reader-button ghost" onClick={() => void openBundle(DEMO_BUNDLES[0]!)}>
            {UI.loadDemo}
          </button>
        </div>
      </div>

      <div className="settings-group">
        <div className="panel-header">
          <p>{UI.themes.paper}</p>
        </div>
        <div className="theme-switcher">
          {(['paper', 'journal', 'slate'] as ReaderTheme[]).map(item => (
            <button
              key={item}
              type="button"
              className={theme === item ? 'theme-button active' : 'theme-button'}
              onClick={() => setTheme(item)}
            >
              {UI.themes[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-group">
        <div className="panel-header">
          <p>{UI.importQueue}</p>
        </div>
        <ImportQueuePanel />
      </div>
    </section>
  );
}
