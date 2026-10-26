use async_trait::async_trait;
use russh::client::{self, Handle};
use russh::keys::key::PrivateKeyWithHashAlg;
use russh::keys::{load_secret_key, HashAlg, PublicKey};
use russh::{ChannelMsg, Disconnect};
use russh_sftp::client::SftpSession;
use std::path::Path;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;

use crate::error::{AppError, AppResult};
use crate::host_key::{self, fingerprint_sha256};
use crate::profiles::{AuthMethod, Profile};

pub struct ClientHandler {
    pub host: String,
    pub port: u16,
}

#[async_trait]
impl client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &PublicKey,
    ) -> Result<bool, Self::Error> {
        let fp = match server_public_key.to_bytes() {
            Ok(blob) => fingerprint_sha256(&blob),
            Err(_) => format!("{}", server_public_key.fingerprint(HashAlg::Sha256)),
        };
        match host_key::check_fingerprint(&self.host, self.port, &fp) {
            Ok(()) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}

pub async fn connect_handle(profile: &Profile) -> AppResult<Handle<ClientHandler>> {
    let config = Arc::new(client::Config {
        inactivity_timeout: Some(std::time::Duration::from_secs(3600)),
        ..Default::default()
    });
    let handler = ClientHandler {
        host: profile.host.clone(),
        port: profile.port,
    };
    let mut handle = client::connect(config, (profile.host.as_str(), profile.port), handler)
        .await
        .map_err(|e| AppError::msg(format!("SSH connect failed: {e}")))?;

    let authenticated = match profile.auth_method {
        AuthMethod::Password => {
            let password = profile
                .password
                .as_deref()
                .filter(|p| !p.is_empty())
                .ok_or_else(|| AppError::msg("Password required"))?;
            handle
                .authenticate_password(profile.username.as_str(), password)
                .await
                .map_err(|e| AppError::msg(format!("Auth failed: {e}")))?
        }
        AuthMethod::Key => {
            let key_path = profile
                .private_key_path
                .as_deref()
                .ok_or_else(|| AppError::msg("Private key path required"))?;
            let key = load_secret_key(Path::new(key_path), None)
                .map_err(|e| AppError::msg(format!("Load key failed: {e}")))?;
            let wrapped = PrivateKeyWithHashAlg::new(Arc::new(key), None)
                .map_err(|e| AppError::msg(format!("Key wrap failed: {e}")))?;
            let key_auth = handle
                .authenticate_publickey(profile.username.as_str(), wrapped)
                .await;
            match key_auth {
                Ok(true) => true,
                _ => {
                    if let Some(password) = profile.password.as_deref().filter(|p| !p.is_empty()) {
                        handle
                            .authenticate_password(profile.username.as_str(), password)
                            .await
                            .map_err(|e| AppError::msg(format!("Auth failed: {e}")))?
                    } else {
                        return Err(AppError::msg("Key authentication failed"));
                    }
                }
            }
        }
    };

    if !authenticated {
        return Err(AppError::msg("Authentication failed"));
    }
    Ok(handle)
}

pub async fn open_sftp(profile: &Profile) -> AppResult<(Handle<ClientHandler>, SftpSession)> {
    let handle = connect_handle(profile).await?;
    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| AppError::msg(format!("channel: {e}")))?;
    channel
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| AppError::msg(format!("sftp subsystem: {e}")))?;
    let sftp = SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| AppError::msg(format!("sftp session: {e}")))?;
    Ok((handle, sftp))
}

pub struct ExecResult {
    pub exit_code: u32,
    pub stdout: String,
    pub stderr: String,
}

/// Open a short-lived SSH session and run a non-interactive remote command.
#[allow(dead_code)]
pub async fn exec_command(profile: &Profile, command: &str) -> AppResult<ExecResult> {
    let handle = connect_handle(profile).await?;
    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| AppError::msg(format!("channel: {e}")))?;
    channel
        .exec(true, command)
        .await
        .map_err(|e| AppError::msg(format!("exec: {e}")))?;

    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let mut exit_code = None;

    loop {
        let Some(msg) = channel.wait().await else {
            break;
        };
        match msg {
            ChannelMsg::Data { ref data } => stdout.extend_from_slice(data),
            ChannelMsg::ExtendedData { ref data, ext } if ext == 1 => {
                stderr.extend_from_slice(data);
            }
            ChannelMsg::ExitStatus { exit_status } => exit_code = Some(exit_status),
            _ => {}
        }
    }

    let _ = handle
        .disconnect(Disconnect::ByApplication, "", "en")
        .await;

    Ok(ExecResult {
        exit_code: exit_code.unwrap_or(255),
        stdout: String::from_utf8_lossy(&stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&stderr).trim().to_string(),
    })
}

pub async fn install_authorized_key(profile: &Profile, pub_key: &str) -> AppResult<()> {
    let (handle, sftp) = open_sftp(profile).await?;
    let home = sftp
        .canonicalize(".")
        .await
        .map_err(|e| AppError::msg(format!("canonicalize: {e}")))?;
    let ssh_dir = format!("{home}/.ssh");
    let _ = sftp.create_dir(ssh_dir.as_str()).await;
    let auth = format!("{ssh_dir}/authorized_keys");

    let existing = match sftp.read(auth.as_str()).await {
        Ok(bytes) => String::from_utf8_lossy(&bytes).to_string(),
        Err(_) => String::new(),
    };

    if existing.lines().any(|l| l.trim() == pub_key.trim()) {
        let _ = handle
            .disconnect(Disconnect::ByApplication, "", "en")
            .await;
        return Ok(());
    }

    let mut content = existing;
    if !content.is_empty() && !content.ends_with('\n') {
        content.push('\n');
    }
    content.push_str(pub_key.trim());
    content.push('\n');

    let mut file = sftp
        .create(auth.as_str())
        .await
        .map_err(|e| AppError::msg(format!("create authorized_keys: {e}")))?;
    file.write_all(content.as_bytes())
        .await
        .map_err(|e| AppError::msg(format!("write: {e}")))?;
    let _ = file.shutdown().await;

    let _ = handle
        .disconnect(Disconnect::ByApplication, "", "en")
        .await;
    Ok(())
}
