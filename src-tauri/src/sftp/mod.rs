mod ops;
mod pathutil;
mod progress;
mod types;

use russh::client::Handle;
use russh_sftp::client::SftpSession;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::AppHandle;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session::{self, ClientHandler};

use ops::{
    collect_copy_plan, remote_tree_size, remove_dir_recursive, stream_copy_remote,
    write_local_to_remote,
};
use pathutil::{basename, is_self_or_descendant};
use progress::TransferProgressCtx;

pub use types::{CopyItem, RemoteEntry, RemoveItem, UploadItem};

struct SftpConn {
    _handle: Handle<ClientHandler>,
    /// Arc so list/ops can clone the handle and release the mutex across awaits.
    sftp: Arc<SftpSession>,
    cwd: String,
}

type SharedConn = Arc<Mutex<SftpConn>>;

pub struct SftpManager {
    sessions: Mutex<HashMap<String, SharedConn>>,
}

impl SftpManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    async fn conn(&self, id: &str) -> AppResult<SharedConn> {
        self.sessions
            .lock()
            .await
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::msg("SFTP session not found"))
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
            Arc::new(Mutex::new(SftpConn {
                _handle: handle,
                sftp: Arc::new(sftp),
                cwd: cwd.clone(),
            })),
        );
        Ok((id, cwd))
    }

    pub async fn close(&self, id: &str) -> AppResult<()> {
        self.sessions.lock().await.remove(id);
        Ok(())
    }

    pub async fn list(&self, id: &str, path: Option<String>) -> AppResult<Vec<RemoteEntry>> {
        let shared = self.conn(id).await?;
        // Clone Arc<SftpSession> and release the mutex before awaiting read_dir
        // so other ops cannot deadlock on this lock.
        let (sftp, path) = {
            let conn = shared.lock().await;
            let path = path.unwrap_or_else(|| conn.cwd.clone());
            (Arc::clone(&conn.sftp), path)
        };

        let entries = tokio::time::timeout(
            std::time::Duration::from_secs(45),
            sftp.read_dir(path.as_str()),
        )
        .await
        .map_err(|_| AppError::msg("readdir: timed out"))?
        .map_err(|e| AppError::msg(format!("readdir: {e}")))?;

        let mut out: Vec<RemoteEntry> = Vec::new();
        for entry in entries {
            let name = entry.file_name();
            if name.is_empty() {
                continue;
            }
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
        shared.lock().await.cwd = path;
        Ok(out)
    }

    pub async fn cwd(&self, id: &str) -> AppResult<String> {
        let shared = self.conn(id).await?;
        let cwd = shared.lock().await.cwd.clone();
        Ok(cwd)
    }

    pub async fn mkdir(&self, id: &str, path: &str) -> AppResult<()> {
        let shared = self.conn(id).await?;
        shared
            .lock()
            .await
            .sftp
            .create_dir(path)
            .await
            .map_err(|e| AppError::msg(format!("mkdir: {e}")))?;
        Ok(())
    }

    pub async fn rename(&self, id: &str, from: &str, to: &str) -> AppResult<()> {
        let shared = self.conn(id).await?;
        shared
            .lock()
            .await
            .sftp
            .rename(from, to)
            .await
            .map_err(|e| AppError::msg(format!("rename: {e}")))?;
        Ok(())
    }

    pub async fn remove(&self, id: &str, path: &str, is_dir: bool) -> AppResult<()> {
        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
        if is_dir {
            remove_dir_recursive(&conn.sftp, path, None, &mut 0).await?;
        } else {
            conn.sftp
                .remove_file(path)
                .await
                .map_err(|e| AppError::msg(format!("unlink: {e}")))?;
        }
        Ok(())
    }

    pub async fn remove_batch(
        &self,
        app: &AppHandle,
        id: &str,
        transfer_id: &str,
        items: &[RemoveItem],
    ) -> AppResult<()> {
        if items.is_empty() {
            return Ok(());
        }

        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
        let sftp = &conn.sftp;

        let mut planned: Vec<(String, bool, String, u64)> = Vec::new();
        for item in items {
            let path = item.path.trim_end_matches('/').to_string();
            let name = basename(&path).to_string();
            let size = remote_tree_size(sftp, &path).await?.max(1);
            planned.push((path, item.is_dir, name, size));
        }

        let overall_total: u64 = planned.iter().map(|p| p.3).sum();
        let file_count = planned.len() as u32;
        let mut overall_base = 0u64;

        for (i, (path, is_dir, name, size)) in planned.iter().enumerate() {
            let progress = TransferProgressCtx::new(
                app,
                transfer_id,
                id,
                name.clone(),
                i as u32,
                file_count,
                *size,
                overall_total,
                overall_base,
            );
            progress.emit(0);
            if *is_dir {
                let mut deleted = 0u64;
                remove_dir_recursive(sftp, path, Some(&progress), &mut deleted).await?;
            } else {
                sftp.remove_file(path.as_str())
                    .await
                    .map_err(|e| AppError::msg(format!("unlink: {e}")))?;
            }
            progress.finish();
            overall_base += size;
        }

        Ok(())
    }

    pub async fn upload(&self, id: &str, local_path: &str, remote_path: &str) -> AppResult<()> {
        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
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

        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
        let file_count = items.len() as u32;
        let mut overall_base = 0u64;

        for (i, item) in items.iter().enumerate() {
            let file_name = Path::new(&item.local_path)
                .file_name()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_else(|| item.remote_path.clone());
            let bytes_total = sizes[i];
            let progress = TransferProgressCtx::new(
                app,
                transfer_id,
                id,
                file_name,
                i as u32,
                file_count,
                bytes_total,
                overall_total,
                overall_base,
            );
            progress.emit(0);
            write_local_to_remote(
                &conn.sftp,
                &item.local_path,
                &item.remote_path,
                Some(&progress),
            )
            .await?;
            progress.finish();
            overall_base += bytes_total;
        }

        Ok(())
    }

    pub async fn download(&self, id: &str, remote_path: &str, local_path: &str) -> AppResult<()> {
        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
        let mut remote = conn
            .sftp
            .open(remote_path)
            .await
            .map_err(|e| AppError::msg(format!("open remote: {e}")))?;
        let mut data = Vec::new();
        tokio::io::AsyncReadExt::read_to_end(&mut remote, &mut data)
            .await
            .map_err(|e| AppError::msg(format!("read remote: {e}")))?;
        drop(conn);

        if let Some(parent) = PathBuf::from(local_path).parent() {
            tokio::fs::create_dir_all(parent).await.ok();
        }
        tokio::fs::write(local_path, data)
            .await
            .map_err(|e| AppError::msg(format!("write local: {e}")))?;
        Ok(())
    }

    pub async fn copy_remote(&self, id: &str, from: &str, to: &str) -> AppResult<()> {
        self.copy_batch(
            None,
            id,
            "",
            &[CopyItem {
                from: from.to_string(),
                to: to.to_string(),
            }],
        )
        .await
    }

    pub async fn copy_batch(
        &self,
        app: Option<&AppHandle>,
        id: &str,
        transfer_id: &str,
        items: &[CopyItem],
    ) -> AppResult<()> {
        if items.is_empty() {
            return Ok(());
        }

        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
        let sftp = &conn.sftp;

        let mut dirs: Vec<String> = Vec::new();
        let mut files: Vec<(String, String, String, u64)> = Vec::new();
        for item in items {
            let from = item.from.trim_end_matches('/').to_string();
            let to = item.to.trim_end_matches('/').to_string();
            if is_self_or_descendant(&from, &to) {
                return Err(AppError::msg("Cannot copy a folder into itself"));
            }
            collect_copy_plan(sftp, &from, &to, &mut dirs, &mut files).await?;
        }

        for dir in &dirs {
            sftp.create_dir(dir.as_str())
                .await
                .map_err(|e| AppError::msg(format!("mkdir {dir}: {e}")))?;
        }

        if files.is_empty() {
            return Ok(());
        }

        let overall_total: u64 = files.iter().map(|f| f.3).sum();
        let file_count = files.len() as u32;
        let mut overall_base = 0u64;

        for (i, (from, to, name, size)) in files.iter().enumerate() {
            let progress = app.map(|app| {
                TransferProgressCtx::new(
                    app,
                    transfer_id,
                    id,
                    name.clone(),
                    i as u32,
                    file_count,
                    *size,
                    overall_total,
                    overall_base,
                )
            });
            if let Some(ctx) = &progress {
                ctx.emit(0);
            }
            stream_copy_remote(sftp, from, to, progress.as_ref()).await?;
            if let Some(ctx) = &progress {
                ctx.finish();
            }
            overall_base += size;
        }

        Ok(())
    }

    pub async fn move_batch(
        &self,
        app: &AppHandle,
        id: &str,
        transfer_id: &str,
        items: &[CopyItem],
    ) -> AppResult<()> {
        if items.is_empty() {
            return Ok(());
        }

        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
        let sftp = &conn.sftp;

        let mut planned: Vec<(String, String, String, u64)> = Vec::new();
        for item in items {
            let from = item.from.trim_end_matches('/').to_string();
            let to = item.to.trim_end_matches('/').to_string();
            if is_self_or_descendant(&from, &to) {
                return Err(AppError::msg("Cannot move a folder into itself"));
            }
            let name = basename(&from).to_string();
            let size = remote_tree_size(sftp, &from).await?.max(1);
            planned.push((from, to, name, size));
        }

        let overall_total: u64 = planned.iter().map(|p| p.3).sum();
        let file_count = planned.len() as u32;
        let mut overall_base = 0u64;

        for (i, (from, to, name, size)) in planned.iter().enumerate() {
            let progress = TransferProgressCtx::new(
                app,
                transfer_id,
                id,
                name.clone(),
                i as u32,
                file_count,
                *size,
                overall_total,
                overall_base,
            );
            progress.emit(0);
            sftp.rename(from, to)
                .await
                .map_err(|e| AppError::msg(format!("move {from}: {e}")))?;
            progress.finish();
            overall_base += size;
        }

        Ok(())
    }

    pub async fn read_text(
        &self,
        id: &str,
        remote_path: &str,
        max_bytes: usize,
    ) -> AppResult<String> {
        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
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
            return Err(AppError::msg(
                "Looks like a binary file — use Download instead",
            ));
        }
        Ok(String::from_utf8_lossy(&bytes).to_string())
    }

    pub async fn write_text(&self, id: &str, remote_path: &str, content: &str) -> AppResult<()> {
        let shared = self.conn(id).await?;
        let conn = shared.lock().await;
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

pub type SharedSftp = Arc<SftpManager>;
