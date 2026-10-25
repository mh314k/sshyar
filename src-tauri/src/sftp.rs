use russh::client::Handle;
use russh_sftp::client::SftpSession;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session::{self, ClientHandler};

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
        let data = tokio::fs::read(local_path)
            .await
            .map_err(|e| AppError::msg(format!("read local: {e}")))?;
        let mut remote = conn
            .sftp
            .create(remote_path)
            .await
            .map_err(|e| AppError::msg(format!("create remote: {e}")))?;
        remote
            .write_all(&data)
            .await
            .map_err(|e| AppError::msg(format!("write remote: {e}")))?;
        let _ = remote.shutdown().await;
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
