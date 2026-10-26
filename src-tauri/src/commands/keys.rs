use tauri::State;

use crate::error::{AppError, AppResult};
use crate::host_key;
use crate::keys::{self, KeyPairPaths};
use crate::profiles::AuthMethod;
use crate::state::{find_profile, find_profile_mut, AppState};

#[tauri::command]
pub fn generate_profile_key(
    state: State<AppState>,
    profile_id: String,
    passphrase: String,
) -> AppResult<KeyPairPaths> {
    let mut v = state.vault.lock();
    let keys_dir = v.keys_dir();
    let paths = keys::generate_key(&keys_dir, &profile_id, &passphrase)?;
    let p = find_profile_mut(&mut v, &profile_id)?;
    keys::apply_generated_key_to_profile(p, &paths);
    v.save()?;
    Ok(paths)
}

#[tauri::command]
pub async fn install_profile_key(state: State<'_, AppState>, profile_id: String) -> AppResult<()> {
    let (profile, pub_path) = {
        let v = state.vault.lock();
        let profile = find_profile(&v, &profile_id)?.clone();
        let key_path = profile
            .private_key_path
            .clone()
            .ok_or_else(|| AppError::msg("Generate a key first"))?;
        (profile, format!("{key_path}.pub"))
    };
    keys::install_public_key(&profile, &pub_path).await?;
    let mut v = state.vault.lock();
    let p = find_profile_mut(&mut v, &profile_id)?;
    p.auth_method = AuthMethod::Key;
    v.save()?;
    Ok(())
}

#[tauri::command]
pub fn accept_host_key(host: String, port: u16, fingerprint: String) -> AppResult<()> {
    host_key::accept_host_key(&host, port, &fingerprint)
}

#[tauri::command]
pub fn probe_host_key(host: String, port: u16) -> AppResult<host_key::HostKeyInfo> {
    Ok(host_key::probe_status(
        &host,
        port,
        "pending-first-connect",
    ))
}
