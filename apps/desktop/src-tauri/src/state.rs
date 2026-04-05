use crate::models::ImportJob;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
pub struct AppState {
  pub import_jobs: Arc<Mutex<HashMap<String, ImportJob>>>,
}
