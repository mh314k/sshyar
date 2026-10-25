use russh::client::Handle;
use russh_sftp::client::SftpSession;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session::{self, ClientHandler};

const UPLOAD_CHUNK: usize = 256 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadItem {
    pub local_path: String,
    pub remote_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferProgressEvent {
    pub transfer_id: String,
    pub sftp_id: String,
    pub file_name: String,
    pub file_index: u32,
    pub file_count: u32,
    pub bytes_sent: u64,
    pub bytes_total: u64,
    pub overall_sent: u64,
    pub overall_total: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub mtime: Option<u64>,
}

struct SftpConn {
    _handle: Handle<ClientHandler>,
    sftp: SftpSession,
    cwd: String,
}

pub struct SftpManager {
    sessions: Mutex<HashMap<String, SftpConn>>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn open(&self, profile: &Profile) -> AppResult<(String, String)> {
        let (handle, sftp) = ssh_session::open_sftp(profile).await?;
        let cwd = sftp
            .canonicalize(".")
            .await
            .map_err(|e| AppError::msg(format!("cwd: {e}")))?;
        let id = Uuid::new_v4().to_string();
        self.sessions.lock().await.insert(
            id.clone(),
            SftpConn {
                _handle: handle,
                sftp,
                cwd: cwd.clone(),
            },
        );
        Ok((id, cwd))
    }

    pub async fn close(&self, id: &str) -> AppResult<()> {
        self.sessions.lock().await.remove(id);
        Ok(())
    }

    pub async fn list(&self, id: &str, path: Option<String>) -> AppResult<Vec<RemoteEntry>> {
        let mut sessions = self.sessions.lock().await;
        let conn = sessions
            .get_mut(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        let path = path.unwrap_or_else(|| conn.cwd.clone());
        let entries = conn
            .sftp
            .read_dir(path.as_str())
            .await
            .map_err(|e| AppError::msg(format!("readdir: {e}")))?;

        let mut out: Vec<RemoteEntry> = Vec::new();
        for entry in entries {
            let name = entry.file_name();
            let meta = entry.metadata();
            let is_dir = meta.file_type().is_dir();
            let full = entry.path();
            out.push(RemoteEntry {
                name,
                path: full,
                is_dir,
                size: meta.size.unwrap_or(0),
                mtime: meta.mtime.map(|t| t as u64),
            });
        }

        out.sort_by(|a, b| match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });
        conn.cwd = path;
        Ok(out)
    }

    pub async fn cwd(&self, id: &str) -> AppResult<String> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        Ok(conn.cwd.clone())
    }

    pub async fn mkdir(&self, id: &str, path: &str) -> AppResult<()> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        conn.sftp
            .create_dir(path)
            .await
            .map_err(|e| AppError::msg(format!("mkdir: {e}")))?;
        Ok(())
    }

    pub async fn rename(&self, id: &str, from: &str, to: &str) -> AppResult<()> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        conn.sftp
            .rename(from, to)
            .await
            .map_err(|e| AppError::msg(format!("rename: {e}")))?;
        Ok(())
    }

    pub async fn remove(&self, id: &str, path: &str, is_dir: bool) -> AppResult<()> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        if is_dir {
            remove_dir_recursive(&conn.sftp, path).await?;
        } else {
            conn.sftp
                .remove_file(path)
                .await
                .map_err(|e| AppError::msg(format!("unlink: {e}")))?;
        }
        Ok(())
    }

    pub async fn upload(&self, id: &str, local_path: &str, remote_path: &str) -> AppResult<()> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        write_local_to_remote(&conn.sftp, local_path, remote_path, None).await
    }

    pub async fn upload_batch(
        &self,
        app: &AppHandle,
        id: &str,
        transfer_id: &str,
        items: &[UploadItem],
    ) -> AppResult<()> {
        if items.is_empty() {
            return Ok(());
        }

        let mut sizes = Vec::with_capacity(items.len());
        let mut overall_total = 0u64;
        for item in items {
            let meta = tokio::fs::metadata(&item.local_path)
                .await
                .map_err(|e| AppError::msg(format!("stat local: {e}")))?;
            let len = meta.len();
            sizes.push(len);
            overall_total += len;
        }

        let file_count = items.len() as u32;
        let mut overall_sent = 0u64;

        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;

        for (i, item) in items.iter().enumerate() {
            let file_name = Path::new(&item.local_path)
                .file_name()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_else(|| item.remote_path.clone());
            let bytes_total = sizes[i];
            let file_index = i as u32;
            let file_overall_base = overall_sent;

            let progress = UploadProgressCtx {
                app: app.clone(),
                transfer_id: transfer_id.to_string(),
                sftp_id: id.to_string(),
                file_name: file_name.clone(),
                file_index,
                file_count,
                bytes_total,
                overall_total,
                overall_base: file_overall_base,
            };
            progress.emit(0);

            write_local_to_remote(&conn.sftp, &item.local_path, &item.remote_path, Some(&progress))
                .await?;

            overall_sent = file_overall_base + bytes_total;
            progress.emit(bytes_total);
        }

        Ok(())
    }

    pub async fn download(&self, id: &str, remote_path: &str, local_path: &str) -> AppResult<()> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        let mut remote = conn
            .sftp
            .open(remote_path)
            .await
            .map_err(|e| AppError::msg(format!("open remote: {e}")))?;
        let mut data = Vec::new();
        remote
            .read_to_end(&mut data)
            .await
            .map_err(|e| AppError::msg(format!("read remote: {e}")))?;
        if let Some(parent) = PathBuf::from(local_path).parent() {
            tokio::fs::create_dir_all(parent).await.ok();
        }
        tokio::fs::write(local_path, data)
            .await
            .map_err(|e| AppError::msg(format!("write local: {e}")))?;
        Ok(())
    }

    pub async fn copy_remote(&self, id: &str, from: &str, to: &str) -> AppResult<()> {
        let tmp = std::env::temp_dir().join(format!("sshyar-copy-{}", Uuid::new_v4()));
        let tmp_str = tmp.to_string_lossy().to_string();
        self.download(id, from, &tmp_str).await?;
        let result = self.upload(id, &tmp_str, to).await;
        let _ = tokio::fs::remove_file(&tmp).await;
        result
    }

    pub async fn read_text(&self, id: &str, remote_path: &str, max_bytes: usize) -> AppResult<String> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        let meta = conn
            .sftp
            .metadata(remote_path)
            .await
            .map_err(|e| AppError::msg(format!("stat: {e}")))?;
        let size = meta.size.unwrap_or(0) as usize;
        if size > max_bytes {
            return Err(AppError::msg(format!(
                "File too large for in-app editor ({} bytes, max {max_bytes})",
                size
            )));
        }
        let bytes = conn
            .sftp
            .read(remote_path)
            .await
            .map_err(|e| AppError::msg(format!("read: {e}")))?;
        if bytes.iter().filter(|&&b| b == 0).count() > 8 {
            return Err(AppError::msg("Looks like a binary file — use Download instead"));
        }
        Ok(String::from_utf8_lossy(&bytes).to_string())
    }

    pub async fn write_text(&self, id: &str, remote_path: &str, content: &str) -> AppResult<()> {
        let sessions = self.sessions.lock().await;
        let conn = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("SFTP session not found"))?;
        let mut remote = conn
            .sftp
            .create(remote_path)
            .await
            .map_err(|e| AppError::msg(format!("create remote: {e}")))?;
        remote
            .write_all(content.as_bytes())
            .await
            .map_err(|e| AppError::msg(format!("write remote: {e}")))?;
        let _ = remote.shutdown().await;
        Ok(())
    }
}

