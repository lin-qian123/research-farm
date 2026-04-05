use crate::bundle_repo::build_bundle_summary;
use crate::models::{CliImportResult, ImportJob, ImportJobItem, PdfImportTask};
use crate::paths::{bundles_root, iso_now, repo_root, sanitize_stem};
use crate::state::AppState;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;

pub fn collect_pdf_files(input_path: &Path) -> Result<Vec<PdfImportTask>, String> {
  let metadata = fs::metadata(input_path).map_err(|error| format!("Failed to inspect {}: {error}", input_path.display()))?;

  if metadata.is_file() {
    let is_pdf = input_path
      .extension()
      .and_then(|value| value.to_str())
      .map(|value| value.eq_ignore_ascii_case("pdf"))
      .unwrap_or(false);
    if !is_pdf {
      return Err(format!("Only PDF files are supported: {}", input_path.display()));
    }
    return Ok(vec![PdfImportTask {
      pdf_path: input_path.to_path_buf(),
      relative_dir: String::new(),
    }]);
  }

  let mut collected = Vec::new();

  fn walk(root: &Path, current: &Path, collected: &mut Vec<PdfImportTask>) -> Result<(), String> {
    let entries = fs::read_dir(current).map_err(|error| format!("Failed to list {}: {error}", current.display()))?;
    let mut paths = entries.filter_map(Result::ok).map(|entry| entry.path()).collect::<Vec<_>>();
    paths.sort();

    for path in paths {
      if path.is_dir() {
        walk(root, &path, collected)?;
        continue;
      }

      let is_pdf = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("pdf"))
        .unwrap_or(false);
      if !is_pdf {
        continue;
      }

      let relative_dir = path
        .parent()
        .and_then(|parent| parent.strip_prefix(root).ok())
        .map(|value| value.display().to_string())
        .unwrap_or_default();

      collected.push(PdfImportTask { pdf_path: path, relative_dir });
    }

    Ok(())
  }

  walk(input_path, input_path, &mut collected)?;

  if collected.is_empty() {
    return Err(format!("No PDF files found under: {}", input_path.display()));
  }

  Ok(collected)
}

pub fn summarize_import_error(raw: &str) -> String {
  let trimmed = raw.trim();
  if trimmed.is_empty() {
    return "导入失败".to_string();
  }

  if trimmed.contains("MINERU_API_KEY is not set") {
    return "未设置 MINERU_API_KEY".to_string();
  }
  if trimmed.contains("No PDF files found") {
    return "未找到 PDF 文件".to_string();
  }
  if trimmed.contains("Only PDF files are supported") {
    return "只支持 PDF 文件".to_string();
  }
  if trimmed.contains("MinerU conversion failed") || trimmed.contains("MinerU poll failed") || trimmed.contains("MinerU init failed") {
    return "MinerU 转换失败".to_string();
  }

  trimmed
    .lines()
    .find(|line| !line.trim().is_empty())
    .map(|line| {
      let compact = line.trim().replace('\t', " ");
      if compact.chars().count() > 120 {
        compact.chars().take(120).collect::<String>()
      } else {
        compact
      }
    })
    .unwrap_or_else(|| "导入失败".to_string())
}

pub fn run_single_import(source_path: &Path, output_root: &Path) -> Result<PathBuf, String> {
  let repo = repo_root()?;
  let cli_path = repo.join("apps").join("cli").join("src").join("index.mjs");
  let command_output = Command::new("node")
    .current_dir(&repo)
    .arg(cli_path)
    .arg("import-paper")
    .arg(source_path)
    .arg("--output")
    .arg(output_root)
    .output()
    .map_err(|error| format!("Failed to run import-paper: {error}"))?;

  if !command_output.status.success() {
    let stderr = String::from_utf8_lossy(&command_output.stderr);
    let stdout = String::from_utf8_lossy(&command_output.stdout);
    let combined = format!("{}\n{}", stderr.trim(), stdout.trim());
    return Err(summarize_import_error(&combined));
  }

  Ok(output_root.join(sanitize_stem(source_path)))
}

pub fn update_import_job<F>(state: &AppState, job_id: &str, updater: F) -> Result<(), String>
where
  F: FnOnce(&mut ImportJob),
{
  let mut jobs = state
    .import_jobs
    .lock()
    .map_err(|_| "Failed to lock import jobs".to_string())?;
  let job = jobs.get_mut(job_id).ok_or_else(|| format!("Import job not found: {job_id}"))?;
  updater(job);
  Ok(())
}

