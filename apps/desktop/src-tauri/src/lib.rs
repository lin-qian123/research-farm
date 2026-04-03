use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BundleSummary {
  title: Option<String>,
  bundle_id: String,
  path: String,
  relative_path: String,
  quality_score: f64,
  conversion_status: String,
  updated_at: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BundlePayload {
  manifest: Value,
  blocks: Vec<Value>,
  equations: Vec<Value>,
  tables: Vec<Value>,
  citations: Vec<Value>,
  content_list: Option<Vec<Value>>,
  paper_markdown: String,
  bundle_path: Option<String>,
  notes_path: Option<String>,
}

fn repo_root() -> Result<PathBuf, String> {
  PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    .join("../../..")
    .canonicalize()
    .map_err(|error| format!("Failed to resolve repo root: {error}"))
}

fn bundles_root() -> Result<PathBuf, String> {
  Ok(repo_root()?.join("data").join("bundles"))
}

fn notes_root() -> Result<PathBuf, String> {
  Ok(repo_root()?.join("data").join("workspace-notes"))
}

fn read_text(path: &Path) -> Result<String, String> {
  fs::read_to_string(path).map_err(|error| format!("Failed to read {}: {error}", path.display()))
}

fn read_json(path: &Path) -> Result<Value, String> {
  let text = read_text(path)?;
  serde_json::from_str(&text).map_err(|error| format!("Failed to parse {}: {error}", path.display()))
}

fn get_bundle_file(bundle_path: &Path, filename: &str) -> PathBuf {
  bundle_path.join(filename)
}

fn guess_mime_type(path: &Path) -> &'static str {
  match path.extension().and_then(|value| value.to_str()).map(|value| value.to_ascii_lowercase()) {
    Some(ext) if ext == "jpg" || ext == "jpeg" => "image/jpeg",
    Some(ext) if ext == "png" => "image/png",
    Some(ext) if ext == "gif" => "image/gif",
    Some(ext) if ext == "webp" => "image/webp",
    Some(ext) if ext == "svg" => "image/svg+xml",
    Some(ext) if ext == "bmp" => "image/bmp",
    _ => "application/octet-stream",
  }
}

fn build_bundle_summary(root: &Path, path: &Path) -> Result<BundleSummary, String> {
  let manifest_path = get_bundle_file(path, "manifest.json");
  let manifest = read_json(&manifest_path)?;
  let updated_at = fs::metadata(&manifest_path)
    .ok()
    .and_then(|metadata| metadata.modified().ok())
    .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
    .map(|duration| duration.as_secs())
    .map(|seconds| seconds.to_string());

  Ok(BundleSummary {
    title: manifest.get("title").and_then(Value::as_str).map(ToOwned::to_owned),
    bundle_id: manifest
      .get("bundle_id")
      .and_then(Value::as_str)
      .unwrap_or("unknown_bundle")
      .to_string(),
    path: path.display().to_string(),
    relative_path: path
      .strip_prefix(root)
      .map(|value| value.display().to_string())
      .unwrap_or_else(|_| path.display().to_string()),
    quality_score: manifest.get("quality_score").and_then(Value::as_f64).unwrap_or(0.0),
    conversion_status: manifest
      .get("conversion_status")
      .and_then(Value::as_str)
      .unwrap_or("unknown")
      .to_string(),
    updated_at,
  })
}

fn collect_bundle_paths(current_dir: &Path, collected: &mut Vec<PathBuf>) -> Result<(), String> {
  let entries = fs::read_dir(current_dir).map_err(|error| format!("Failed to list {}: {error}", current_dir.display()))?;

  for entry_result in entries {
    let entry = entry_result.map_err(|error| format!("Failed to read bundle entry: {error}"))?;
    let path = entry.path();
    if !path.is_dir() {
      continue;
    }

    if get_bundle_file(&path, "manifest.json").exists() && get_bundle_file(&path, "paper.md").exists() {
      collected.push(path);
      continue;
    }

    collect_bundle_paths(&path, collected)?;
  }

  Ok(())
}

