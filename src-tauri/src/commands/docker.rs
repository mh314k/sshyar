use serde::Serialize;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::ssh_session;
use crate::state::{find_profile, AppState};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerStatus {
    pub installed: bool,
    pub version: Option<String>,
    /// Raw `docker --version` output (or a short reason when missing).
    pub detail: String,
}

fn parse_docker_version(raw: &str) -> Option<String> {
    let raw = raw.trim();
    if let Some(rest) = raw.strip_prefix("Docker version ") {
        let ver = rest
            .split([',', ' ', '('])
            .next()
            .map(str::trim)
            .filter(|s| !s.is_empty())?;
        return Some(ver.to_string());
    }
    if !raw.is_empty() {
        Some(raw.to_string())
    } else {
        None
    }
}

/// Probe whether Docker CLI is installed on the remote host and report its version.
#[tauri::command]
pub async fn docker_probe(state: State<'_, AppState>, profile_id: String) -> AppResult<DockerStatus> {
    let profile = {
        let v = state.vault.lock();
        find_profile(&v, &profile_id)?.clone()
    };
    if !profile.docker_management {
        return Err(AppError::msg(
            "Docker management is not enabled for this profile",
        ));
    }

    let result = ssh_session::exec_command(
        &profile,
        "if command -v docker >/dev/null 2>&1; then docker --version; else echo '__DOCKER_NOT_INSTALLED__'; fi",
    )
    .await?;

    let out = if result.stdout.is_empty() {
        result.stderr.clone()
    } else {
        result.stdout.clone()
    };

    if out.contains("__DOCKER_NOT_INSTALLED__") || out.trim().is_empty() {
        return Ok(DockerStatus {
            installed: false,
            version: None,
            detail: "Docker is not installed on this server".into(),
        });
    }

    if result.exit_code != 0 && !out.to_lowercase().contains("docker version") {
        return Ok(DockerStatus {
            installed: false,
            version: None,
            detail: if out.is_empty() {
                format!("docker probe failed (exit {})", result.exit_code)
            } else {
                out
            },
        });
    }

    Ok(DockerStatus {
        installed: true,
        version: parse_docker_version(&out),
        detail: out,
    })
}
