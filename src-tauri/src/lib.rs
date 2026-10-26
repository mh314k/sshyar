mod error;
mod host_key;
mod keys;
mod profiles;
mod pty;
mod sftp;
mod ssh_cmd;
mod ssh_session;
mod vault;

use parking_lot::Mutex;
use profiles::{Profile, ProfileInput, Snippet};
use pty::{PtyManager, SharedPty};
use serde::Serialize;
use sftp::{RemoteEntry, SftpManager, SharedSftp};
use std::process::Command;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;
use vault::{VaultState, VaultStatus};

use error::{AppError, AppResult};
use keys::KeyPairPaths;

pub struct AppState {
    pub vault: Mutex<VaultState>,
    pub pty: SharedPty,
    pub sftp: SharedSftp,
}

fn find_profile_mut<'a>(
    vault: &'a mut VaultState,
    id: &str,
) -> AppResult<&'a mut Profile> {
    vault
        .data_mut()?
        .profiles
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::msg("Profile not found"))
}

fn find_profile<'a>(vault: &'a VaultState, id: &str) -> AppResult<&'a Profile> {
    vault
        .data()?
        .profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::msg("Profile not found"))
}

#[tauri::command]
fn vault_status(state: State<AppState>) -> VaultStatus {
    state.vault.lock().status()
}

#[tauri::command]
fn vault_unlock(state: State<AppState>, password: String) -> AppResult<VaultStatus> {
    let mut v = state.vault.lock();
    v.unlock_password(&password)?;
    Ok(v.status())
}

#[tauri::command]
fn vault_lock(state: State<AppState>) -> AppResult<()> {
    state.vault.lock().lock();
    Ok(())
}

#[tauri::command]
fn vault_set_master_password(state: State<AppState>, password: String) -> AppResult<()> {
    state.vault.lock().set_master_password(&password)
}

#[tauri::command]
fn vault_change_master_password(
    state: State<AppState>,
    current: String,
    next: String,
) -> AppResult<()> {
    state.vault.lock().change_master_password(&current, &next)
}

#[tauri::command]
fn vault_remove_master_password(state: State<AppState>, password: String) -> AppResult<()> {
    state.vault.lock().remove_master_password(&password)
}

#[tauri::command]
fn list_profiles(state: State<AppState>) -> AppResult<Vec<Profile>> {
    Ok(state.vault.lock().data()?.profiles.clone())
}

#[tauri::command]
fn upsert_profile(
    state: State<AppState>,
    id: Option<String>,
    input: ProfileInput,
) -> AppResult<Profile> {
    let mut v = state.vault.lock();
    let data = v.data_mut()?;
    let profile = if let Some(id) = id {
        let p = data
            .profiles
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::msg("Profile not found"))?;
        p.name = input.name;
        p.host = input.host;
        p.port = input.port;
        p.username = input.username;
        p.auth_method = input.auth_method;
        if input.password.is_some() {
            p.password = input.password;
        }
        p.private_key_path = input.private_key_path;
        p.group = input.group;
        p.tags = input.tags;
        p.post_connect_command = input.post_connect_command;
        p.remote_shell = input.remote_shell;
        p.keepalive_interval = input.keepalive_interval;
        p.keepalive_count_max = input.keepalive_count_max;
        p.notes = input.notes;
        p.clone()
    } else {
        let mut p = Profile::new(input.name, input.host, input.username);
        p.port = input.port;
        p.auth_method = input.auth_method;
        p.password = input.password;
        p.private_key_path = input.private_key_path;
        p.group = if input.group.is_empty() {
            "Default".into()
        } else {
            input.group
        };
        p.tags = input.tags;
        p.post_connect_command = input.post_connect_command;
        p.remote_shell = if input.remote_shell.trim().is_empty() {
            "bash".into()
        } else {
            input.remote_shell
        };
        p.keepalive_interval = input.keepalive_interval;
        p.keepalive_count_max = input.keepalive_count_max;
        p.notes = input.notes;
        data.profiles.push(p.clone());
        p
    };
    v.save()?;
    Ok(profile)
}

#[tauri::command]
fn delete_profile(state: State<AppState>, id: String) -> AppResult<()> {
    let mut v = state.vault.lock();
    let data = v.data_mut()?;
    data.profiles.retain(|p| p.id != id);
    v.save()
}

