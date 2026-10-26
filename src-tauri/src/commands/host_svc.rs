use serde::Serialize;
use tauri::{AppHandle, State};

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::ssh_session::ExecResult;
use crate::state::{find_profile, AppState};

fn load_flagged_profile(
    state: &State<'_, AppState>,
    profile_id: &str,
    enabled: impl Fn(&Profile) -> bool,
    label: &str,
) -> AppResult<Profile> {
    let v = state.vault.lock();
    let profile = find_profile(&v, profile_id)?.clone();
    if !enabled(&profile) {
        return Err(AppError::msg(format!(
            "{label} management is not enabled for this profile"
        )));
    }
    Ok(profile)
}

fn combined_output(result: &ExecResult) -> String {
    if !result.stdout.is_empty() {
        result.stdout.clone()
    } else {
        result.stderr.clone()
    }
}

fn merge_out(result: &ExecResult) -> String {
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
    output
}

async fn exec(
    state: &State<'_, AppState>,
    profile: &Profile,
    cmd: &str,
) -> AppResult<ExecResult> {
    state.docker_sessions.exec(profile, cmd).await
}

async fn exec_stream(
    app: &AppHandle,
    state: &State<'_, AppState>,
    profile: &Profile,
    cmd: &str,
    job_id: Option<&str>,
) -> AppResult<ExecResult> {
    if let Some(job_id) = job_id {
        state
            .docker_sessions
            .exec_streaming(app, job_id, profile, cmd)
            .await
    } else {
        state.docker_sessions.exec(profile, cmd).await
    }
}

/// Validate a systemd unit name; safe to interpolate unquoted into remote shell cmds.
fn shell_unit(s: &str) -> AppResult<&str> {
    if s.is_empty() {
        return Err(AppError::msg("empty unit name"));
    }
    if !s
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | ':' | '@' | '-'))
    {
        return Err(AppError::msg(format!("invalid unit name: {s}")));
    }
    Ok(s)
}

const CRON_PATH_PREFIXES: &[&str] = &[
    "/etc/cron.d/",
    "/etc/cron.daily/",
    "/etc/cron.hourly/",
    "/etc/cron.weekly/",
    "/etc/cron.monthly/",
];

fn validate_cron_path(path: &str) -> AppResult<&str> {
    let path = path.trim();
    if path.is_empty() || path.contains("..") || path.contains('\0') {
        return Err(AppError::msg("invalid cron path"));
    }
    if !path.starts_with('/') {
        return Err(AppError::msg("cron path must be absolute"));
    }
    if !CRON_PATH_PREFIXES.iter().any(|p| path.starts_with(p)) {
        return Err(AppError::msg("cron path outside allowed directories"));
    }
    let base = path.rsplit('/').next().unwrap_or("");
    if base.is_empty()
        || !base
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-'))
    {
        return Err(AppError::msg("invalid cron file name"));
    }
    Ok(path)
}

