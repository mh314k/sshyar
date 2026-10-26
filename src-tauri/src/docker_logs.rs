use std::collections::HashMap;
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::{oneshot, Mutex};
use uuid::Uuid;

use russh::{ChannelMsg, Disconnect};

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session;

type SharedCancel = Arc<Mutex<Option<oneshot::Sender<()>>>>;

struct ActiveStream {
    cancel: SharedCancel,
}

pub struct DockerLogManager {
    streams: Mutex<HashMap<String, ActiveStream>>,
}

pub type SharedDockerLogs = Arc<DockerLogManager>;

impl DockerLogManager {
    pub fn new() -> Self {
        Self {
            streams: Mutex::new(HashMap::new()),
        }
    }

    pub async fn stop(&self, stream_id: &str) -> AppResult<()> {
        let cancel = {
            let mut map = self.streams.lock().await;
            map.remove(stream_id).map(|s| s.cancel)
        };
        if let Some(cancel) = cancel {
            if let Some(tx) = cancel.lock().await.take() {
                let _ = tx.send(());
            }
        }
        Ok(())
    }

    pub async fn stop_all(&self) {
        let ids: Vec<String> = self.streams.lock().await.keys().cloned().collect();
        for id in ids {
            let _ = self.stop(&id).await;
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerLogEvent {
    pub stream_id: String,
    /// `data` | `ended` | `error`
    pub kind: String,
    pub text: String,
}

fn shell_quote_id(s: &str) -> AppResult<String> {
    if s.is_empty() {
        return Err(AppError::msg("empty container id"));
    }
    if !s
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | ':' | '/' | '-'))
    {
        return Err(AppError::msg(format!("invalid container id: {s}")));
    }
    Ok(format!("'{s}'"))
}

fn emit(app: &AppHandle, stream_id: &str, kind: &str, text: impl Into<String>) {
    let _ = app.emit(
        "docker-logs",
        DockerLogEvent {
            stream_id: stream_id.to_string(),
            kind: kind.to_string(),
            text: text.into(),
        },
    );
}

/// Start `docker logs -f --tail N` and stream output as `docker-logs` events.
pub async fn start_stream(
    app: AppHandle,
    manager: SharedDockerLogs,
    profile: Profile,
    container_id: String,
    tail: u32,
) -> AppResult<String> {
    let tail = tail.clamp(1, 5000);
    let qid = shell_quote_id(&container_id)?;
    let stream_id = Uuid::new_v4().to_string();
    let (cancel_tx, cancel_rx) = oneshot::channel::<()>();
    let cancel_slot: SharedCancel = Arc::new(Mutex::new(Some(cancel_tx)));

    manager.streams.lock().await.insert(
        stream_id.clone(),
        ActiveStream {
            cancel: Arc::clone(&cancel_slot),
        },
    );

    let sid = stream_id.clone();
    let mgr = Arc::clone(&manager);

    tauri::async_runtime::spawn(async move {
        let result = run_logs_loop(&app, &sid, &profile, &qid, tail, cancel_rx).await;

        // Drop from map
        {
            let mut map = mgr.streams.lock().await;
            map.remove(&sid);
        }
        let _ = cancel_slot.lock().await.take();

        match result {
            Ok(()) => emit(&app, &sid, "ended", ""),
            Err(e) => emit(&app, &sid, "error", e.to_string()),
        }
    });

    Ok(stream_id)
}

async fn run_logs_loop(
    app: &AppHandle,
    stream_id: &str,
    profile: &Profile,
    qid: &str,
    tail: u32,
    mut cancel_rx: oneshot::Receiver<()>,
) -> AppResult<()> {
    let handle = ssh_session::connect_handle(profile).await?;
    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| AppError::msg(format!("channel: {e}")))?;

    let cmd = format!("docker logs -f --tail {tail} {qid} 2>&1");
    channel
        .exec(true, cmd)
        .await
        .map_err(|e| AppError::msg(format!("exec: {e}")))?;

    loop {
        tokio::select! {
            _ = &mut cancel_rx => {
                let _ = channel.close().await;
                break;
            }
            msg = channel.wait() => {
                match msg {
                    None => break,
                    Some(ChannelMsg::Data { ref data }) => {
                        let text = String::from_utf8_lossy(data);
                        if !text.is_empty() {
                            emit(app, stream_id, "data", text.to_string());
                        }
                    }
                    Some(ChannelMsg::ExtendedData { ref data, .. }) => {
                        let text = String::from_utf8_lossy(data);
                        if !text.is_empty() {
                            emit(app, stream_id, "data", text.to_string());
                        }
                    }
                    Some(ChannelMsg::ExitStatus { exit_status }) => {
                        if exit_status != 0 {
                            return Err(AppError::msg(format!(
                                "docker logs exited with status {exit_status}"
                            )));
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    let _ = handle
        .disconnect(Disconnect::ByApplication, "", "en")
        .await;
    Ok(())
}
