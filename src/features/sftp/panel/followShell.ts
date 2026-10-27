export const CWD_OSC_RE = /\x1b\]7337;cwd=([^\x07\x1b]*)\x07/g;

/** Follow inject uses bash PROMPT_COMMAND — only enable for bash-compatible shells. */
export function isFollowShellSupported(remoteShell: string | undefined | null): boolean {
  const s = (remoteShell ?? "bash").trim().toLowerCase();
  if (!s || s === "default" || s === "server" || s === "server default") return true;
  return s === "bash" || s.endsWith("/bash") || s.includes("bash");
}

/** Normalize remote paths for comparison / navigation. */
export function normalizeRemotePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

const CWD_FN = "__cwd_osc";
/** Previous inject name — strip if an older SSHyar session left it in PROMPT_COMMAND. */
const LEGACY_CWD_FN = "_sshyar_cwd";

function stripPromptFn(name: string): string[] {
  return [
    `PROMPT_COMMAND="\${PROMPT_COMMAND//${name};/}"`,
    `PROMPT_COMMAND="\${PROMPT_COMMAND//;${name}/}"`,
    `PROMPT_COMMAND="\${PROMPT_COMMAND//${name}/}"`,
    `unset -f ${name} 2>/dev/null`,
  ];
}

/**
 * Session-only bash helper for Follow shell.
 * - Never writes files on the remote host.
 * - Generic function name (no product brand in the remote shell).
 * - Leading space so HISTCONTROL=ignorespace skips the inject line in history.
 */
export function buildFollowInject(enable: boolean): string {
  const script = enable
    ? [
        ...stripPromptFn(LEGACY_CWD_FN),
        `${CWD_FN}(){ printf $'\\033]7337;cwd=%s\\007' \"$PWD\"; }`,
        `case ";\${PROMPT_COMMAND};" in *${CWD_FN}*) ;; *) PROMPT_COMMAND="${CWD_FN}\${PROMPT_COMMAND:+;$PROMPT_COMMAND}" ;; esac`,
        CWD_FN,
      ].join("\n")
    : [
        ...stripPromptFn(CWD_FN),
        ...stripPromptFn(LEGACY_CWD_FN),
        "true",
      ].join("\n");

  const b64 = btoa(script);
  // Ctrl+U only (clear line) — never Ctrl+C, that aborts SSH / running commands.
  // Leading space: avoid ~/.bash_history when HISTCONTROL includes ignorespace.
  return ` \x15eval "$(printf '%s' '${b64}' | base64 -d 2>/dev/null || printf '%s' '${b64}' | base64 -D 2>/dev/null)"`;
}
