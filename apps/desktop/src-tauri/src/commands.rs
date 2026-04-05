use crate::bundle_repo;
use crate::import_service;
use crate::library_service;
use crate::models::{BundlePayload, BundleSummary, ImportJob};
use crate::notes_service;
use crate::paths::{bundles_root, ensure_within_root};
use crate::state::AppState;
use std::path::PathBuf;

#[tauri::command]
pub fn list_local_bundles() -> Result<Vec<BundleSummary>, String> {
  library_service::list_local_bundles()
}

#[tauri::command]
pub fn rename_bundle_group(group_relative_path: String, new_name: String) -> Result<Vec<BundleSummary>, String> {
  library_service::rename_bundle_group(group_relative_path, new_name)
}

#[tauri::command]
pub fn move_bundle_to_group(bundle_path: String, target_group_relative_path: String) -> Result<Vec<BundleSummary>, String> {
  library_service::move_bundle_to_group(bundle_path, target_group_relative_path)
}

#[tauri::command]
pub fn update_bundle_library_metadata(bundle_path: String, title: Option<String>, tags: Option<Vec<String>>) -> Result<BundleSummary, String> {
  library_service::update_bundle_library_metadata(bundle_path, title, tags)
}

#[tauri::command]
pub fn load_bundle(bundle_path: String) -> Result<BundlePayload, String> {
  bundle_repo::bundle_payload_from_path(&PathBuf::from(&bundle_path))
}

#[tauri::command]
pub fn save_block_markdown(bundle_path: String, block_id: String, markdown: String) -> Result<BundlePayload, String> {
  let root = bundles_root()?;
  let path = ensure_within_root(&root, &PathBuf::from(&bundle_path))?;
  bundle_repo::save_block_markdown(&path, block_id, markdown)
}

#[tauri::command]
pub fn load_bundle_asset(bundle_path: String, asset_path: String) -> Result<String, String> {
  bundle_repo::load_bundle_asset(bundle_path, asset_path)
}

#[tauri::command]
pub fn start_import_pdf_source(state: tauri::State<AppState>, source_path: String) -> Result<ImportJob, String> {
  import_service::start_import_pdf_source(state.inner(), source_path)
}

#[tauri::command]
pub fn list_import_jobs(state: tauri::State<AppState>) -> Result<Vec<ImportJob>, String> {
  import_service::list_import_jobs(state.inner())
}

#[tauri::command]
pub fn load_workspace_note(bundle_id: String) -> Result<String, String> {
  notes_service::load_workspace_note(bundle_id)
}

#[tauri::command]
pub fn save_workspace_note(bundle_id: String, content: String) -> Result<String, String> {
  notes_service::save_workspace_note(bundle_id, content)
}

#[tauri::command]
pub fn import_pdf_source(source_path: String) -> Result<Vec<BundleSummary>, String> {
  import_service::import_pdf_source(source_path)
}
