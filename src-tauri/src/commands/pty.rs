use serde::Serialize;
use std::process::Command;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::ssh_cmd;
use crate::state::{find_profile, AppState};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionCreated {
    pub session_id: String,
}

#[tauri::command]
pub fn pty_create(
    app: tauri::AppHandle,
    state: State<AppState>,
    cols: u16,
    rows: u16,
    profile_id: Option<String>,
) -> AppResult<SessionCreated> {
    let initial = if let Some(pid) = profile_id {
        let v = state.vault.lock();
        let p = find_profile(&v, &pid)?;
        Some(ssh_cmd::embed_connect_command(p))
    } else {
        None
    };
    let session_id = state.pty.create(app, cols, rows, initial)?;
    Ok(SessionCreated { session_id })
}

#[tauri::command]
pub fn pty_write(state: State<AppState>, session_id: String, data: String) -> AppResult<()> {
    state.pty.write(&session_id, &data)
}

#[tauri::command]
pub fn pty_resize(state: State<AppState>, session_id: String, cols: u16, rows: u16) -> AppResult<()> {
    state.pty.resize(&session_id, cols, rows)
}

#[tauri::command]
pub fn pty_kill(state: State<AppState>, session_id: String) -> AppResult<()> {
    state.pty.kill(&session_id)
}

#[tauri::command]
pub fn pty_inject(state: State<AppState>, session_id: String, command: String) -> AppResult<()> {
    let data = if command.ends_with('\n') || command.ends_with('\r') {
        command
    } else {
        #[cfg(windows)]
        {
            format!("{command}\r")
        }
        #[cfg(not(windows))]
        {
            format!("{command}\n")
        }
    };
    state.pty.write(&session_id, &data)
}

#[tauri::command]
pub fn open_external_ssh(state: State<AppState>, profile_id: String) -> AppResult<()> {
    let v = state.vault.lock();
    let p = find_profile(&v, &profile_id)?;
    let cmd_line = ssh_cmd::build_ssh_command_line(p);
    drop(v);

    #[cfg(windows)]
    {
        open_external_windows(&cmd_line)
    }

    #[cfg(unix)]
    {
        open_external_unix(&cmd_line)
    }

    #[cfg(not(any(windows, unix)))]
    {
        let _ = cmd_line;
        Err(AppError::msg("External terminal is not supported on this platform"))
    }
}

#[cfg(windows)]
fn open_external_windows(cmd_line: &str) -> AppResult<()> {
    if which::which("wt").is_ok() {
        if Command::new("wt")
            .args(["-w", "0", "nt", "powershell", "-NoExit", "-Command", cmd_line])
            .spawn()
            .is_ok()
        {
            return Ok(());
        }
    }

    let shell = which::which("pwsh")
        .or_else(|_| which::which("powershell"))
        .map_err(|_| AppError::msg("PowerShell not found"))?;

    Command::new(shell)
        .args(["-NoExit", "-Command", cmd_line])
        .spawn()
        .map_err(|e| AppError::msg(format!("Failed to open external shell: {e}")))?;
    Ok(())
}

#[cfg(unix)]
fn open_external_unix(cmd_line: &str) -> AppResult<()> {
    // Stay interactive after SSH exits.
    let script = format!("{cmd_line}; exec bash -l");

    // Prefer modern helpers, then common desktop terminals.
    if which::which("xdg-terminal-exec").is_ok() {
        if Command::new("xdg-terminal-exec")
            .args(["bash", "-lc", &script])
            .spawn()
            .is_ok()
        {
            return Ok(());
        }
    }

    let attempts: &[(&str, Vec<&str>)] = &[
        ("gnome-terminal", vec!["--", "bash", "-lc"]),
        ("kgx", vec!["--", "bash", "-lc"]),
        ("konsole", vec!["-e", "bash", "-lc"]),
        ("xfce4-terminal", vec!["-e", "bash", "-lc"]),
        ("mate-terminal", vec!["--", "bash", "-lc"]),
        ("tilix", vec!["-e", "bash", "-lc"]),
        ("kitty", vec!["bash", "-lc"]),
        ("alacritty", vec!["-e", "bash", "-lc"]),
        ("wezterm", vec!["start", "--", "bash", "-lc"]),
        ("x-terminal-emulator", vec!["-e", "bash", "-lc"]),
    ];

    for (bin, prefix) in attempts {
        if which::which(bin).is_err() {
            continue;
        }
        let mut args: Vec<&str> = prefix.clone();
        args.push(&script);
        if Command::new(bin).args(&args).spawn().is_ok() {
            return Ok(());
        }
    }

    Err(AppError::msg(
        "No terminal emulator found. Install gnome-terminal, konsole, kitty, or x-terminal-emulator.",
    ))
}
