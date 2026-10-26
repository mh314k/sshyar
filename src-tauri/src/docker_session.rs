use std::collections::HashMap;
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

use russh::client::Handle;
use russh::{Channel, ChannelMsg, Disconnect};

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session::{self, ClientHandler, ExecResult};

fn fingerprint(profile: &Profile) -> String {
    format!("{}:{}:{}", profile.host, profile.port, profile.username)
}

type SharedHandle = Arc<Mutex<Handle<ClientHandler>>>;

struct SessionEntry {
    fingerprint: String,
    handle: SharedHandle,
}

pub struct DockerSessionManager {
    sessions: Mutex<HashMap<String, SessionEntry>>,
}

pub type SharedDockerSessions = Arc<DockerSessionManager>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerJobChunkEvent {
    pub job_id: String,
    pub text: String,
}

impl DockerSessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub async fn ensure(&self, profile: &Profile) -> AppResult<()> {
        let _ = self.shared_handle(profile).await?;
        Ok(())
    }

    pub async fn close(&self, profile_id: &str) -> AppResult<()> {
        let entry = self.sessions.lock().await.remove(profile_id);
        if let Some(entry) = entry {
            let handle = entry.handle.lock().await;
            let _ = handle
                .disconnect(Disconnect::ByApplication, "", "en")
                .await;
        }
        Ok(())
    }

    pub async fn close_all(&self) {
        let ids: Vec<String> = self.sessions.lock().await.keys().cloned().collect();
        for id in ids {
            let _ = self.close(&id).await;
        }
    }

    async fn shared_handle(&self, profile: &Profile) -> AppResult<SharedHandle> {
        let fp = fingerprint(profile);
        {
            let map = self.sessions.lock().await;
            if let Some(entry) = map.get(&profile.id) {
                if entry.fingerprint == fp {
                    return Ok(Arc::clone(&entry.handle));
                }
            }
        }
        let _ = self.close(&profile.id).await;
        let handle = ssh_session::connect_handle(profile).await?;
        let shared = Arc::new(Mutex::new(handle));
        self.sessions.lock().await.insert(
            profile.id.clone(),
            SessionEntry {
                fingerprint: fp,
                handle: Arc::clone(&shared),
            },
        );
        Ok(shared)
    }

    async fn drop_cached(&self, profile_id: &str) {
        let _ = self.close(profile_id).await;
    }

    /// Open an exec channel on the pooled session (Handle stays open).
    pub async fn open_exec_channel(
        &self,
        profile: &Profile,
        command: &str,
    ) -> AppResult<Channel<russh::client::Msg>> {
        self.open_exec_channel_retry(profile, command, true).await
    }

    async fn open_exec_channel_retry(
        &self,
        profile: &Profile,
        command: &str,
        allow_retry: bool,
    ) -> AppResult<Channel<russh::client::Msg>> {
        let shared = self.shared_handle(profile).await?;
        let result = {
            let handle = shared.lock().await;
            open_channel_exec(&*handle, command).await
        };
        match result {
            Ok(ch) => Ok(ch),
            Err(e) if allow_retry => {
                self.drop_cached(&profile.id).await;
                let shared = self.shared_handle(profile).await?;
                let handle = shared.lock().await;
                open_channel_exec(&*handle, command)
                    .await
                    .map_err(|_| e)
            }
            Err(e) => Err(e),
        }
    }

    pub async fn exec(&self, profile: &Profile, command: &str) -> AppResult<ExecResult> {
        let mut channel = self.open_exec_channel(profile, command).await?;
        read_exec_result(&mut channel, None, None).await
    }

    pub async fn exec_streaming(
        &self,
        app: &AppHandle,
        job_id: &str,
        profile: &Profile,
        command: &str,
    ) -> AppResult<ExecResult> {
        let mut channel = self.open_exec_channel(profile, command).await?;
        read_exec_result(&mut channel, Some(app), Some(job_id)).await
    }
}

async fn open_channel_exec(
    handle: &Handle<ClientHandler>,
    command: &str,
) -> AppResult<Channel<russh::client::Msg>> {
    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| AppError::msg(format!("channel: {e}")))?;
    channel
        .exec(true, command)
        .await
        .map_err(|e| AppError::msg(format!("exec: {e}")))?;
    Ok(channel)
}

async fn read_exec_result(
    channel: &mut Channel<russh::client::Msg>,
    app: Option<&AppHandle>,
    job_id: Option<&str>,
) -> AppResult<ExecResult> {
    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let mut exit_code = None;

    loop {
        let Some(msg) = channel.wait().await else {
            break;
        };
        match msg {
            ChannelMsg::Data { ref data } => {
                stdout.extend_from_slice(data);
                if let (Some(app), Some(job_id)) = (app, job_id) {
                    let text = String::from_utf8_lossy(data);
                    if !text.is_empty() {
                        let _ = app.emit(
                            "docker-job-chunk",
                            DockerJobChunkEvent {
                                job_id: job_id.to_string(),
                                text: text.to_string(),
                            },
                        );
                    }
                }
            }
            ChannelMsg::ExtendedData { ref data, ext } if ext == 1 => {
                stderr.extend_from_slice(data);
                if let (Some(app), Some(job_id)) = (app, job_id) {
                    let text = String::from_utf8_lossy(data);
                    if !text.is_empty() {
                        let _ = app.emit(
                            "docker-job-chunk",
                            DockerJobChunkEvent {
                                job_id: job_id.to_string(),
                                text: text.to_string(),
                            },
                        );
                    }
                }
            }
            ChannelMsg::ExitStatus { exit_status } => exit_code = Some(exit_status),
            _ => {}
        }
    }

    Ok(ExecResult {
        exit_code: exit_code.unwrap_or(255),
        stdout: String::from_utf8_lossy(&stdout).trim().to_string(),
        stderr: String::from_utf8_lossy(&stderr).trim().to_string(),
    })
}
