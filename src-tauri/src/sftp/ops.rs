use russh_sftp::client::SftpSession;
use std::path::Path;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

use crate::error::{AppError, AppResult};

use super::pathutil;
use super::progress::TransferProgressCtx;

pub const TRANSFER_CHUNK: usize = 256 * 1024;
const PROGRESS_EMIT_EVERY: u64 = 512 * 1024;

pub async fn remote_tree_size(sftp: &SftpSession, path: &str) -> AppResult<u64> {
    let meta = sftp
        .metadata(path)
        .await
        .map_err(|e| AppError::msg(format!("stat {path}: {e}")))?;
    if !meta.file_type().is_dir() {
        return Ok(meta.size.unwrap_or(0));
    }
    let entries = sftp
        .read_dir(path)
        .await
        .map_err(|e| AppError::msg(format!("readdir {path}: {e}")))?;
    let mut total = 0u64;
    for entry in entries {
        let name = entry.file_name();
        if name == "." || name == ".." {
            continue;
        }
        let child = pathutil::join(path, &name);
        if entry.metadata().file_type().is_dir() {
            total += Box::pin(remote_tree_size(sftp, &child)).await?;
        } else {
            total += entry.metadata().size.unwrap_or(0);
        }
    }
    Ok(total)
}

/// Collect dirs to create and files to copy: `(from, to, name, size)`.
pub async fn collect_copy_plan(
    sftp: &SftpSession,
    from: &str,
    to: &str,
    dirs: &mut Vec<String>,
    files: &mut Vec<(String, String, String, u64)>,
) -> AppResult<()> {
    let meta = sftp
        .metadata(from)
        .await
        .map_err(|e| AppError::msg(format!("stat {from}: {e}")))?;
    if meta.file_type().is_dir() {
        dirs.push(to.to_string());
        let entries = sftp
            .read_dir(from)
            .await
            .map_err(|e| AppError::msg(format!("readdir {from}: {e}")))?;
        for entry in entries {
            let name = entry.file_name();
            if name == "." || name == ".." {
                continue;
            }
            let child_from = pathutil::join(from, &name);
            let child_to = format!("{to}/{name}");
            if entry.metadata().file_type().is_dir() {
                Box::pin(collect_copy_plan(
                    sftp,
                    &child_from,
                    &child_to,
                    dirs,
                    files,
                ))
                .await?;
            } else {
                let size = entry.metadata().size.unwrap_or(0);
                files.push((child_from, child_to, name, size));
            }
        }
    } else {
        let name = pathutil::basename(from).to_string();
        files.push((
            from.to_string(),
            to.to_string(),
            name,
            meta.size.unwrap_or(0),
        ));
    }
    Ok(())
}

pub async fn stream_copy_remote(
    sftp: &SftpSession,
    from: &str,
    to: &str,
    progress: Option<&TransferProgressCtx>,
) -> AppResult<()> {
    let mut src = sftp
        .open(from)
        .await
        .map_err(|e| AppError::msg(format!("open {from}: {e}")))?;
    let mut dst = sftp
        .create(to)
        .await
        .map_err(|e| AppError::msg(format!("create {to}: {e}")))?;

    let mut buf = vec![0u8; TRANSFER_CHUNK];
    let mut sent = 0u64;
    let mut last_emit = 0u64;
    loop {
        let n = src
            .read(&mut buf)
            .await
            .map_err(|e| AppError::msg(format!("read {from}: {e}")))?;
        if n == 0 {
            break;
        }
        dst.write_all(&buf[..n])
            .await
            .map_err(|e| AppError::msg(format!("write {to}: {e}")))?;
        sent += n as u64;
        maybe_emit(progress, sent, n as u64, &mut last_emit);
    }
    if let Some(ctx) = progress {
        ctx.emit(sent);
    }
    let _ = dst.shutdown().await;
    Ok(())
}

pub async fn write_local_to_remote(
    sftp: &SftpSession,
    local_path: &str,
    remote_path: &str,
    progress: Option<&TransferProgressCtx>,
) -> AppResult<()> {
    let mut local = tokio::fs::File::open(local_path)
        .await
        .map_err(|e| AppError::msg(format!("read local: {e}")))?;
    let mut remote = sftp
        .create(remote_path)
        .await
        .map_err(|e| AppError::msg(format!("create remote: {e}")))?;

    let mut buf = vec![0u8; TRANSFER_CHUNK];
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
        maybe_emit(progress, sent, n as u64, &mut last_emit);
    }
    if let Some(ctx) = progress {
        ctx.emit(sent);
    }
    let _ = remote.shutdown().await;
    Ok(())
}

/// Create a remote directory; OK if it already exists as a directory.
pub async fn ensure_remote_dir(sftp: &SftpSession, path: &str) -> AppResult<()> {
    let path = path.trim_end_matches('/');
    if path.is_empty() || path == "/" {
        return Ok(());
    }
    match sftp.create_dir(path).await {
        Ok(()) => Ok(()),
        Err(_) => {
            let meta = sftp
                .metadata(path)
                .await
                .map_err(|e| AppError::msg(format!("mkdir {path}: {e}")))?;
            if meta.file_type().is_dir() {
                Ok(())
            } else {
                Err(AppError::msg(format!(
                    "{path} exists and is not a directory"
                )))
            }
        }
    }
}

