use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session::{self, ExecResult};
use crate::state::{find_profile, AppState};

const STANDALONE_GROUP: &str = "__standalone__";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerStatus {
    pub installed: bool,
    pub version: Option<String>,
    /// Raw `docker --version` output (or a short reason when missing).
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub image: String,
    pub status: String,
    pub state: String,
    pub ports: String,
    pub compose_project: Option<String>,
    pub compose_service: Option<String>,
    /// Group key for UI: compose project name, or `__standalone__`.
    pub group_key: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerImage {
    pub id: String,
    pub repository: String,
    pub tag: String,
    pub size: String,
    pub created: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerVolume {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerNetwork {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub scope: String,
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

fn load_docker_profile(state: &State<'_, AppState>, profile_id: &str) -> AppResult<Profile> {
    let v = state.vault.lock();
    let profile = find_profile(&v, profile_id)?.clone();
    if !profile.docker_management {
        return Err(AppError::msg(
            "Docker management is not enabled for this profile",
        ));
    }
    Ok(profile)
}

fn shell_quote(s: &str) -> AppResult<String> {
    if s.is_empty() {
        return Err(AppError::msg("empty docker resource id"));
    }
    if !s
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | ':' | '/' | '-'))
    {
        return Err(AppError::msg(format!("invalid docker id/name: {s}")));
    }
    Ok(format!("'{s}'"))
}

/// Single-quote for remote paths / compose filenames (allows spaces etc.).
fn shell_single_quote(s: &str) -> AppResult<String> {
    if s.is_empty() {
        return Err(AppError::msg("empty path"));
    }
    if s.contains('\0') || s.contains('\n') || s.contains('\r') {
        return Err(AppError::msg("invalid path characters"));
    }
    Ok(format!("'{}'", s.replace('\'', "'\\''")))
}

fn is_allowed_compose_file(name: &str) -> bool {
    matches!(
        name.to_ascii_lowercase().as_str(),
        "compose.yaml" | "compose.yml" | "docker-compose.yml" | "docker-compose.yaml"
    )
}

async fn docker_cli(profile: &Profile, args: &str) -> AppResult<ExecResult> {
    let cmd = format!("docker {args}");
    ssh_session::exec_command(profile, &cmd).await
}

fn combined_output(result: &ExecResult) -> String {
    if !result.stdout.is_empty() {
        result.stdout.clone()
    } else {
        result.stderr.clone()
    }
}

fn ensure_ok(result: &ExecResult, context: &str) -> AppResult<()> {
    if result.exit_code == 0 {
        return Ok(());
    }
    let detail = combined_output(result);
    Err(AppError::msg(if detail.is_empty() {
        format!("{context} failed (exit {})", result.exit_code)
    } else {
        format!("{context}: {detail}")
    }))
}

fn parse_label_map(labels: &str) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    for part in labels.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        if let Some((k, v)) = part.split_once('=') {
            map.insert(k.trim().to_string(), v.trim().to_string());
        }
    }
    map
}

fn first_name(names: &str) -> String {
    names
        .split(',')
        .map(|n| n.trim().trim_start_matches('/'))
        .find(|n| !n.is_empty())
        .unwrap_or("")
        .to_string()
}