fn parse_systemd_unit_line(line: &str) -> Option<SystemdUnit> {
    let line = line
        .trim()
        .trim_start_matches(['●', '○', '↻', '×'])
        .trim();
    if line.is_empty() {
        return None;
    }
    let mut parts = line.split_whitespace();
    let name = parts.next()?.to_string();
    // Units always have a type suffix (e.g. nginx.service); skip headers/footers.
    if name == "UNIT" || !name.contains('.') {
        return None;
    }
    let load = parts.next()?.to_string();
    let active = parts.next()?.to_string();
    let sub = parts.next()?.to_string();
    let description = parts.collect::<Vec<_>>().join(" ");
    // Heuristic: real units have a load state like loaded/not-found/masked
    if load != "loaded" && load != "not-found" && load != "bad" && load != "masked" && load != "error"
    {
        return None;
    }
    const ACTIVE: &[&str] = &[
        "active",
        "inactive",
        "activating",
        "deactivating",
        "failed",
        "reloading",
        "maintenance",
    ];
    if !ACTIVE.iter().any(|s| *s == active) {
        return None;
    }
    Some(SystemdUnit {
        name,
        load,
        active,
        sub,
        description,
    })
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostSvcCmdResult {
    pub ok: bool,
    pub output: String,
}

fn cmd_result(result: ExecResult, context: &str) -> AppResult<HostSvcCmdResult> {
    let output = merge_out(&result);
    if result.exit_code != 0 {
        return Err(AppError::msg(if output.is_empty() {
            format!("{context} failed (exit {})", result.exit_code)
        } else {
            output
        }));
    }
    Ok(HostSvcCmdResult {
        ok: true,
        output: if output.is_empty() {
            format!("{context} completed")
        } else {
            output
        },
    })
}

fn nginx_test_succeeded(output: &str, exit_code: u32) -> bool {
    if exit_code == 0 {
        return true;
    }
    // Some hosts still print the successful markers after non-fatal privilege warnings.
    let lower = output.to_ascii_lowercase();
    lower.contains("syntax is ok") && lower.contains("test is successful")
}

// ── Nginx ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NginxStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub active: Option<String>,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NginxSite {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub async fn nginx_probe(state: State<'_, AppState>, profile_id: String) -> AppResult<NginxStatus> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.nginx_management, "Nginx")?;
    let result = exec(
        &state,
        &profile,
        r#"if command -v nginx >/dev/null 2>&1; then
  echo "__INSTALLED__"
  nginx -v 2>&1
  if command -v systemctl >/dev/null 2>&1; then
    echo "__ACTIVE__"
    systemctl is-active nginx 2>/dev/null || true
  fi
else
  echo "__MISSING__"
fi"#,
    )
    .await?;
    let out = combined_output(&result);
    if out.contains("__MISSING__") || !out.contains("__INSTALLED__") {
        return Ok(NginxStatus {
            installed: false,
            version: None,
            active: None,
            detail: "nginx is not installed on this server".into(),
        });
    }
    let mut version = None;
    let mut active = None;
    let mut after_active = false;
    for line in out.lines() {
        let line = line.trim();
        if line == "__INSTALLED__" || line == "__MISSING__" {
            continue;
        }
        if line == "__ACTIVE__" {
            after_active = true;
            continue;
        }
        if after_active {
            if !line.is_empty() {
                active = Some(line.to_string());
            }
            after_active = false;
            continue;
        }
        if line.to_ascii_lowercase().contains("nginx version") && version.is_none() {
            let v = line
                .split_once(':')
                .map(|(_, rest)| rest.trim())
                .unwrap_or(line)
                .trim()
                .to_string();
            if !v.is_empty() {
                version = Some(v);
            }
        }
    }
    Ok(NginxStatus {
        installed: true,
        version,
        active,
        detail: out
            .lines()
            .filter(|l| {
                let t = l.trim();
                !t.is_empty() && !t.starts_with("__")
            })
            .collect::<Vec<_>>()
            .join("\n"),
    })
}

#[tauri::command]
pub async fn nginx_test(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    job_id: Option<String>,
) -> AppResult<HostSvcCmdResult> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.nginx_management, "Nginx")?;
    let result = exec_stream(
        &app,
        &state,
        &profile,
        "nginx -t 2>&1",
        job_id.as_deref(),
    )
    .await?;
    // nginx -t writes to stderr; exit 0 (or explicit success markers) = ok
    let output = merge_out(&result);
    if !nginx_test_succeeded(&output, result.exit_code) {
        return Err(AppError::msg(if output.is_empty() {
            format!("nginx -t failed (exit {})", result.exit_code)
        } else {
            output
        }));
    }
    Ok(HostSvcCmdResult {
        ok: true,
        output: if output.is_empty() {
            "nginx -t ok".into()
        } else {
            output
        },
    })
}

#[tauri::command]
pub async fn nginx_reload(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    job_id: Option<String>,
) -> AppResult<HostSvcCmdResult> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.nginx_management, "Nginx")?;
    // Privileged reload is intended via the interactive terminal (sudo password).
    // This command remains for non-interactive hosts that already have rights.
    let result = exec_stream(
        &app,
        &state,
        &profile,
        "if command -v systemctl >/dev/null 2>&1; then systemctl reload nginx 2>&1; else nginx -s reload 2>&1; fi",
        job_id.as_deref(),
    )
    .await?;
    cmd_result(result, "nginx reload")
}

