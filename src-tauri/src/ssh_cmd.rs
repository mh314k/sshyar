use crate::profiles::{AuthMethod, Profile};

/// Build the OpenSSH client command line (without the `ssh` binary name).
pub fn build_ssh_args(profile: &Profile) -> Vec<String> {
    let mut args = Vec::new();

    if profile.keepalive_interval > 0 {
        args.push("-o".into());
        args.push(format!("ServerAliveInterval={}", profile.keepalive_interval));
        args.push("-o".into());
        args.push(format!(
            "ServerAliveCountMax={}",
            profile.keepalive_count_max.max(1)
        ));
    }

    args.push("-o".into());
    args.push("StrictHostKeyChecking=accept-new".into());

    if profile.auth_method == AuthMethod::Key {
        if let Some(key) = &profile.private_key_path {
            if !key.is_empty() {
                args.push("-i".into());
                args.push(key.clone());
            }
        }
    }

    args.push("-p".into());
    args.push(profile.port.to_string());

    let target = format!("{}@{}", profile.username, profile.host);
    let post = profile.post_connect_command.trim();
    let remote_cmd = build_remote_command(post, &profile.remote_shell);

    if let Some(remote) = remote_cmd {
        args.push("-t".into());
        args.push(target);
        // Avoid $SHELL: PowerShell expands $vars before ssh sees them.
        args.push(remote);
    } else {
        args.push(target);
    }

    args
}

/// Interactive remote command: optional post-connect, then preferred shell.
/// Returns None when neither post-connect nor a forced shell is set (server default).
fn build_remote_command(post: &str, remote_shell: &str) -> Option<String> {
    let exec = shell_exec(remote_shell);
    match (post.is_empty(), exec.as_deref()) {
        (true, None) => None,
        (true, Some(ex)) => Some(ex.to_string()),
        (false, None) => Some(format!("{post}; exec bash -l")),
        (false, Some(ex)) => Some(format!("{post}; {ex}")),
    }
}

fn shell_exec(remote_shell: &str) -> Option<String> {
    let s = remote_shell.trim();
    if s.is_empty() || s.eq_ignore_ascii_case("default") {
        return None;
    }
    // Already a full command (user typed args) — just exec it.
    if s.contains(char::is_whitespace) {
        return Some(format!("exec {s}"));
    }
    // Common shells: request a login shell.
    match s {
        "bash" | "zsh" | "fish" | "sh" | "dash" | "ksh" => Some(format!("exec {s} -l")),
        other => Some(format!("exec {other} -l")),
    }
}

pub fn build_ssh_command_line(profile: &Profile) -> String {
    let args = build_ssh_args(profile);
    let mut parts = vec!["ssh".to_string()];
    for a in args {
        parts.push(powershell_quote(&a));
    }
    parts.join(" ")
}

/// Quote for PowerShell so `$VAR` is never expanded (use single quotes).
fn powershell_quote(s: &str) -> String {
    if s.is_empty() {
        return "''".into();
    }
    if s.chars()
        .all(|c| c.is_ascii_alphanumeric() || "-_./:@=".contains(c))
    {
        return s.to_string();
    }
    // PowerShell single-quoted string: escape ' as ''
    format!("'{}'", s.replace('\'', "''"))
}

/// Command to type into an already-open PowerShell session.
pub fn embed_connect_command(profile: &Profile) -> String {
    build_ssh_command_line(profile)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profiles::Profile;

    #[test]
    fn post_connect_avoids_shell_var_and_uses_ps_quotes() {
        let mut p = Profile::new("t".into(), "1.2.3.4".into(), "u".into());
        p.post_connect_command = "ls -la".into();
        p.remote_shell = "bash".into();
        let cmd = build_ssh_command_line(&p);
        assert!(cmd.contains("exec bash -l"), "{cmd}");
        assert!(!cmd.contains("$SHELL"), "{cmd}");
        assert!(cmd.contains("'ls -la; exec bash -l'"), "{cmd}");
    }

    #[test]
    fn respects_zsh_shell() {
        let mut p = Profile::new("t".into(), "1.2.3.4".into(), "u".into());
        p.remote_shell = "zsh".into();
        let cmd = build_ssh_command_line(&p);
        assert!(cmd.contains("exec zsh -l"), "{cmd}");
    }

    #[test]
    fn empty_shell_uses_server_default() {
        let mut p = Profile::new("t".into(), "1.2.3.4".into(), "u".into());
        p.remote_shell = String::new();
        let args = build_ssh_args(&p);
        assert_eq!(args.last().map(String::as_str), Some("u@1.2.3.4"));
        assert!(!args.iter().any(|a| a == "-t"));
    }
}
