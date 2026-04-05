use crate::bundle_repo::{build_bundle_summary, list_bundles};
use crate::models::BundleSummary;
use crate::paths::{bundles_root, ensure_within_root, get_bundle_file, read_json, sanitize_name, sanitize_relative_dir};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

pub fn list_local_bundles() -> Result<Vec<BundleSummary>, String> {
  list_bundles()
}

pub fn rename_bundle_group(group_relative_path: String, new_name: String) -> Result<Vec<BundleSummary>, String> {
  let root = bundles_root()?;
  fs::create_dir_all(&root).map_err(|error| format!("Failed to create {}: {error}", root.display()))?;

  let relative = sanitize_relative_dir(&group_relative_path)?;
  if relative.as_os_str().is_empty() {
    return Err("根目录不能重命名".to_string());
  }

  let sanitized_name = sanitize_name(&new_name)?;
  let source = root.join(&relative);
  let source = ensure_within_root(&root, &source)?;
  if !source.is_dir() {
    return Err(format!("文件夹不存在: {}", source.display()));
  }

  let parent = source.parent().ok_or_else(|| "无法解析父目录".to_string())?;
  let target = parent.join(&sanitized_name);
  if target.exists() {
    return Err(format!("目标文件夹已存在: {}", target.display()));
  }

  fs::rename(&source, &target).map_err(|error| format!("Failed to rename folder {}: {error}", source.display()))?;
  list_bundles()
}

pub fn move_bundle_to_group(bundle_path: String, target_group_relative_path: String) -> Result<Vec<BundleSummary>, String> {
  let root = bundles_root()?;
  fs::create_dir_all(&root).map_err(|error| format!("Failed to create {}: {error}", root.display()))?;

  let source = ensure_within_root(&root, &PathBuf::from(&bundle_path))?;
  if !source.is_dir() {
    return Err(format!("Bundle path does not exist: {bundle_path}"));
  }

  let target_relative = sanitize_relative_dir(&target_group_relative_path)?;
  let target_parent = root.join(&target_relative);
  fs::create_dir_all(&target_parent)
    .map_err(|error| format!("Failed to create destination {}: {error}", target_parent.display()))?;
  let target_parent = ensure_within_root(&root, &target_parent)?;

  let bundle_name = source
    .file_name()
    .and_then(|value| value.to_str())
    .ok_or_else(|| "Invalid bundle path".to_string())?
    .to_string();
  let target = target_parent.join(&bundle_name);
  if target == source {
    return list_bundles();
  }
  if target.exists() {
    return Err(format!("目标位置已存在同名文献: {}", target.display()));
  }

  fs::rename(&source, &target).map_err(|error| format!("Failed to move bundle {}: {error}", source.display()))?;
  list_bundles()
}

pub fn update_bundle_library_metadata(bundle_path: String, title: Option<String>, tags: Option<Vec<String>>) -> Result<BundleSummary, String> {
  let root = bundles_root()?;
  let path = ensure_within_root(&root, &PathBuf::from(&bundle_path))?;
  let manifest_path = get_bundle_file(&path, "manifest.json");
  let mut manifest = read_json(&manifest_path)?;
  let object = manifest
    .as_object_mut()
    .ok_or_else(|| format!("Manifest is not a JSON object: {}", manifest_path.display()))?;

  if let Some(next_title) = title {
    let normalized = next_title.trim();
    if normalized.is_empty() {
      object.insert("title".to_string(), Value::Null);
    } else {
      object.insert("title".to_string(), Value::String(normalized.to_string()));
    }
  }

  if let Some(next_tags) = tags {
    let normalized = next_tags
      .into_iter()
      .map(|tag| tag.trim().to_string())
      .filter(|tag| !tag.is_empty())
      .collect::<Vec<_>>();
    object.insert(
      "tags".to_string(),
      Value::Array(normalized.into_iter().map(Value::String).collect()),
    );
  }

  let serialized =
    serde_json::to_string_pretty(&manifest).map_err(|error| format!("Failed to serialize {}: {error}", manifest_path.display()))?;
  fs::write(&manifest_path, format!("{serialized}\n"))
    .map_err(|error| format!("Failed to write {}: {error}", manifest_path.display()))?;
  build_bundle_summary(&root, &path)
}