#[tauri::command]
pub async fn nginx_list_sites(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<Vec<NginxSite>> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.nginx_management, "Nginx")?;
    let result = exec(
        &state,
        &profile,
        r#"for d in /etc/nginx/sites-enabled /etc/nginx/conf.d; do
  if [ -d "$d" ]; then
    for f in "$d"/*; do
      [ -f "$f" ] || [ -L "$f" ] || continue
      echo "$f"
    done
  fi
done"#,
    )
    .await?;
    if result.exit_code != 0 && result.stdout.trim().is_empty() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for line in result.stdout.lines() {
        let path = line.trim();
        if path.is_empty() || path.ends_with("/*") {
            continue;
        }
        let name = path.rsplit('/').next().unwrap_or(path).to_string();
        if name == "*" {
            continue;
        }
        out.push(NginxSite {
            name,
            path: path.to_string(),
        });
    }
    Ok(out)
}

// ── systemd ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemdUnit {
    pub name: String,
    pub load: String,
    pub active: String,
    pub sub: String,
    pub description: String,
}

#[tauri::command]
pub async fn systemd_list_units(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<Vec<SystemdUnit>> {
    let profile =
        load_flagged_profile(&state, &profile_id, |p| p.systemd_management, "systemd")?;
    let result = exec(
        &state,
        &profile,
        "systemctl list-units --type=service --all --no-legend --no-pager --plain 2>&1",
    )
    .await?;
    if result.exit_code != 0 && result.stdout.trim().is_empty() {
        return Err(AppError::msg(if combined_output(&result).is_empty() {
            format!("systemctl failed (exit {})", result.exit_code)
        } else {
            combined_output(&result)
        }));
    }
    let mut out = Vec::new();
    for line in result.stdout.lines() {
        if let Some(unit) = parse_systemd_unit_line(line) {
            out.push(unit);
        }
    }
    Ok(out)
}

#[tauri::command]
pub async fn systemd_unit_action(
    app: AppHandle,
    state: State<'_, AppState>,
    profile_id: String,
    unit: String,
    action: String,
    job_id: Option<String>,
) -> AppResult<HostSvcCmdResult> {
    let profile =
        load_flagged_profile(&state, &profile_id, |p| p.systemd_management, "systemd")?;
    let q = shell_unit(&unit)?;
    // start/stop/restart are run from the UI via interactive terminal (sudo).
    // This command keeps status (read-ish) and optional non-interactive control.
    let cmd = match action.as_str() {
        "start" => format!("systemctl start {q} 2>&1"),
        "stop" => format!("systemctl stop {q} 2>&1"),
        "restart" => format!("systemctl restart {q} 2>&1"),
        "status" => format!("systemctl status {q} --no-pager -l 2>&1 | head -n 80"),
        other => {
            return Err(AppError::msg(format!(
                "unsupported systemd action: {other}"
            )))
        }
    };
    let result = exec_stream(&app, &state, &profile, &cmd, job_id.as_deref()).await?;
    if action == "status" {
        // status often exits non-zero when inactive — still return output
        let output = merge_out(&result);
        return Ok(HostSvcCmdResult {
            ok: result.exit_code == 0,
            output: if output.is_empty() {
                format!("systemctl status {unit} (exit {})", result.exit_code)
            } else {
                output
            },
        });
    }
    cmd_result(result, &format!("systemctl {action}"))
}

// ── cron ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CronStatus {
    pub has_crontab: bool,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CronUserTable {
    pub raw: String,
    pub empty: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CronSystemFile {
    pub name: String,
    pub path: String,
}

#[tauri::command]
pub async fn cron_probe(state: State<'_, AppState>, profile_id: String) -> AppResult<CronStatus> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.cron_management, "cron")?;
    let result = exec(
        &state,
        &profile,
        r#"if command -v crontab >/dev/null 2>&1; then
  echo "__HAS_CRONTAB__"
  crontab -l >/dev/null 2>&1 && echo "__USER_OK__" || echo "__USER_EMPTY_OR_ERR__"
else
  echo "__NO_CRONTAB__"
fi
command -v systemctl >/dev/null 2>&1 && systemctl is-active cron 2>/dev/null || systemctl is-active crond 2>/dev/null || true"#,
    )
    .await?;
    let out = combined_output(&result);
    let has = out.contains("__HAS_CRONTAB__");
    Ok(CronStatus {
        has_crontab: has,
        detail: out
            .lines()
            .filter(|l| {
                let t = l.trim();
                !t.is_empty() && !t.starts_with("__")
            })
            .collect::<Vec<_>>()
            .join("\n"),
    })
}

#[tauri::command]
pub async fn cron_user_list(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<CronUserTable> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.cron_management, "cron")?;
    let result = exec(&state, &profile, "crontab -l 2>&1").await?;
    let raw = merge_out(&result);
    let empty = result.exit_code != 0
        || raw.to_ascii_lowercase().contains("no crontab")
        || raw.trim().is_empty();
    Ok(CronUserTable {
        raw: if empty {
            "(no crontab for this user)".into()
        } else {
            raw
        },
        empty,
    })
}

#[tauri::command]
pub async fn cron_system_list(
    state: State<'_, AppState>,
    profile_id: String,
) -> AppResult<Vec<CronSystemFile>> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.cron_management, "cron")?;
    let result = exec(
        &state,
        &profile,
        r#"for d in /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/cron.monthly; do
  if [ -d "$d" ]; then
    for f in "$d"/*; do
      [ -e "$f" ] || continue
      [ -f "$f" ] || continue
      echo "$f"
    done
  fi
done"#,
    )
    .await?;
    let mut out = Vec::new();
    for line in result.stdout.lines() {
        let path = line.trim();
        if path.is_empty() {
            continue;
        }
        let name = path.rsplit('/').next().unwrap_or(path).to_string();
        if name == "*" {
            continue;
        }
        out.push(CronSystemFile {
            name,
            path: path.to_string(),
        });
    }
    Ok(out)
}

#[tauri::command]
pub async fn cron_read_system_file(
    state: State<'_, AppState>,
    profile_id: String,
    path: String,
) -> AppResult<HostSvcCmdResult> {
    let profile = load_flagged_profile(&state, &profile_id, |p| p.cron_management, "cron")?;
    let safe = validate_cron_path(&path)?;
    // Path validated against allow-list; single-quote for the remote shell.
    let quoted = format!("'{}'", safe.replace('\'', "'\\''"));
    let cmd = format!(
        r#"if [ -f {quoted} ]; then sed -n '1,200p' {quoted}; else echo "file not found: {safe}"; exit 1; fi"#
    );
    let result = exec(&state, &profile, &cmd).await?;
    cmd_result(result, "read cron file")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn systemd_parses_plain_line() {
        let u = parse_systemd_unit_line(
            "nginx.service loaded active running A high performance web server",
        )
        .expect("parse");
        assert_eq!(u.name, "nginx.service");
        assert_eq!(u.active, "active");
        assert_eq!(u.sub, "running");
        assert!(u.description.contains("web server"));
    }

    #[test]
    fn systemd_strips_bullet() {
        let u = parse_systemd_unit_line(
            "● ssh.service loaded active running OpenSSH server daemon",
        )
        .expect("parse");
        assert_eq!(u.name, "ssh.service");
    }

    #[test]
    fn systemd_skips_noise() {
        assert!(parse_systemd_unit_line("0 loaded units listed.").is_none());
        assert!(parse_systemd_unit_line("UNIT LOAD ACTIVE SUB DESCRIPTION").is_none());
        assert!(parse_systemd_unit_line("").is_none());
    }

    #[test]
    fn nginx_test_success_markers() {
        let warn_ok = r#"nginx: [warn] the "user" directive makes sense only if the master process runs with super-user privileges
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful"#;
        assert!(nginx_test_succeeded(warn_ok, 1));
        assert!(nginx_test_succeeded(warn_ok, 0));
        assert!(!nginx_test_succeeded("nginx: [emerg] unexpected }", 1));
    }

    #[test]
    fn cron_path_allowlist() {
        assert!(validate_cron_path("/etc/cron.d/backup").is_ok());
        assert!(validate_cron_path("/etc/cron.daily/logrotate").is_ok());
        assert!(validate_cron_path("/etc/passwd").is_err());
        assert!(validate_cron_path("/etc/cron.d/../passwd").is_err());
        assert!(validate_cron_path("cron.d/backup").is_err());
    }
}