/// Ensure every ancestor of a remote file path exists (`/a/b/c.txt` → `/a`, `/a/b`).
pub async fn ensure_remote_ancestors(sftp: &SftpSession, remote_file: &str) -> AppResult<()> {
    let remote_file = remote_file.trim_end_matches('/');
    let Some((parent, _)) = remote_file.rsplit_once('/') else {
        return Ok(());
    };
    if parent.is_empty() {
        return Ok(());
    }
    let mut built = String::new();
    for seg in parent.split('/').filter(|s| !s.is_empty()) {
        if built.is_empty() {
            // Absolute remote paths start with /
            if remote_file.starts_with('/') {
                built.push('/');
            }
            built.push_str(seg);
        } else {
            built.push('/');
            built.push_str(seg);
        }
        ensure_remote_dir(sftp, &built).await?;
    }
    Ok(())
}

/// Recursively plan a local → remote upload: dirs to create, then files
/// `(local_path, remote_path, display_name, size)`.
pub async fn collect_upload_plan(
    local_path: &Path,
    remote_path: &str,
    name_root: &Path,
    dirs: &mut Vec<String>,
    files: &mut Vec<(String, String, String, u64)>,
) -> AppResult<()> {
    let meta = tokio::fs::metadata(local_path)
        .await
        .map_err(|e| AppError::msg(format!("stat {}: {e}", local_path.display())))?;

    if meta.is_dir() {
        let remote = remote_path.trim_end_matches('/').to_string();
        dirs.push(remote.clone());
        let mut rd = tokio::fs::read_dir(local_path)
            .await
            .map_err(|e| AppError::msg(format!("readdir {}: {e}", local_path.display())))?;
        while let Some(entry) = rd
            .next_entry()
            .await
            .map_err(|e| AppError::msg(format!("readdir {}: {e}", local_path.display())))?
        {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if name == "." || name == ".." {
                continue;
            }
            let child_local = entry.path();
            let child_remote = pathutil::join(&remote, name.as_ref());
            Box::pin(collect_upload_plan(
                &child_local,
                &child_remote,
                name_root,
                dirs,
                files,
            ))
            .await?;
        }
        return Ok(());
    }

    if meta.is_file() {
        let display = upload_display_name(name_root, local_path);
        files.push((
            local_path.to_string_lossy().into_owned(),
            remote_path.to_string(),
            display,
            meta.len(),
        ));
        return Ok(());
    }

    // Skip sockets, devices, etc.
    Ok(())
}

fn upload_display_name(root: &Path, file: &Path) -> String {
    if let Ok(rel) = file.strip_prefix(root) {
        let s = rel.to_string_lossy().replace('\\', "/");
        if !s.is_empty() {
            return s;
        }
    }
    file.file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| file.to_string_lossy().into_owned())
}

#[cfg(test)]
mod upload_plan_tests {
    use super::*;
    use std::fs;

    #[tokio::test]
    async fn collect_upload_plan_includes_nested_files_and_dirs() {
        let root = std::env::temp_dir().join(format!(
            "sshyar-upload-plan-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("sub").join("deep")).unwrap();
        fs::write(root.join("a.txt"), b"a").unwrap();
        fs::write(root.join("sub").join("b.txt"), b"bb").unwrap();
        fs::write(root.join("sub").join("deep").join("c.txt"), b"ccc").unwrap();

        let mut dirs = Vec::new();
        let mut files = Vec::new();
        collect_upload_plan(&root, "/remote/proj", &root, &mut dirs, &mut files)
            .await
            .unwrap();

        assert!(dirs.iter().any(|d| d == "/remote/proj"));
        assert!(dirs.iter().any(|d| d == "/remote/proj/sub"));
        assert!(dirs.iter().any(|d| d == "/remote/proj/sub/deep"));
        assert_eq!(files.len(), 3);
        assert!(files.iter().any(|(_, remote, name, _)| {
            remote == "/remote/proj/sub/deep/c.txt" && name == "sub/deep/c.txt"
        }));

        let _ = fs::remove_dir_all(&root);
    }
}

pub async fn remove_dir_recursive(
    sftp: &SftpSession,
    path: &str,
    progress: Option<&TransferProgressCtx>,
    deleted: &mut u64,
) -> AppResult<()> {
    let entries = sftp
        .read_dir(path)
        .await
        .map_err(|e| AppError::msg(format!("readdir: {e}")))?;
    for entry in entries {
        let name = entry.file_name();
        if name == "." || name == ".." {
            continue;
        }
        let child = pathutil::join(path, &name);
        if entry.metadata().file_type().is_dir() {
            Box::pin(remove_dir_recursive(sftp, &child, progress, deleted)).await?;
        } else {
            let file_size = entry.metadata().size.unwrap_or(0);
            sftp.remove_file(child.as_str())
                .await
                .map_err(|e| AppError::msg(format!("unlink: {e}")))?;
            if let Some(ctx) = progress {
                *deleted = deleted.saturating_add(file_size);
                ctx.emit(*deleted);
            }
        }
    }
    sftp.remove_dir(path)
        .await
        .map_err(|e| AppError::msg(format!("rmdir: {e}")))?;
    Ok(())
}

fn maybe_emit(
    progress: Option<&TransferProgressCtx>,
    sent: u64,
    chunk: u64,
    last_emit: &mut u64,
) {
    if let Some(ctx) = progress {
        if sent == chunk || sent - *last_emit >= PROGRESS_EMIT_EVERY {
            ctx.emit(sent);
            *last_emit = sent;
        }
    }
}
