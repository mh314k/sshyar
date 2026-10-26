use russh_sftp::client::SftpSession;
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
