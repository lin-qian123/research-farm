use crate::paths::{notes_root, read_text};
use std::fs;

pub fn load_workspace_note(bundle_id: String) -> Result<String, String> {
  let path = notes_root()?.join(format!("{bundle_id}.md"));
  if !path.exists() {
    return Ok(String::new());
  }
  read_text(&path)
}

pub fn save_workspace_note(bundle_id: String, content: String) -> Result<String, String> {
  let root = notes_root()?;
  fs::create_dir_all(&root).map_err(|error| format!("Failed to create {}: {error}", root.display()))?;
  let path = root.join(format!("{bundle_id}.md"));
  fs::write(&path, content).map_err(|error| format!("Failed to write {}: {error}", path.display()))?;
  Ok(path.display().to_string())
}
