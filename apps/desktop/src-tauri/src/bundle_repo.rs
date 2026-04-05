use crate::models::{BundlePayload, BundleSummary};
use crate::paths::{
  bundles_root, get_bundle_file, notes_root, parse_tags, read_json, read_text, repo_root, write_text,
};
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;

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

pub fn bundle_payload_from_path(path: &Path) -> Result<BundlePayload, String> {
  if !path.exists() {
    return Err(format!("Bundle path does not exist: {}", path.display()));
  }

  let manifest = read_json(&get_bundle_file(path, "manifest.json"))?;
  let anchors = read_json(&get_bundle_file(path, "anchors.json"))?;
  let equations = read_json(&get_bundle_file(path, "equations.json"))?;
  let tables = read_json(&get_bundle_file(path, "tables.json"))?;
  let citations = read_json(&get_bundle_file(path, "citations.json"))?;
  let paper_markdown = read_text(&get_bundle_file(path, "paper.md"))?;
  let content_list = get_bundle_file(path, "content_list.json");

  let bundle_id = manifest
    .get("bundle_id")
    .and_then(Value::as_str)
    .unwrap_or("unknown_bundle")
    .to_string();
  let notes_path = notes_root()?.join(format!("{bundle_id}.md"));

  Ok(BundlePayload {
    manifest,
    blocks: anchors.get("blocks").and_then(Value::as_array).cloned().unwrap_or_default(),
    equations: equations.get("equations").and_then(Value::as_array).cloned().unwrap_or_default(),
    tables: tables.get("tables").and_then(Value::as_array).cloned().unwrap_or_default(),
    citations: citations.get("citations").and_then(Value::as_array).cloned().unwrap_or_default(),
    content_list: if content_list.exists() {
      Some(read_json(&content_list)?.as_array().cloned().unwrap_or_default())
    } else {
      None
    },
    paper_markdown,
    bundle_path: Some(path.display().to_string()),
    notes_path: Some(notes_path.display().to_string()),
  })
}

pub fn rebuild_bundle_indexes(bundle_path: &Path) -> Result<(), String> {
  let repo = repo_root()?;
  let cli_path = repo.join("apps").join("cli").join("src").join("index.mjs");
  let manifest_path = get_bundle_file(bundle_path, "manifest.json");
  let manifest = read_json(&manifest_path)?;
  let source_path = manifest
    .get("source_path")
    .and_then(Value::as_str)
    .map(ToOwned::to_owned);

  let mut command = Command::new("node");
  command
    .current_dir(&repo)
    .arg(cli_path)
    .arg("index-markdown")
    .arg(bundle_path);

  if let Some(source_path) = source_path {
    command.arg("--source").arg(source_path);
  }

  let output = command
    .output()
    .map_err(|error| format!("Failed to reindex bundle {}: {error}", bundle_path.display()))?;

  if !output.status.success() {
    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    return Err(format!("Failed to reindex bundle.\n{}\n{}", stderr.trim(), stdout.trim()));
  }

  Ok(())
}

pub fn build_bundle_summary(root: &Path, path: &Path) -> Result<BundleSummary, String> {
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
    tags: manifest.get("tags").map(|value| parse_tags(value.clone())).unwrap_or_default(),
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

pub fn collect_bundle_paths(current_dir: &Path, collected: &mut Vec<PathBuf>) -> Result<(), String> {
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

pub fn load_bundle_asset(bundle_path: String, asset_path: String) -> Result<String, String> {
  let bundle_root = PathBuf::from(&bundle_path)
    .canonicalize()
    .map_err(|error| format!("Failed to resolve bundle path {bundle_path}: {error}"))?;
  let requested_path = bundle_root.join(&asset_path);
  let canonical_asset_path = requested_path
    .canonicalize()
    .map_err(|error| format!("Failed to resolve asset {}: {error}", requested_path.display()))?;

  if !canonical_asset_path.starts_with(&bundle_root) {
    return Err(format!("Asset path escapes bundle root: {}", canonical_asset_path.display()));
  }

  let bytes = fs::read(&canonical_asset_path)
    .map_err(|error| format!("Failed to read {}: {error}", canonical_asset_path.display()))?;
  let mime = guess_mime_type(&canonical_asset_path);
  let encoded = STANDARD.encode(bytes);
  Ok(format!("data:{mime};base64,{encoded}"))
}

pub fn save_block_markdown(bundle_path: &Path, block_id: String, markdown: String) -> Result<BundlePayload, String> {
  let anchors_path = get_bundle_file(bundle_path, "anchors.json");
  let paper_path = get_bundle_file(bundle_path, "paper.md");
  let anchors = read_json(&anchors_path)?;
  let blocks = anchors
    .get("blocks")
    .and_then(Value::as_array)
    .cloned()
    .ok_or_else(|| format!("Invalid anchors file: {}", anchors_path.display()))?;

  let normalized_markdown = markdown.replace("\r\n", "\n");
  let mut updated = false;
  let next_blocks = blocks
    .into_iter()
    .map(|mut block| {
      let current_id = block.get("block_id").and_then(Value::as_str).unwrap_or_default();
      if current_id == block_id {
        if let Some(object) = block.as_object_mut() {
          object.insert("markdown".to_string(), Value::String(normalized_markdown.clone()));
          updated = true;
        }
      }
      block
    })
    .collect::<Vec<_>>();

  if !updated {
    return Err(format!("Block not found: {block_id}"));
  }

  let next_paper_markdown = next_blocks
    .iter()
    .filter_map(|block| block.get("markdown").and_then(Value::as_str))
    .map(str::trim_end)
    .collect::<Vec<_>>()
    .join("\n\n");

  write_text(&paper_path, &format!("{next_paper_markdown}\n"))?;
  rebuild_bundle_indexes(bundle_path)?;
  bundle_payload_from_path(bundle_path)
}

pub fn list_bundles() -> Result<Vec<BundleSummary>, String> {
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