struct UploadProgressCtx {
    app: AppHandle,
    transfer_id: String,
    sftp_id: String,
    file_name: String,
    file_index: u32,
    file_count: u32,
    bytes_total: u64,
    overall_total: u64,
    overall_base: u64,
}

impl UploadProgressCtx {
    fn emit(&self, bytes_sent: u64) {
        let _ = self.app.emit(
            "sftp-transfer-progress",
            TransferProgressEvent {
                transfer_id: self.transfer_id.clone(),
                sftp_id: self.sftp_id.clone(),
                file_name: self.file_name.clone(),
                file_index: self.file_index,
                file_count: self.file_count,
                bytes_sent,
                bytes_total: self.bytes_total,
                overall_sent: self.overall_base + bytes_sent,
                overall_total: self.overall_total,
            },
        );
    }
}

async fn write_local_to_remote(
    sftp: &SftpSession,
    local_path: &str,
    remote_path: &str,
    progress: Option<&UploadProgressCtx>,
) -> AppResult<()> {
    let mut local = tokio::fs::File::open(local_path)
        .await
        .map_err(|e| AppError::msg(format!("read local: {e}")))?;
    let mut remote = sftp
        .create(remote_path)
        .await
        .map_err(|e| AppError::msg(format!("create remote: {e}")))?;

    let mut buf = vec![0u8; UPLOAD_CHUNK];
    let mut sent = 0u64;
    let mut last_emit = 0u64;
    loop {
        let n = local
            .read(&mut buf)
            .await
            .map_err(|e| AppError::msg(format!("read local: {e}")))?;
        if n == 0 {
            break;
        }
        remote
            .write_all(&buf[..n])
            .await
            .map_err(|e| AppError::msg(format!("write remote: {e}")))?;
        sent += n as u64;
        // Throttle UI events a bit (every ~512 KiB) while still updating regularly.
        if let Some(ctx) = progress {
            if sent == n as u64 || sent - last_emit >= 512 * 1024 {
                ctx.emit(sent);
                last_emit = sent;
            }
        }
    }
    if let Some(ctx) = progress {
        ctx.emit(sent);
    }
    let _ = remote.shutdown().await;
    Ok(())
}

async fn remove_dir_recursive(sftp: &SftpSession, path: &str) -> AppResult<()> {
    let entries = sftp
        .read_dir(path)
        .await
        .map_err(|e| AppError::msg(format!("readdir: {e}")))?;
    for entry in entries {
        let name = entry.file_name();
        if name == "." || name == ".." {
            continue;
        }
        let child = if path.ends_with('/') {
            format!("{path}{name}")
        } else {
            format!("{path}/{name}")
        };
        if entry.metadata().file_type().is_dir() {
            Box::pin(remove_dir_recursive(sftp, &child)).await?;
        } else {
            sftp.remove_file(child.as_str())
                .await
                .map_err(|e| AppError::msg(format!("unlink: {e}")))?;
        }
    }
    sftp.remove_dir(path)
        .await
        .map_err(|e| AppError::msg(format!("rmdir: {e}")))?;
    Ok(())
}

pub type SharedSftp = Arc<SftpManager>;