/// Probe whether Docker CLI is installed on the remote host and report its version.
#[tauri::command]
pub async fn docker_probe(state: State<'_, AppState>, profile_id: String) -> AppResult<DockerStatus> {
    let profile = load_docker_profile(&state, &profile_id)?;

    let result = ssh_session::exec_command(
        &profile,
        "if command -v docker >/dev/null 2>&1; then docker --version; else echo '__DOCKER_NOT_INSTALLED__'; fi",
    )
    .await?;

    let out = combined_output(&result);

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

#[derive(Debug, Deserialize)]
struct PsRow {
    #[serde(default, alias = "ID", alias = "Id")]
    id: String,
    #[serde(default, alias = "Names", alias = "Name")]
    names: String,
    #[serde(default, alias = "Image")]
    image: String,
    #[serde(default, alias = "Status")]
    status: String,
    #[serde(default, alias = "State")]
    state: String,
    #[serde(default, alias = "Ports")]
    ports: String,
    #[serde(default, alias = "Labels", alias = "Label")]
    labels: serde_json::Value,
}

fn labels_to_string(labels: &serde_json::Value) -> String {
    match labels {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Object(map) => map
            .iter()
            .map(|(k, v)| {
                let val = match v {
                    serde_json::Value::String(s) => s.clone(),
                    other => other.to_string(),
                };
                format!("{k}={val}")
            })
            .collect::<Vec<_>>()
            .join(","),
        _ => String::new(),
    }
}

#[tauri::command]
pub async fn docker_list_containers(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<Vec<DockerContainer>> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let result = docker_cli(&profile, "ps -a --no-trunc --format '{{json .}}'").await?;
    ensure_ok(&result, "docker ps")?;

    let mut out = Vec::new();
    for line in result.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let row: PsRow = serde_json::from_str(line)
            .map_err(|e| AppError::msg(format!("parse docker ps: {e}")))?;
        let labels = parse_label_map(&labels_to_string(&row.labels));
        let compose_project = labels
            .get("com.docker.compose.project")
            .cloned()
            .filter(|s| !s.is_empty());
        let compose_service = labels
            .get("com.docker.compose.service")
            .cloned()
            .filter(|s| !s.is_empty());
        let group_key = compose_project
            .clone()
            .unwrap_or_else(|| STANDALONE_GROUP.to_string());
        let name = first_name(&row.names);
        out.push(DockerContainer {
            id: row.id,
            name: if name.is_empty() {
                row.names
            } else {
                name
            },
            image: row.image,
            status: row.status,
            state: row.state.to_lowercase(),
            ports: row.ports,
            compose_project,
            compose_service,
            group_key,
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn docker_container_action(
    state: State<'_, AppState>,
    profile_id: String,
    id: String,
    action: String,
) -> AppResult<()> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let qid = shell_quote(&id)?;
    let args = match action.as_str() {
        "start" => format!("start {qid}"),
        "stop" => format!("stop {qid}"),
        "restart" => format!("restart {qid}"),
        "remove" => format!("rm -f {qid}"),
        other => {
            return Err(AppError::msg(format!(
                "unsupported container action: {other}"
            )))
        }
    };
    let result = docker_cli(&profile, &args).await?;
    ensure_ok(&result, &format!("docker {action}"))
}

#[derive(Debug, Deserialize)]
struct ImageRow {
    #[serde(default, alias = "ID", alias = "Id")]
    id: String,
    #[serde(default, alias = "Repository")]
    repository: String,
    #[serde(default, alias = "Tag")]
    tag: String,
    #[serde(default, alias = "Size")]
    size: String,
    /// Prefer absolute timestamp when both are present (docker json emits both).
    #[serde(default, rename = "CreatedAt")]
    created_at: String,
    #[serde(default, rename = "CreatedSince")]
    created_since: String,
}

#[tauri::command]
pub async fn docker_list_images(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<Vec<DockerImage>> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let result = docker_cli(&profile, "images --format '{{json .}}'").await?;
    ensure_ok(&result, "docker images")?;

    let mut out = Vec::new();
    for line in result.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let row: ImageRow = serde_json::from_str(line)
            .map_err(|e| AppError::msg(format!("parse docker images: {e}")))?;
        let created = if !row.created_at.is_empty() {
            row.created_at
        } else {
            row.created_since
        };
        out.push(DockerImage {
            id: row.id,
            repository: row.repository,
            tag: row.tag,
            size: row.size,
            created,
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn docker_image_remove(
    state: State<'_, AppState>,
    profile_id: String,
    id: String,
) -> AppResult<()> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let qid = shell_quote(&id)?;
    let result = docker_cli(&profile, &format!("rmi {qid}")).await?;
    ensure_ok(&result, "docker rmi")
}

#[derive(Debug, Deserialize)]
struct VolumeRow {
    #[serde(default, alias = "Name")]
    name: String,
    #[serde(default, alias = "Driver")]
    driver: String,
    #[serde(default, alias = "Mountpoint")]
    mountpoint: String,
}

#[tauri::command]
pub async fn docker_list_volumes(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<Vec<DockerVolume>> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let result = docker_cli(&profile, "volume ls --format '{{json .}}'").await?;
    ensure_ok(&result, "docker volume ls")?;

    let mut out = Vec::new();
    for line in result.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let row: VolumeRow = serde_json::from_str(line)
            .map_err(|e| AppError::msg(format!("parse docker volume ls: {e}")))?;
        out.push(DockerVolume {
            name: row.name,
            driver: row.driver,
            mountpoint: row.mountpoint,
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn docker_volume_remove(
    state: State<'_, AppState>,
    profile_id: String,
    name: String,
) -> AppResult<()> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let qname = shell_quote(&name)?;
    let result = docker_cli(&profile, &format!("volume rm {qname}")).await?;
    ensure_ok(&result, "docker volume rm")
}

#[derive(Debug, Deserialize)]
struct NetworkRow {
    #[serde(default, alias = "ID", alias = "Id")]
    id: String,
    #[serde(default, alias = "Name")]
    name: String,
    #[serde(default, alias = "Driver")]
    driver: String,
    #[serde(default, alias = "Scope")]
    scope: String,
}

#[tauri::command]
pub async fn docker_list_networks(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<Vec<DockerNetwork>> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let result = docker_cli(&profile, "network ls --format '{{json .}}'").await?;
    ensure_ok(&result, "docker network ls")?;

    let mut out = Vec::new();
    for line in result.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let row: NetworkRow = serde_json::from_str(line)
            .map_err(|e| AppError::msg(format!("parse docker network ls: {e}")))?;
        out.push(DockerNetwork {
            id: row.id,
            name: row.name,
            driver: row.driver,
            scope: row.scope,
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn docker_network_remove(
    state: State<'_, AppState>,
    profile_id: String,
    id_or_name: String,
) -> AppResult<()> {
    let lower = id_or_name.to_lowercase();
    if matches!(lower.as_str(), "bridge" | "host" | "none") {
        return Err(AppError::msg(
            "cannot remove built-in Docker networks (bridge, host, none)",
        ));
    }
    let profile = load_docker_profile(&state, &profile_id)?;
    let q = shell_quote(&id_or_name)?;
    let result = docker_cli(&profile, &format!("network rm {q}")).await?;
    ensure_ok(&result, "docker network rm")
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerComposeResult {
    pub ok: bool,
    pub output: String,
}

/// Run a compose action in a remote directory that contains a compose file.
#[tauri::command]
pub async fn docker_compose_run(
    state: State<'_, AppState>,
    profile_id: String,
    workdir: String,
    file_name: String,
    action: String,
) -> AppResult<DockerComposeResult> {
    let profile = load_docker_profile(&state, &profile_id)?;
    if !is_allowed_compose_file(&file_name) {
        return Err(AppError::msg(format!(
            "unsupported compose file name: {file_name}"
        )));
    }
    let qdir = shell_single_quote(&workdir)?;
    let qfile = shell_single_quote(&file_name)?;
    let compose_args = match action.as_str() {
        "up" => "up -d".to_string(),
        "down" => "down".to_string(),
        "restart" => "restart".to_string(),
        "pull" => "pull".to_string(),
        "ps" => "ps".to_string(),
        other => {
            return Err(AppError::msg(format!(
                "unsupported compose action: {other}"
            )))
        }
    };

    // Prefer Compose V2 plugin; fall back to legacy docker-compose binary.
    let cmd = format!(
        "cd {qdir} && if docker compose version >/dev/null 2>&1; then docker compose -f {qfile} {compose_args}; else docker-compose -f {qfile} {compose_args}; fi"
    );
    let result = ssh_session::exec_command(&profile, &cmd).await?;
    let mut output = String::new();
    if !result.stdout.is_empty() {
        output.push_str(&result.stdout);
    }
    if !result.stderr.is_empty() {
        if !output.is_empty() {
            output.push('\n');
        }
        output.push_str(&result.stderr);
    }
    if result.exit_code != 0 {
        return Err(AppError::msg(if output.is_empty() {
            format!("docker compose {action} failed (exit {})", result.exit_code)
        } else {
            output
        }));
    }
    Ok(DockerComposeResult {
        ok: true,
        output: if output.is_empty() {
            format!("docker compose {action} completed")
        } else {
            output
        },
    })
}