#[tauri::command]
fn duplicate_profile(state: State<AppState>, id: String) -> AppResult<Profile> {
    let mut v = state.vault.lock();
    let data = v.data_mut()?;
    let src = data
        .profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::msg("Profile not found"))?
        .clone();
    let mut copy = src;
    copy.id = Uuid::new_v4().to_string();
    copy.name = format!("{} (copy)", copy.name);
    data.profiles.push(copy.clone());
    v.save()?;
    Ok(copy)
}

#[tauri::command]
fn get_ssh_command(state: State<AppState>, id: String) -> AppResult<String> {
    let v = state.vault.lock();
    let p = find_profile(&v, &id)?;
    Ok(ssh_cmd::build_ssh_command_line(p))
}

#[tauri::command]
fn list_snippets(state: State<AppState>) -> AppResult<Vec<Snippet>> {
    Ok(state.vault.lock().data()?.snippets.clone())
}

#[tauri::command]
fn upsert_snippet(
    state: State<AppState>,
    id: Option<String>,
    name: String,
    command: String,
) -> AppResult<Snippet> {
    let mut v = state.vault.lock();
    let data = v.data_mut()?;
    let snip = if let Some(id) = id {
        let s = data
            .snippets
            .iter_mut()
            .find(|s| s.id == id)
            .ok_or_else(|| AppError::msg("Snippet not found"))?;
        s.name = name;
        s.command = command;
        s.clone()
    } else {
        let s = Snippet::new(name, command);
        data.snippets.push(s.clone());
        s
    };
    v.save()?;
    Ok(snip)
}

