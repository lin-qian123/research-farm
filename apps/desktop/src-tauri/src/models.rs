use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundleSummary {
  pub title: Option<String>,
  pub tags: Vec<String>,
  pub bundle_id: String,
  pub path: String,
  pub relative_path: String,
  pub quality_score: f64,
  pub conversion_status: String,
  pub updated_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BundlePayload {
  pub manifest: Value,
  pub blocks: Vec<Value>,
  pub equations: Vec<Value>,
  pub tables: Vec<Value>,
  pub citations: Vec<Value>,
  pub content_list: Option<Vec<Value>>,
  pub paper_markdown: String,
  pub bundle_path: Option<String>,
  pub notes_path: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportJobItem {
  pub source_path: String,
  pub relative_dir: String,
  pub status: String,
  pub bundle_dir: Option<String>,
  pub title: Option<String>,
  pub message: Option<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportJob {
  pub id: String,
  pub source_path: String,
  pub status: String,
  pub total_files: usize,
  pub completed_files: usize,
  pub failed_files: usize,
  pub current_file: Option<String>,
  pub message: Option<String>,
  pub items: Vec<ImportJobItem>,
  pub started_at: Option<String>,
  pub finished_at: Option<String>,
}

#[derive(Clone)]
pub struct PdfImportTask {
  pub pdf_path: PathBuf,
  pub relative_dir: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliImportItem {
  pub bundle_dir: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliImportResult {
  pub imported: Vec<CliImportItem>,
}
