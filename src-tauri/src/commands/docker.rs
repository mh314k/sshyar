use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::docker_logs;
use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session::ExecResult;
use crate::state::AppState;

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
    /// From `com.docker.compose.project.working_dir` (or parent of absolute config file).
    pub compose_working_dir: Option<String>,
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
    /// True when no container (running or stopped) references this image.
    pub unused: bool,
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
    super::profile_gate::load_flagged_profile(
        state,
        profile_id,
        |p| p.docker_management,
        "Docker",
    )
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

async fn docker_cli(
    state: &State<'_, AppState>,
    profile: &Profile,
    args: &str,
) -> AppResult<ExecResult> {
    let cmd = format!("docker {args}");
    state.remote_exec.exec(profile, &cmd).await
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

fn unix_parent_dir(path: &str) -> Option<String> {
    let path = path.trim().trim_end_matches('/');
    if path.is_empty() || path == "/" {
        return None;
    }
    let idx = path.rfind('/')?;
    if idx == 0 {
        Some("/".into())
    } else {
        Some(path[..idx].to_string())
    }
}

fn compose_working_dir_from_labels(
    labels: &std::collections::HashMap<String, String>,
) -> Option<String> {
    if let Some(wd) = labels.get("com.docker.compose.project.working_dir") {
        let t = wd.trim();
        if !t.is_empty() {
            return Some(t.trim_end_matches('/').to_string());
        }
    }
    // Fallback: first absolute compose config file → its directory.
    if let Some(cf) = labels.get("com.docker.compose.project.config_files") {
        for part in cf.split(',') {
            let p = part.trim();
            if p.starts_with('/') {
                if let Some(parent) = unix_parent_dir(p) {
                    return Some(parent);
                }
            }
        }
    }
    None
}

/// Probe whether Docker CLI is installed on the remote host and report its version.
#[tauri::command]
pub async fn docker_probe(state: State<'_, AppState>, profile_id: String) -> AppResult<DockerStatus> {
    let profile = load_docker_profile(&state, &profile_id)?;

    let result = state
        .remote_exec
        .exec(
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
    let result = docker_cli(&state, &profile, "ps -a --no-trunc --format '{{json .}}'").await?;
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
        let compose_working_dir = compose_working_dir_from_labels(&labels);
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
            compose_working_dir,
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
    let result = docker_cli(&state, &profile, &args).await?;
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
    let result = docker_cli(
        &state,
        &profile,
        "images --no-trunc --format '{{json .}}'",
    )
    .await?;
    ensure_ok(&result, "docker images")?;
    let ps = docker_cli(
        &state,
        &profile,
        "ps -a --no-trunc --format '{{json .}}'",
    )
    .await?;
    ensure_ok(&ps, "docker ps")?;
    let used = collect_used_image_keys(&ps.stdout);

    let mut out = Vec::new();
    for line in result.stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let row: ImageRow = serde_json::from_str(line)
            .map_err(|e| AppError::msg(format!("parse docker images: {e}")))?;
        let created = if !row.created_at.is_empty() {
            row.created_at.clone()
        } else {
            row.created_since.clone()
        };
        let unused = !image_is_used(&row, &used);
        out.push(DockerImage {
            id: short_image_id(&row.id),
            repository: row.repository,
            tag: row.tag,
            size: row.size,
            created,
            unused,
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
    let result = docker_cli(&state, &profile, &format!("rmi {qid}")).await?;
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
    let result = docker_cli(&state, &profile, "volume ls --format '{{json .}}'").await?;
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
    let result = docker_cli(&state, &profile, &format!("volume rm {qname}")).await?;
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
    let result = docker_cli(&state, &profile, "network ls --format '{{json .}}'").await?;
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
    let result = docker_cli(&state, &profile, &format!("network rm {q}")).await?;
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
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    workdir: String,
    file_name: String,
    action: String,
    job_id: Option<String>,
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
        "recreate" => "up -d --force-recreate".to_string(),
        "build" => "build".to_string(),
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
    let result = if let Some(ref job_id) = job_id {
        state
            .remote_exec
            .exec_streaming(&app, job_id, &profile, &cmd)
            .await?
    } else {
        state.remote_exec.exec(&profile, &cmd).await?
    };
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerDfRow {
    pub type_name: String,
    pub total_count: String,
    pub active: String,
    pub size: String,
    pub reclaimable: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerDfResult {
    pub rows: Vec<DockerDfRow>,
    pub raw: String,
}

#[derive(Debug, Deserialize)]
struct DfJsonLine {
    #[serde(rename = "Type", default)]
    type_name: String,
    #[serde(rename = "TotalCount", default)]
    total_count: serde_json::Value,
    #[serde(rename = "Active", default)]
    active: serde_json::Value,
    #[serde(rename = "Size", default)]
    size: serde_json::Value,
    #[serde(rename = "Reclaimable", default)]
    reclaimable: serde_json::Value,
}

fn json_val_str(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Null => String::new(),
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

/// Remote `docker system df` — disk usage / reclaimable space.
#[tauri::command]
pub async fn docker_system_df(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<DockerDfResult> {
    let profile = load_docker_profile(&state, &profile_id)?;
    let json_result = docker_cli(&state, &profile, "system df --format '{{json .}}'").await?;
    let raw_fallback = docker_cli(&state, &profile, "system df").await?;
    let raw = {
        let t = combined_output(&raw_fallback);
        if t.trim().is_empty() {
            combined_output(&json_result)
        } else {
            t
        }
    };

    if json_result.exit_code != 0 && raw_fallback.exit_code != 0 {
        return Err(AppError::msg(if raw.is_empty() {
            format!("docker system df failed (exit {})", json_result.exit_code)
        } else {
            raw
        }));
    }

    let mut rows = Vec::new();
    if json_result.exit_code == 0 {
        for line in json_result.stdout.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if let Ok(parsed) = serde_json::from_str::<DfJsonLine>(line) {
                if parsed.type_name.is_empty() {
                    continue;
                }
                rows.push(DockerDfRow {
                    type_name: parsed.type_name,
                    total_count: json_val_str(&parsed.total_count),
                    active: json_val_str(&parsed.active),
                    size: json_val_str(&parsed.size),
                    reclaimable: json_val_str(&parsed.reclaimable),
                });
            }
        }
    }

    Ok(DockerDfResult { rows, raw })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerPruneImageItem {
    pub id: String,
    pub reference: String,
    pub size: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerPruneVolumeItem {
    pub name: String,
    pub driver: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerPrunePreview {
    pub images: Vec<DockerPruneImageItem>,
    pub volumes: Vec<DockerPruneVolumeItem>,
}

fn normalize_image_id(id: &str) -> String {
    id.trim()
        .trim_start_matches("sha256:")
        .to_ascii_lowercase()
}

fn short_image_id(id: &str) -> String {
    let n = normalize_image_id(id);
    n.chars().take(12).collect()
}

fn image_reference(repository: &str, tag: &str) -> String {
    let repo = repository.trim();
    let tag = tag.trim();
    if repo.is_empty() || repo == "<none>" {
        if tag.is_empty() || tag == "<none>" {
            "<none>:<none>".into()
        } else {
            format!("<none>:{tag}")
        }
    } else if tag.is_empty() || tag == "<none>" {
        format!("{repo}:<none>")
    } else {
        format!("{repo}:{tag}")
    }
}

fn collect_used_image_keys(ps_stdout: &str) -> std::collections::HashSet<String> {
    let mut used = std::collections::HashSet::new();
    for line in ps_stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(row) = serde_json::from_str::<PsRow>(line) {
            let img = row.image.trim();
            if img.is_empty() {
                continue;
            }
            used.insert(img.to_string());
            let norm = normalize_image_id(img);
            if !norm.is_empty() {
                used.insert(norm.clone());
                if norm.len() >= 12 {
                    used.insert(norm.chars().take(12).collect());
                }
            }
        }
    }
    used
}

fn image_is_used(row: &ImageRow, used: &std::collections::HashSet<String>) -> bool {
    let id_norm = normalize_image_id(&row.id);
    let id_short = short_image_id(&row.id);
    let reference = image_reference(&row.repository, &row.tag);
    let repo = row.repository.trim();

    if !id_norm.is_empty() && (used.contains(&id_norm) || used.contains(&id_short)) {
        return true;
    }
    if used.contains(&row.id) || used.contains(&reference) {
        return true;
    }
    // Containers often reference repo without tag (implies :latest) or repo:tag.
    if !repo.is_empty() && repo != "<none>" {
        if used.contains(repo) {
            return true;
        }
        if row.tag == "latest" && used.contains(&format!("{repo}:latest")) {
            return true;
        }
    }
    // Prefix match: container Image may be a truncated id.
    used.iter().any(|u| {
        let un = normalize_image_id(u);
        (!un.is_empty() && !id_norm.is_empty() && (id_norm.starts_with(&un) || un.starts_with(&id_norm)))
            || u == &reference
    })
}

/// Preview what selective prune would delete (unused images / dangling volumes).
#[tauri::command]
pub async fn docker_prune_preview(
    state: State<'_, AppState>,
    profile_id: String,
    unused_images: bool,
    unused_volumes: bool,
) -> AppResult<DockerPrunePreview> {
    let profile = load_docker_profile(&state, &profile_id)?;
    if !unused_images && !unused_volumes {
        return Err(AppError::msg("select at least one prune target"));
    }

    let mut images = Vec::new();
    let mut volumes = Vec::new();

    if unused_images {
        let imgs = docker_cli(&state, &profile, "images --no-trunc --format '{{json .}}'").await?;
        ensure_ok(&imgs, "docker images")?;
        let ps = docker_cli(&state, &profile, "ps -a --no-trunc --format '{{json .}}'").await?;
        ensure_ok(&ps, "docker ps")?;
        let used = collect_used_image_keys(&ps.stdout);

        for line in imgs.stdout.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            let row: ImageRow = serde_json::from_str(line)
                .map_err(|e| AppError::msg(format!("parse docker images: {e}")))?;
            if image_is_used(&row, &used) {
                continue;
            }
            images.push(DockerPruneImageItem {
                id: short_image_id(&row.id),
                reference: image_reference(&row.repository, &row.tag),
                size: row.size,
            });
        }
        images.sort_by(|a, b| a.reference.cmp(&b.reference));
    }

    if unused_volumes {
        let vols = docker_cli(
            &state,
            &profile,
            "volume ls -f dangling=true --format '{{json .}}'",
        )
        .await?;
        ensure_ok(&vols, "docker volume ls")?;
        for line in vols.stdout.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            let row: VolumeRow = serde_json::from_str(line)
                .map_err(|e| AppError::msg(format!("parse docker volume ls: {e}")))?;
            if row.name.is_empty() {
                continue;
            }
            volumes.push(DockerPruneVolumeItem {
                name: row.name,
                driver: row.driver,
            });
        }
        volumes.sort_by(|a, b| a.name.cmp(&b.name));
    }

    Ok(DockerPrunePreview { images, volumes })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerPruneResult {
    pub ok: bool,
    pub output: String,
}

/// Selective safe prune: unused images and/or unused volumes only (never system prune -a --volumes).
#[tauri::command]
pub async fn docker_prune(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    unused_images: bool,
    unused_volumes: bool,
    job_id: Option<String>,
) -> AppResult<DockerPruneResult> {
    let profile = load_docker_profile(&state, &profile_id)?;
    if !unused_images && !unused_volumes {
        return Err(AppError::msg("select at least one prune target"));
    }

    let mut cmds: Vec<&str> = Vec::new();
    if unused_images {
        // All images not used by at least one container (not dangling-only).
        cmds.push("docker image prune -a -f");
    }
    if unused_volumes {
        // Volumes not referenced by any container.
        cmds.push("docker volume prune -f");
    }
    let cmd = cmds.join(" && ");

    let result = if let Some(ref job_id) = job_id {
        state
            .remote_exec
            .exec_streaming(&app, job_id, &profile, &cmd)
            .await?
    } else {
        state.remote_exec.exec(&profile, &cmd).await?
    };

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
            format!("docker prune failed (exit {})", result.exit_code)
        } else {
            output
        }));
    }
    Ok(DockerPruneResult {
        ok: true,
        output: if output.is_empty() {
            "prune completed".into()
        } else {
            output
        },
    })
}

/// Start live `docker logs -f` streaming; returns stream id. Emits `docker-logs` events.
#[tauri::command]
pub async fn docker_logs_start(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    container_id: String,
    tail: Option<u32>,
) -> AppResult<String> {
    let profile = load_docker_profile(&state, &profile_id)?;
    // Stop any previous streams so only one live viewer runs.
    state.docker_logs.stop_all().await;
    docker_logs::start_stream(
        app,
        Arc::clone(&state.docker_logs),
        Arc::clone(&state.remote_exec),
        profile,
        container_id,
        tail.unwrap_or(200),
    )
    .await
}

/// Start live `docker compose logs -f` for a compose file in a remote directory.
#[tauri::command]
pub async fn docker_compose_logs_start(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    workdir: String,
    file_name: String,
    tail: Option<u32>,
) -> AppResult<String> {
    let profile = load_docker_profile(&state, &profile_id)?;
    if !is_allowed_compose_file(&file_name) {
        return Err(AppError::msg(format!(
            "unsupported compose file name: {file_name}"
        )));
    }
    let tail = tail.unwrap_or(200).clamp(1, 5000);
    let qdir = shell_single_quote(&workdir)?;
    let qfile = shell_single_quote(&file_name)?;
    let cmd = format!(
        "cd {qdir} && if docker compose version >/dev/null 2>&1; then docker compose -f {qfile} logs -f --tail {tail} 2>&1; else docker-compose -f {qfile} logs -f --tail {tail} 2>&1; fi"
    );
    state.docker_logs.stop_all().await;
    docker_logs::start_stream_cmd(
        app,
        Arc::clone(&state.docker_logs),
        Arc::clone(&state.remote_exec),
        profile,
        cmd,
    )
    .await
}

/// Stop a live log stream by id.
#[tauri::command]
pub async fn docker_logs_stop(state: State<'_, AppState>, stream_id: String) -> AppResult<()> {
    state.docker_logs.stop(&stream_id).await
}

/// Ensure a persistent Docker SSH session for the profile (idempotent).
#[tauri::command]
pub async fn docker_session_ensure(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<()> {
    let profile = load_docker_profile(&state, &profile_id)?;
    state.remote_exec.ensure(&profile).await
}

/// Close the persistent Docker SSH session for a profile.
#[tauri::command]
pub async fn docker_session_close(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<()> {
    state.remote_exec.close(&profile_id).await
}
