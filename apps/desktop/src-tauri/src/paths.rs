use serde_json::Value;
use std::fs;
use std::path::{Component, Path, PathBuf};

pub fn repo_root() -> Result<PathBuf, String> {
  PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    .join("../../..")
    .canonicalize()
    .map_err(|error| format!("Failed to resolve repo root: {error}"))
}

pub fn bundles_root() -> Result<PathBuf, String> {
  Ok(repo_root()?.join("data").join("bundles"))
}

pub fn notes_root() -> Result<PathBuf, String> {
  Ok(repo_root()?.join("data").join("workspace-notes"))
}

pub fn read_text(path: &Path) -> Result<String, String> {
  fs::read_to_string(path).map_err(|error| format!("Failed to read {}: {error}", path.display()))
}

pub fn read_json(path: &Path) -> Result<Value, String> {
  let text = read_text(path)?;
  serde_json::from_str(&text).map_err(|error| format!("Failed to parse {}: {error}", path.display()))
}

pub fn write_text(path: &Path, content: &str) -> Result<(), String> {
  fs::write(path, content).map_err(|error| format!("Failed to write {}: {error}", path.display()))
}

pub fn get_bundle_file(bundle_path: &Path, filename: &str) -> PathBuf {
  bundle_path.join(filename)
}

pub fn sanitize_stem(file_path: &Path) -> String {
  file_path
    .file_stem()
    .and_then(|value| value.to_str())
    .unwrap_or("paper")
    .to_string()
}

pub fn iso_now() -> String {
  chrono::Utc::now().to_rfc3339()
}

pub fn ensure_within_root(root: &Path, candidate: &Path) -> Result<PathBuf, String> {
  let resolved_root = root
    .canonicalize()
    .map_err(|error| format!("Failed to resolve root {}: {error}", root.display()))?;
  let resolved_candidate = candidate
    .canonicalize()
    .map_err(|error| format!("Failed to resolve path {}: {error}", candidate.display()))?;
  if !resolved_candidate.starts_with(&resolved_root) {
    return Err(format!("Path escapes bundles root: {}", resolved_candidate.display()));
  }
  Ok(resolved_candidate)
}

pub fn sanitize_relative_dir(value: &str) -> Result<PathBuf, String> {
  let trimmed = value.trim().trim_matches('/');
  if trimmed.is_empty() {
    return Ok(PathBuf::new());
  }
  let relative = PathBuf::from(trimmed);
  if relative.is_absolute() || relative.components().any(|component| matches!(component, Component::ParentDir)) {
    return Err(format!("Invalid relative path: {value}"));
  }
  Ok(relative)
}

pub fn sanitize_name(value: &str) -> Result<String, String> {
  let trimmed = value.trim();
  if trimmed.is_empty() {
    return Err("名称不能为空".to_string());
  }
  if trimmed == "." || trimmed == ".." || trimmed.contains('/') || trimmed.contains('\\') {
    return Err("名称包含非法字符".to_string());
  }
  Ok(trimmed.to_string())
}

pub fn parse_tags(value: Value) -> Vec<String> {
  value
    .as_array()
    .map(|items| {
      items
        .iter()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .map(ToOwned::to_owned)
        .collect::<Vec<_>>()
    })
    .unwrap_or_default()
}
