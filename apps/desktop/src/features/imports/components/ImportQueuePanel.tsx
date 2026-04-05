import { UI, importStatusLabel } from '../../../app/uiCopy';
import { useImportQueue } from '../hooks/useImportQueue';

export function ImportQueuePanel() {
  const { isNative, importJobs } = useImportQueue();

  if (!isNative) {
    return (
      <div className="empty-state small">
        <span>{UI.importReadingHint}</span>
      </div>
    );
  }

  if (importJobs.length === 0) {
    return (
      <div className="empty-state small">
        <span>{UI.importIdle}</span>
      </div>
    );
  }

  return (
    <div className="import-job-list">
      {importJobs.slice(0, 3).map(job => (
        <article key={job.id} className={`import-job status-${job.status}`}>
          <div className="import-job-head">
            <strong>{importStatusLabel(job.status)}</strong>
            <span>
              {job.completedFiles + job.failedFiles} / {job.totalFiles}
            </span>
          </div>
          <div className="import-progress">
            <div
              className="import-progress-bar"
              style={{
                width: `${job.totalFiles > 0 ? ((job.completedFiles + job.failedFiles) / job.totalFiles) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="import-job-message">{job.message || UI.importReadingHint}</p>
          {job.currentFile ? <span className="import-job-file">{job.currentFile}</span> : null}
          {job.items.some(item => item.status === 'failed') ? (
            <ul className="import-errors">
              {job.items
                .filter(item => item.status === 'failed')
                .slice(0, 2)
                .map(item => (
                  <li key={item.sourcePath}>{item.message || UI.failed}</li>
                ))}
            </ul>
          ) : null}
        </article>
      ))}
    </div>
  );
}
