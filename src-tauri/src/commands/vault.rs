use tauri::State;

use crate::error::AppResult;
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
pub fn vault_lock(state: State<AppState>) -> AppResult<()> {
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