pub fn start_import_pdf_source(state: &AppState, source_path: String) -> Result<ImportJob, String> {
  let repo = repo_root()?;
  let output_root = repo.join("data").join("bundles");
  let resolved_source_path = PathBuf::from(&source_path)
    .canonicalize()
    .map_err(|error| format!("Failed to resolve import source {source_path}: {error}"))?;
  let tasks = collect_pdf_files(&resolved_source_path)?;
  let job_id = format!("job_{}", chrono::Utc::now().timestamp_millis());
  let job = ImportJob {
    id: job_id.clone(),
    source_path: resolved_source_path.display().to_string(),
    status: "queued".to_string(),
    total_files: tasks.len(),
    completed_files: 0,
    failed_files: 0,
    current_file: None,
    message: Some("导入任务已开始".to_string()),
    items: Vec::new(),
    started_at: Some(iso_now()),
    finished_at: None,
  };

  {
    let mut jobs = state
      .import_jobs
      .lock()
      .map_err(|_| "Failed to lock import jobs".to_string())?;
    jobs.insert(job_id.clone(), job.clone());
  }

  let state = state.clone();
  thread::spawn(move || {
    let _ = update_import_job(&state, &job_id, |job| {
      job.status = "running".to_string();
    });

    for task in tasks {
      let source_display = task.pdf_path.display().to_string();
      let file_name = task
        .pdf_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("paper.pdf")
        .to_string();

      let _ = update_import_job(&state, &job_id, |job| {
        job.current_file = Some(file_name.clone());
        job.message = Some(format!("正在导入 {}", file_name));
        job.items.push(ImportJobItem {
          source_path: source_display.clone(),
          relative_dir: task.relative_dir.clone(),
          status: "running".to_string(),
          bundle_dir: None,
          title: None,
          message: None,
        });
      });

      let target_root = if task.relative_dir.is_empty() {
        output_root.clone()
      } else {
        output_root.join(&task.relative_dir)
      };

      let import_result = run_single_import(&task.pdf_path, &target_root);

      let _ = update_import_job(&state, &job_id, |job| {
        let item = job.items.last_mut();
        match import_result {
          Ok(bundle_dir) => {
            job.completed_files += 1;
            if let Ok(root) = bundles_root() {
              if let Ok(summary) = build_bundle_summary(&root, &bundle_dir) {
                if let Some(item) = item {
                  item.status = "completed".to_string();
                  item.bundle_dir = Some(bundle_dir.display().to_string());
                  item.title = summary.title.clone();
                }
              } else if let Some(item) = item {
                item.status = "completed".to_string();
                item.bundle_dir = Some(bundle_dir.display().to_string());
              }
            }
          }
          Err(message) => {
            job.failed_files += 1;
            if let Some(item) = item {
              item.status = "failed".to_string();
              item.message = Some(message.clone());
            }
          }
        }
      });
    }

    let _ = update_import_job(&state, &job_id, |job| {
      job.current_file = None;
      job.finished_at = Some(iso_now());
      job.status = if job.failed_files == 0 {
        "completed".to_string()
      } else if job.completed_files == 0 {
        "failed".to_string()
      } else {
        "partial".to_string()
      };
      job.message = match job.status.as_str() {
        "completed" => Some(format!("已完成导入，共 {} 篇", job.completed_files)),
        "partial" => Some(format!("导入完成，成功 {} 篇，失败 {} 篇", job.completed_files, job.failed_files)),
        _ => Some("导入失败".to_string()),
      };
    });
  });

  Ok(job)
}

pub fn list_import_jobs(state: &AppState) -> Result<Vec<ImportJob>, String> {
  let jobs = state
    .import_jobs
    .lock()
    .map_err(|_| "Failed to lock import jobs".to_string())?;
  let mut values = jobs.values().cloned().collect::<Vec<_>>();
  values.sort_by(|left, right| right.started_at.cmp(&left.started_at));
  Ok(values)
}

fn extract_json_payload(stdout: &str) -> Result<&str, String> {
  let trimmed = stdout.trim();
  if trimmed.is_empty() {
    return Err("Import command returned empty output".to_string());
  }

  if trimmed.starts_with('{') {
    return Ok(trimmed);
  }

  if let Some(index) = trimmed.find('{') {
    return Ok(&trimmed[index..]);
  }

  Err(format!("Import command did not return JSON:\n{trimmed}"))
}

pub fn import_pdf_source(source_path: String) -> Result<Vec<crate::models::BundleSummary>, String> {
  let repo = repo_root()?;
  let cli_path = repo.join("apps").join("cli").join("src").join("index.mjs");
  let output_root = repo.join("data").join("bundles");

  let command_output = Command::new("node")
    .current_dir(&repo)
    .arg(cli_path)
    .arg("import-source")
    .arg(&source_path)
    .arg("--output")
    .arg(&output_root)
    .output()
    .map_err(|error| format!("Failed to run import-source: {error}"))?;

  if !command_output.status.success() {
    let stderr = String::from_utf8_lossy(&command_output.stderr);
    let stdout = String::from_utf8_lossy(&command_output.stdout);
    return Err(format!("Import failed.\n{}\n{}", stderr.trim(), stdout.trim()));
  }

  let stdout = String::from_utf8(command_output.stdout).map_err(|error| format!("Invalid CLI output: {error}"))?;
  let json_payload = extract_json_payload(&stdout)?;
  let parsed: CliImportResult =
    serde_json::from_str(json_payload).map_err(|error| format!("Failed to parse import result: {error}\n{stdout}"))?;

  let root = bundles_root()?;
  parsed
    .imported
    .iter()
    .map(|item| build_bundle_summary(&root, &PathBuf::from(&item.bundle_dir)))
    .collect()
}
