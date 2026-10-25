import { simpleMode } from "@codemirror/legacy-modes/mode/simple-mode";

/** Lightweight highlighting for common server log lines. */
export const logMode = simpleMode({
  start: [
    {
      regex: /^(?:\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/,
      token: "number",
    },
    {
      regex: /^(?:[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/,
      token: "number",
    },
    {
      regex: /\b(?:ERROR|FATAL|CRITICAL|PANIC|ERR)\b/i,
      token: "error",
    },
    {
      regex: /\b(?:WARN(?:ING)?|WRN)\b/i,
      token: "keyword",
    },
    {
      regex: /\b(?:INFO|INFORMATION|INF|NOTICE)\b/i,
      token: "meta",
    },
    {
      regex: /\b(?:DEBUG|DBG|TRACE|TRC|VERBOSE)\b/i,
      token: "comment",
    },
    {
      regex: /\b(?:\d{1,3}(?:\.\d{1,3}){3})(?::\d{1,5})?\b/,
      token: "atom",
    },
    {
      regex: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
      token: "string",
    },
    { regex: /"[^"]*"|'[^']*'/, token: "string" },
    { regex: /\b\d+\b/, token: "number" },
  ],
});

/** Keywords common in sshd_config / ssh_config. */
export const sshConfigMode = simpleMode({
  start: [
    { regex: /#.*/, token: "comment" },
    {
      regex:
        /^(?:Host|Match|Port|ListenAddress|PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|AuthorizedKeysFile|AllowUsers|DenyUsers|AllowGroups|DenyGroups|ChallengeResponseAuthentication|UsePAM|X11Forwarding|ClientAliveInterval|ClientAliveCountMax|MaxAuthTries|MaxSessions|Subsystem|HostKey|Include|SyslogFacility|LogLevel|Protocol|AddressFamily|TCPKeepAlive|AllowTcpForwarding|GatewayPorts|PermitTunnel|Banner|PrintMotd|AcceptEnv|KbdInteractiveAuthentication|AuthenticationMethods|StrictModes|IgnoreRhosts|HostbasedAuthentication|PermitEmptyPasswords|LoginGraceTime|RekeyLimit)\b/i,
      token: "keyword",
    },
    {
      regex:
        /^(?:HostName|User|IdentityFile|IdentitiesOnly|ForwardAgent|ForwardX11|ProxyJump|ProxyCommand|LocalForward|RemoteForward|DynamicForward|ServerAliveInterval|ServerAliveCountMax|StrictHostKeyChecking|UserKnownHostsFile|GlobalKnownHostsFile|Compression|Ciphers|MACs|KexAlgorithms|PreferredAuthentications|RequestTTY|RemoteCommand|ControlMaster|ControlPath|ControlPersist|AddKeysToAgent)\b/i,
      token: "keyword",
    },
    { regex: /\b(?:yes|no|any|all|none|prohibit-password|without-password|forced-commands-only)\b/i, token: "atom" },
    { regex: /\d+/, token: "number" },
    { regex: /"[^"]*"/, token: "string" },
    { regex: /\S+/, token: "variable" },
  ],
});

/** Ansible-ish YAML playbooks still use YAML grammar; badge is separate. */
export function isAnsiblePath(path: string): boolean {
  const p = path.replace(/\\/g, "/").toLowerCase();
  const base = p.split("/").pop() || "";
  if (base === "ansible.cfg" || base === "inventory" || base === "hosts") return true;
  if (base.startsWith("playbook") && (base.endsWith(".yml") || base.endsWith(".yaml"))) return true;
  if (base === "site.yml" || base === "site.yaml" || base === "main.yml" || base === "main.yaml") {
    return /\/(?:roles|tasks|handlers|group_vars|host_vars|playbooks)\//.test(p) || base.startsWith("site.");
  }
  if (/\/(?:roles|tasks|handlers|group_vars|host_vars|playbooks)\//.test(p)) {
    return base.endsWith(".yml") || base.endsWith(".yaml");
  }
  return false;
}
