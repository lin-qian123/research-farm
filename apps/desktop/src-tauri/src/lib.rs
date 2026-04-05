mod bundle_repo;
mod commands;
mod import_service;
mod library_service;
mod models;
mod notes_service;
mod paths;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(AppState::default())
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
      commands::list_local_bundles,
      commands::rename_bundle_group,
      commands::move_bundle_to_group,
      commands::update_bundle_library_metadata,
      commands::load_bundle,
      commands::save_block_markdown,
      commands::load_bundle_asset,
      commands::start_import_pdf_source,
      commands::list_import_jobs,
      commands::load_workspace_note,
      commands::save_workspace_note,
      commands::import_pdf_source
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