#[tauri::command]
fn delete_snippet(state: State<AppState>, id: String) -> AppResult<()> {
    let mut v = state.vault.lock();
    v.data_mut()?.snippets.retain(|s| s.id != id);
    v.save()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SessionCreated {
    session_id: String,
}

#[tauri::command]
fn pty_create(
    app: tauri::AppHandle,
    state: State<AppState>,
    cols: u16,
    rows: u16,
    profile_id: Option<String>,
) -> AppResult<SessionCreated> {
    let initial = if let Some(pid) = profile_id {
        let v = state.vault.lock();
        let p = find_profile(&v, &pid)?;
        Some(ssh_cmd::embed_connect_command(p))
    } else {
        None
    };
    let session_id = state.pty.create(app, cols, rows, initial)?;
    Ok(SessionCreated { session_id })
}

#[tauri::command]
fn pty_write(state: State<AppState>, session_id: String, data: String) -> AppResult<()> {
    state.pty.write(&session_id, &data)
}

#[tauri::command]
fn pty_resize(state: State<AppState>, session_id: String, cols: u16, rows: u16) -> AppResult<()> {
    state.pty.resize(&session_id, cols, rows)
}

#[tauri::command]
fn pty_kill(state: State<AppState>, session_id: String) -> AppResult<()> {
    state.pty.kill(&session_id)
}

#[tauri::command]
fn pty_inject(state: State<AppState>, session_id: String, command: String) -> AppResult<()> {
    let data = if command.ends_with('\n') || command.ends_with('\r') {
        command
    } else {
        format!("{command}\r")
    };
    state.pty.write(&session_id, &data)
}

#[tauri::command]
fn open_external_ssh(state: State<AppState>, profile_id: String) -> AppResult<()> {
    let v = state.vault.lock();
    let p = find_profile(&v, &profile_id)?;
    let cmd_line = ssh_cmd::build_ssh_command_line(p);

    if which::which("wt").is_ok() {
        if Command::new("wt")
            .args(["-w", "0", "nt", "powershell", "-NoExit", "-Command", &cmd_line])
            .spawn()
            .is_ok()
        {
            return Ok(());
        }
    }

    let shell = which::which("pwsh")
        .or_else(|_| which::which("powershell"))
        .map_err(|_| AppError::msg("PowerShell not found"))?;

    Command::new(shell)
        .args(["-NoExit", "-Command", &cmd_line])
        .spawn()
        .map_err(|e| AppError::msg(format!("Failed to open external shell: {e}")))?;
    Ok(())
}

#[tauri::command]
fn generate_profile_key(
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
async fn install_profile_key(state: State<'_, AppState>, profile_id: String) -> AppResult<()> {
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
    p.auth_method = profiles::AuthMethod::Key;
    v.save()?;
    Ok(())
}

#[tauri::command]
fn accept_host_key(host: String, port: u16, fingerprint: String) -> AppResult<()> {
    host_key::accept_host_key(&host, port, &fingerprint)
}

#[tauri::command]
fn probe_host_key(host: String, port: u16) -> AppResult<host_key::HostKeyInfo> {
    // Lightweight: report known status without connecting (fingerprint unknown until connect)
    Ok(host_key::probe_status(&host, port, "pending-first-connect"))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SftpOpened {
    sftp_id: String,
    cwd: String,
}

#[tauri::command]
async fn sftp_open(state: State<'_, AppState>, profile_id: String) -> AppResult<SftpOpened> {
    let profile = {
        let v = state.vault.lock();
        find_profile(&v, &profile_id)?.clone()
    };
    let (sftp_id, cwd) = state.sftp.open(&profile).await?;
    Ok(SftpOpened { sftp_id, cwd })
}

#[tauri::command]
async fn sftp_close(state: State<'_, AppState>, sftp_id: String) -> AppResult<()> {
    state.sftp.close(&sftp_id).await
}

#[tauri::command]
async fn sftp_list(
    state: State<'_, AppState>,
    sftp_id: String,
    path: Option<String>,
) -> AppResult<Vec<RemoteEntry>> {
    state.sftp.list(&sftp_id, path).await
}

#[tauri::command]
async fn sftp_cwd(state: State<'_, AppState>, sftp_id: String) -> AppResult<String> {
    state.sftp.cwd(&sftp_id).await
}

#[tauri::command]
async fn sftp_mkdir(state: State<'_, AppState>, sftp_id: String, path: String) -> AppResult<()> {
    state.sftp.mkdir(&sftp_id, &path).await
}

#[tauri::command]
async fn sftp_rename(
    state: State<'_, AppState>,
    sftp_id: String,
    from: String,
    to: String,
) -> AppResult<()> {
    state.sftp.rename(&sftp_id, &from, &to).await
}

#[tauri::command]
async fn sftp_remove(
    state: State<'_, AppState>,
    sftp_id: String,
    path: String,
    is_dir: bool,
) -> AppResult<()> {
    state.sftp.remove(&sftp_id, &path, is_dir).await
}

#[tauri::command]
async fn sftp_upload(
    state: State<'_, AppState>,
    sftp_id: String,
    local_path: String,
    remote_path: String,
) -> AppResult<()> {
    state.sftp.upload(&sftp_id, &local_path, &remote_path).await
}

#[tauri::command]
async fn sftp_upload_batch(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sftp_id: String,
    transfer_id: String,
    items: Vec<sftp::UploadItem>,
) -> AppResult<()> {
    state
        .sftp
        .upload_batch(&app, &sftp_id, &transfer_id, &items)
        .await
}

#[tauri::command]
async fn sftp_download(
    state: State<'_, AppState>,
    sftp_id: String,
    remote_path: String,
    local_path: String,
) -> AppResult<()> {
    state
        .sftp
        .download(&sftp_id, &remote_path, &local_path)
        .await
}

#[tauri::command]
async fn sftp_copy_remote(
    state: State<'_, AppState>,
    sftp_id: String,
    from: String,
    to: String,
) -> AppResult<()> {
    state.sftp.copy_remote(&sftp_id, &from, &to).await
}

#[tauri::command]
async fn sftp_read_text(
    state: State<'_, AppState>,
    sftp_id: String,
    remote_path: String,
) -> AppResult<String> {
    // ~1.5 MB soft limit for the lightweight in-app editor
    state.sftp.read_text(&sftp_id, &remote_path, 1_500_000).await
}

#[tauri::command]
async fn sftp_write_text(
    state: State<'_, AppState>,
    sftp_id: String,
    remote_path: String,
    content: String,
) -> AppResult<()> {
    state.sftp.write_text(&sftp_id, &remote_path, &content).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let vault = VaultState::new().expect("Failed to init vault");
    let state = AppState {
        vault: Mutex::new(vault),
        pty: Arc::new(PtyManager::new()),
        sftp: Arc::new(SftpManager::new()),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            vault_status,
            vault_unlock,
            vault_lock,
            vault_set_master_password,
            vault_change_master_password,
            vault_remove_master_password,
            list_profiles,
            upsert_profile,
            delete_profile,
            duplicate_profile,
            get_ssh_command,
            list_snippets,
            upsert_snippet,
            delete_snippet,
            pty_create,
            pty_write,
            pty_resize,
            pty_kill,
            pty_inject,
            open_external_ssh,
            generate_profile_key,
            install_profile_key,
            probe_host_key,
            accept_host_key,
            sftp_open,
            sftp_close,
            sftp_list,
            sftp_cwd,
            sftp_mkdir,
            sftp_rename,
            sftp_remove,
            sftp_upload,
            sftp_upload_batch,
            sftp_download,
            sftp_copy_remote,
            sftp_read_text,
            sftp_write_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