#[tauri::command]
fn list_local_bundles() -> Result<Vec<BundleSummary>, String> {
  let root = bundles_root()?;
  if !root.exists() {
    return Ok(vec![]);
  }

  let mut bundle_paths = Vec::new();
  collect_bundle_paths(&root, &mut bundle_paths)?;

  let mut bundles = bundle_paths
    .iter()
    .map(|path| build_bundle_summary(&root, path))
    .collect::<Result<Vec<_>, _>>()?;

  bundles.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
  Ok(bundles)
}

#[tauri::command]
fn load_bundle(bundle_path: String) -> Result<BundlePayload, String> {
  let path = PathBuf::from(&bundle_path);
  if !path.exists() {
    return Err(format!("Bundle path does not exist: {bundle_path}"));
  }

  let manifest = read_json(&get_bundle_file(&path, "manifest.json"))?;
  let anchors = read_json(&get_bundle_file(&path, "anchors.json"))?;
  let equations = read_json(&get_bundle_file(&path, "equations.json"))?;
  let tables = read_json(&get_bundle_file(&path, "tables.json"))?;
  let citations = read_json(&get_bundle_file(&path, "citations.json"))?;
  let paper_markdown = read_text(&get_bundle_file(&path, "paper.md"))?;
  let content_list = get_bundle_file(&path, "content_list.json");

  let bundle_id = manifest
    .get("bundle_id")
    .and_then(Value::as_str)
    .unwrap_or("unknown_bundle")
    .to_string();
  let notes_path = notes_root()?.join(format!("{bundle_id}.md"));

  Ok(BundlePayload {
    manifest,
    blocks: anchors
      .get("blocks")
      .and_then(Value::as_array)
      .cloned()
      .unwrap_or_default(),
    equations: equations
      .get("equations")
      .and_then(Value::as_array)
      .cloned()
      .unwrap_or_default(),
    tables: tables
      .get("tables")
      .and_then(Value::as_array)
      .cloned()
      .unwrap_or_default(),
    citations: citations
      .get("citations")
      .and_then(Value::as_array)
      .cloned()
      .unwrap_or_default(),
    content_list: if content_list.exists() {
      Some(
        read_json(&content_list)?
          .as_array()
          .cloned()
          .unwrap_or_default(),
      )
    } else {
      None
    },
    paper_markdown,
    bundle_path: Some(path.display().to_string()),
    notes_path: Some(notes_path.display().to_string()),
  })
}

#[tauri::command]
fn load_bundle_asset(bundle_path: String, asset_path: String) -> Result<String, String> {
  let bundle_root = PathBuf::from(&bundle_path)
    .canonicalize()
    .map_err(|error| format!("Failed to resolve bundle path {bundle_path}: {error}"))?;
  let requested_path = bundle_root.join(&asset_path);
  let canonical_asset_path = requested_path
    .canonicalize()
    .map_err(|error| format!("Failed to resolve asset {}: {error}", requested_path.display()))?;

  if !canonical_asset_path.starts_with(&bundle_root) {
    return Err(format!(
      "Asset path escapes bundle root: {}",
      canonical_asset_path.display()
    ));
  }

  let bytes =
    fs::read(&canonical_asset_path).map_err(|error| format!("Failed to read {}: {error}", canonical_asset_path.display()))?;
  let mime = guess_mime_type(&canonical_asset_path);
  let encoded = STANDARD.encode(bytes);
  Ok(format!("data:{mime};base64,{encoded}"))
}

#[tauri::command]
fn load_workspace_note(bundle_id: String) -> Result<String, String> {
  let path = notes_root()?.join(format!("{bundle_id}.md"));
  if !path.exists() {
    return Ok(String::new());
  }
  read_text(&path)
}

#[tauri::command]
fn save_workspace_note(bundle_id: String, content: String) -> Result<String, String> {
  let root = notes_root()?;
  fs::create_dir_all(&root).map_err(|error| format!("Failed to create {}: {error}", root.display()))?;
  let path = root.join(format!("{bundle_id}.md"));
  fs::write(&path, content).map_err(|error| format!("Failed to write {}: {error}", path.display()))?;
  Ok(path.display().to_string())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CliImportItem {
  bundle_dir: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CliImportResult {
  imported: Vec<CliImportItem>,
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

#[tauri::command]
fn import_pdf_source(source_path: String) -> Result<Vec<BundleSummary>, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      list_local_bundles,
      load_bundle,
      load_bundle_asset,
      load_workspace_note,
      save_workspace_note,
      import_pdf_source
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
