export const CWD_OSC_RE = /\x1b\]7337;cwd=([^\x07\x1b]*)\x07/g;

/** Normalize remote paths for comparison / navigation. */
export function normalizeRemotePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

/** Remote bash helper — base64 avoids $ / escape corruption while typing into the PTY. */
export function buildFollowInject(enable: boolean): string {
  const script = enable
    ? [
        "_sshyar_cwd(){ printf $'\\033]7337;cwd=%s\\007' \"$PWD\"; }",
        'case ";${PROMPT_COMMAND};" in *_sshyar_cwd*) ;; *) PROMPT_COMMAND="_sshyar_cwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}" ;; esac',
        "_sshyar_cwd",
      ].join("\n")
    : [
        'PROMPT_COMMAND="${PROMPT_COMMAND//_sshyar_cwd;/}"',
        'PROMPT_COMMAND="${PROMPT_COMMAND//;_sshyar_cwd/}"',
        'PROMPT_COMMAND="${PROMPT_COMMAND//_sshyar_cwd/}"',
        "unset -f _sshyar_cwd 2>/dev/null",
        "true",
      ].join("\n");

  const b64 = btoa(script);
  // Ctrl+U only (clear line) — never Ctrl+C, that aborts SSH / running commands.
  return `\x15eval "$(printf '%s' '${b64}' | base64 -d 2>/dev/null || printf '%s' '${b64}' | base64 -D 2>/dev/null)"`;
}
