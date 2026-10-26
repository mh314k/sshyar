use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::state::AppState;
use crate::vault::VaultStatus;

#[tauri::command]
pub fn vault_status(state: State<AppState>) -> VaultStatus {
    state.vault.lock().status()
}

#[tauri::command]
pub fn vault_unlock(state: State<AppState>, password: String) -> AppResult<VaultStatus> {
    let mut v = state.vault.lock();
    v.unlock_password(&password)?;
    Ok(v.status())
}

#[tauri::command]
pub async fn vault_lock(state: State<'_, AppState>) -> AppResult<()> {
    state.docker_logs.stop_all().await;
    state.docker_sessions.close_all().await;
    state.vault.lock().lock();
    Ok(())
}

#[tauri::command]
pub fn vault_set_master_password(state: State<AppState>, password: String) -> AppResult<()> {
    state.vault.lock().set_master_password(&password)
}

#[tauri::command]
pub fn vault_change_master_password(
    state: State<AppState>,
    current: String,
    next: String,
) -> AppResult<()> {
    state.vault.lock().change_master_password(&current, &next)
}

#[tauri::command]
pub fn vault_remove_master_password(state: State<AppState>, password: String) -> AppResult<()> {
    state.vault.lock().remove_master_password(&password)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultBackupResult {
    pub path: String,
    pub profile_count: usize,
    pub snippet_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultImportResult {
    pub profiles: usize,
    pub snippets: usize,
    pub replaced: bool,
}

/// Write an encrypted portable vault backup to `path`.
#[tauri::command]
pub fn vault_export_backup(
    state: State<AppState>,
    password: String,
    path: String,
) -> AppResult<VaultBackupResult> {
    let path = PathBuf::from(path.trim());
    if path.as_os_str().is_empty() {
        return Err(AppError::msg("Backup path is empty"));
    }
    let v = state.vault.lock();
    let status = v.status();
    let bytes = v.export_backup(&password)?;
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }
    fs::write(&path, bytes)?;
    Ok(VaultBackupResult {
        path: path.display().to_string(),
        profile_count: status.profile_count,
        snippet_count: status.snippet_count,
    })
}

/// Import an encrypted portable vault backup from `path`.
#[tauri::command]
pub fn vault_import_backup(
    state: State<AppState>,
    password: String,
    path: String,
    replace: bool,
) -> AppResult<VaultImportResult> {
    let path = PathBuf::from(path.trim());
    if path.as_os_str().is_empty() {
        return Err(AppError::msg("Backup path is empty"));
    }
    let bytes = fs::read(&path).map_err(|e| AppError::msg(format!("Read backup: {e}")))?;
    let mut v = state.vault.lock();
    let (profiles, snippets) = v.import_backup(&password, &bytes, replace)?;
    Ok(VaultImportResult {
        profiles,
        snippets,
        replaced: replace,
    })
}
