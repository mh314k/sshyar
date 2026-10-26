use serde::Serialize;
use tauri::State;

use crate::error::AppResult;
use crate::sftp::{CopyItem, RemoteEntry, RemoveItem, UploadItem};
use crate::state::{find_profile, AppState};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SftpOpened {
    pub sftp_id: String,
    pub cwd: String,
}

#[tauri::command]
pub async fn sftp_open(state: State<'_, AppState>, profile_id: String) -> AppResult<SftpOpened> {
    let profile = {
        let v = state.vault.lock();
        find_profile(&v, &profile_id)?.clone()
    };
    let (sftp_id, cwd) = state.sftp.open(&profile).await?;
    Ok(SftpOpened { sftp_id, cwd })
}

#[tauri::command]
pub async fn sftp_close(state: State<'_, AppState>, sftp_id: String) -> AppResult<()> {
    state.sftp.close(&sftp_id).await
}

#[tauri::command]
pub async fn sftp_list(
    state: State<'_, AppState>,
    sftp_id: String,
    path: Option<String>,
) -> AppResult<Vec<RemoteEntry>> {
    state.sftp.list(&sftp_id, path).await
}

#[tauri::command]
pub async fn sftp_cwd(state: State<'_, AppState>, sftp_id: String) -> AppResult<String> {
    state.sftp.cwd(&sftp_id).await
}

#[tauri::command]
pub async fn sftp_mkdir(state: State<'_, AppState>, sftp_id: String, path: String) -> AppResult<()> {
    state.sftp.mkdir(&sftp_id, &path).await
}

#[tauri::command]
pub async fn sftp_rename(
    state: State<'_, AppState>,
    sftp_id: String,
    from: String,
    to: String,
) -> AppResult<()> {
    state.sftp.rename(&sftp_id, &from, &to).await
}

#[tauri::command]
pub async fn sftp_remove(
    state: State<'_, AppState>,
    sftp_id: String,
    path: String,
    is_dir: bool,
) -> AppResult<()> {
    state.sftp.remove(&sftp_id, &path, is_dir).await
}

#[tauri::command]
pub async fn sftp_remove_batch(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sftp_id: String,
    transfer_id: String,
    items: Vec<RemoveItem>,
) -> AppResult<()> {
    state
        .sftp
        .remove_batch(&app, &sftp_id, &transfer_id, &items)
        .await
}

#[tauri::command]
pub async fn sftp_upload(
    state: State<'_, AppState>,
    sftp_id: String,
    local_path: String,
    remote_path: String,
) -> AppResult<()> {
    state.sftp.upload(&sftp_id, &local_path, &remote_path).await
}

#[tauri::command]
pub async fn sftp_upload_batch(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sftp_id: String,
    transfer_id: String,
    items: Vec<UploadItem>,
) -> AppResult<()> {
    state
        .sftp
        .upload_batch(&app, &sftp_id, &transfer_id, &items)
        .await
}

#[tauri::command]
pub async fn sftp_download(
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
pub async fn sftp_copy_remote(
    state: State<'_, AppState>,
    sftp_id: String,
    from: String,
    to: String,
) -> AppResult<()> {
    state.sftp.copy_remote(&sftp_id, &from, &to).await
}

#[tauri::command]
pub async fn sftp_copy_batch(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sftp_id: String,
    transfer_id: String,
    items: Vec<CopyItem>,
) -> AppResult<()> {
    state
        .sftp
        .copy_batch(Some(&app), &sftp_id, &transfer_id, &items)
        .await
}

#[tauri::command]
pub async fn sftp_move_batch(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    sftp_id: String,
    transfer_id: String,
    items: Vec<CopyItem>,
) -> AppResult<()> {
    state
        .sftp
        .move_batch(&app, &sftp_id, &transfer_id, &items)
        .await
}

#[tauri::command]
pub async fn sftp_read_text(
    state: State<'_, AppState>,
    sftp_id: String,
    remote_path: String,
) -> AppResult<String> {
    state.sftp.read_text(&sftp_id, &remote_path, 1_500_000).await
}

#[tauri::command]
pub async fn sftp_write_text(
    state: State<'_, AppState>,
    sftp_id: String,
    remote_path: String,
    content: String,
) -> AppResult<()> {
    state.sftp.write_text(&sftp_id, &remote_path, &content).await
}
