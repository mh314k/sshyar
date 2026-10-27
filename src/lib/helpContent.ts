export type HelpBlock = {
  id: string;
  title: string;
  keywords: string[];
  /** Short bullets — keep each line one idea. */
  steps: string[];
  /** Optional one-line tip shown under the bullets. */
  tip?: string;
};

export type HelpSection = {
  id: string;
  title: string;
  /** One short sentence under the topic title. */
  summary: string;
  keywords: string[];
  blocks: HelpBlock[];
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "start",
    title: "Start here",
    summary: "Connect to a server in under a minute.",
    keywords: ["start", "begin", "first", "quickstart", "overview", "intro"],
    blocks: [
      {
        id: "connect",
        title: "Connect",
        keywords: ["profile", "connect", "new", "ssh"],
        steps: [
          "Click + and fill name, host, port, username, and Password or Key.",
          "Select the profile → Connect (or double-click the row).",
          "Terminal and SFTP open together for that session.",
        ],
        tip: "Optional: set a master password (key icon) so the vault asks to unlock on launch.",
      },
      {
        id: "where",
        title: "Where things live",
        keywords: ["layout", "menu", "activity", "sidebar", "panels"],
        steps: [
          "Menu bar — File / View / Help; click SSHyar for About.",
          "Left activity bar — Profiles, SFTP, plugins, theme, Help (?).",
          "Center — session tabs + terminal / SFTP split.",
          "Right — plugins you enabled (Docker, Nginx, …).",
        ],
      },
      {
        id: "trust",
        title: "What SSHyar does on the server",
        keywords: ["trust", "privacy", "agent", "safe", "footprint"],
        steps: [
          "No agent and no .sshyar folder are installed on the server.",
          "Plugins only run short read commands over your SSH session.",
          "Remote files change only when you upload, edit/save, delete, or install a key.",
        ],
      },
    ],
  },
  {
    id: "profiles",
    title: "Profiles",
    summary: "Saved SSH targets, auth, tunnels, and plugins.",
    keywords: [
      "profile",
      "host",
      "ssh",
      "group",
      "tag",
      "password",
      "key",
      "port forward",
      "tunnel",
      "plugins",
    ],
    blocks: [
      {
        id: "create",
        title: "Create & edit",
        keywords: ["create", "edit", "form", "auth", "group", "tags"],
        steps: [
          "+ for new, or right-click → Edit.",
          "Required: name, host, port (22), username, auth.",
          "Key auth: set the private key path; Password can stay blank to type at connect.",
          "Group and tags organize the sidebar; Save writes to the vault.",
        ],
      },
      {
        id: "connect-actions",
        title: "Connect & actions",
        keywords: ["connect", "external", "copy", "duplicate", "delete"],
        steps: [
          "Connect — tab inside SSHyar.",
          "Open external — your system terminal with the same ssh command.",
          "Copy SSH — paste-ready OpenSSH command.",
          "Duplicate / Delete — clone or remove from the vault (delete asks first).",
        ],
      },
      {
        id: "shell-keepalive",
        title: "Remote shell & keepalive",
        keywords: ["bash", "zsh", "fish", "post-connect", "keepalive"],
        steps: [
          "Remote shell defaults to bash; pick zsh/fish/sh or Server default.",
          "Post-connect runs once before the interactive shell (e.g. cd /var/www).",
          "Keepalive maps to OpenSSH ServerAlive*; 0 turns it off.",
          "Reconnect after changing shell or keepalive — open tabs keep the old command.",
        ],
        tip: "Follow shell (SFTP) works best with bash.",
      },
      {
        id: "forwards",
        title: "Local port forwards",
        keywords: ["port forward", "LocalForward", "-L", "postgres", "redis"],
        steps: [
          "Each row: local port → host:port on the server (often 127.0.0.1).",
          "Presets fill common pairs (HTTP, Postgres, Redis, …).",
          "Tunnels live only while that SSH session is up — reconnect after edits.",
        ],
      },
      {
        id: "keys",
        title: "SSH keys",
        keywords: ["keygen", "ed25519", "install", "authorized_keys"],
        steps: [
          "Generate key — creates ed25519 and sets the private key path.",
          "Install key — puts the public key on the server (uses current auth).",
          "Or point Private key path at a key you already manage.",
        ],
      },
      {
        id: "plugins-enable",
        title: "Session plugins",
        keywords: ["docker", "nginx", "systemd", "cron", "monitor", "plugins"],
        steps: [
          "Under Session plugins, enable Docker, Nginx, systemd, cron, and/or Monitor.",
          "Icons appear on the activity bar after you connect that profile.",
        ],
      },
    ],
  },
  {
    id: "terminal",
    title: "Terminal",
    summary: "Tabs, clipboard, and shortcuts.",
    keywords: ["terminal", "shell", "tab", "copy", "paste", "shortcut"],
    blocks: [
      {
        id: "tabs",
        title: "Sessions & tabs",
        keywords: ["tab", "reconnect", "restore", "local"],
        steps: [
          "Connect opens a tab; + on the tab bar opens a local shell.",
          "Status dot: amber connecting · green connected · red disconnected · grey local.",
          "Reconnect restarts SSH for that profile; × closes the tab.",
          "After relaunch, Restore previous can reopen saved tabs.",
        ],
      },
      {
        id: "clipboard",
        title: "Copy & paste",
        keywords: ["copy", "paste", "ctrl+c", "ctrl+v"],
        steps: [
          "Select text → Ctrl+C / Ctrl+Shift+C to copy (no selection = interrupt).",
          "Paste with Ctrl+V / Ctrl+Shift+V, right-click Paste, or middle-click.",
        ],
      },
      {
        id: "shortcuts",
        title: "Shortcuts",
        keywords: ["ctrl+t", "ctrl+w", "ctrl+tab", "hotkey"],
        steps: [
          "Ctrl+T — new local tab.",
          "Ctrl+W — close active tab.",
          "Ctrl+Tab / Ctrl+Shift+Tab — next / previous tab.",
        ],
      },
    ],
  },
  {
    id: "sftp",
    title: "SFTP",
    summary: "Browse, transfer, edit, and follow the shell path.",
    keywords: ["sftp", "file", "upload", "download", "follow", "edit", "compose"],
    blocks: [
      {
        id: "browse",
        title: "Browse",
        keywords: ["browse", "folder", "sort", "breadcrumb", "select"],
        steps: [
          "Icon grid of the remote folder; double-click folders to enter.",
          "↑ parent · Refresh · breadcrumb jumps · Sort by name or size.",
          "Checkboxes for multi-select; right-click for the same actions as the toolbar.",
        ],
      },
      {
        id: "transfer-edit",
        title: "Transfer & edit",
        keywords: ["upload", "download", "view", "edit", "save"],
        steps: [
          "Upload / Download with a progress bar at the bottom.",
          "View (read-only) or Edit opens the in-app editor; Save writes over SFTP.",
          "Soft limit ~1.5 MB — meant for configs, not huge binaries.",
        ],
      },
      {
        id: "ops",
        title: "Copy, cut, folders",
        keywords: ["copy", "cut", "paste", "mkdir", "rename", "delete", "cd"],
        steps: [
          "Copy / Cut / Paste work on the remote (folders included).",
          "New folder, Rename, Delete — confirm when destructive.",
          "Right-click empty space → cd here in terminal (needs an open session).",
        ],
      },
      {
        id: "follow",
        title: "Follow shell",
        keywords: ["follow", "cwd", "pwd", "bash"],
        steps: [
          "Turn on Follow shell so SFTP tracks the terminal’s working directory.",
          "Needs a bash-style remote shell; otherwise browse manually.",
          "Navigating in SFTP turns Follow off so the list stays where you went.",
        ],
      },
      {
        id: "compose",
        title: "Compose in this folder",
        keywords: ["compose", "docker-compose", "up", "down", "logs"],
        steps: [
          "Needs Docker enabled on the profile.",
          "If the folder has compose.yaml / docker-compose.yml, a Compose bar appears.",
          "Up, Down, Restart, Logs, Ps, and more — jobs show toast + progress.",
        ],
      },
    ],
  },
  {
    id: "docker",
    title: "Docker",
    summary: "Remote containers, images, volumes, networks, and logs.",
    keywords: ["docker", "container", "image", "volume", "network", "logs", "prune"],
    blocks: [
      {
        id: "enable",
        title: "Turn it on",
        keywords: ["enable", "management", "tab"],
        steps: [
          "Profile → Session plugins → Docker → Save → Connect.",
          "Docker icon on the activity bar opens Status / Containers / Images / Volumes / Networks.",
        ],
      },
      {
        id: "status",
        title: "Status & prune",
        keywords: ["status", "df", "prune", "disk"],
        steps: [
          "Shows CLI version and docker system df disk usage.",
          "Safe prune can remove unused images and/or volumes — type PRUNE to confirm.",
          "Never runs system prune -a --volumes.",
        ],
      },
      {
        id: "containers",
        title: "Containers & logs",
        keywords: ["containers", "start", "stop", "logs", "compose"],
        steps: [
          "Grouped by Compose project when labels exist; others under Standalone.",
          "Start / Stop / Restart / Remove; folder icon opens the Compose project in SFTP.",
          "Logs opens a live stream (tail / pause / clear). Escape closes and stops it.",
        ],
      },
      {
        id: "resources",
        title: "Images, volumes, networks",
        keywords: ["images", "volumes", "networks", "remove"],
        steps: [
          "Each tab lists, filters, and can Remove (with confirmation).",
          "Built-in networks bridge / host / none cannot be removed.",
        ],
      },
    ],
  },
  {
    id: "host-tools",
    title: "Host tools",
    summary: "Nginx, systemd, cron, and live Monitor.",
    keywords: ["nginx", "systemd", "cron", "monitor", "sudo", "cpu", "ram"],
    blocks: [
      {
        id: "enable",
        title: "Enable",
        keywords: ["enable", "plugins", "profile"],
        steps: [
          "Profile → Session plugins → check Nginx / systemd / cron / Monitor → Save → Connect.",
          "Click the matching activity-bar icon to open the right panel.",
        ],
      },
      {
        id: "nginx",
        title: "Nginx",
        keywords: ["nginx", "reload", "sites", "edit"],
        steps: [
          "Status + config list (nginx.conf, sites-*, conf.d).",
          "View / Edit use the same full-screen editor as SFTP.",
          "Test / Reload inject sudo into your open terminal — type the sudo password there.",
        ],
        tip: "Those buttons need an open terminal tab for that profile.",
      },
      {
        id: "systemd",
        title: "systemd",
        keywords: ["systemd", "systemctl", "start", "stop"],
        steps: [
          "Lists services with filter; Status runs in the panel.",
          "Start / Stop / Restart inject sudo systemctl into the terminal.",
        ],
      },
      {
        id: "cron",
        title: "cron",
        keywords: ["cron", "crontab", "read-only"],
        steps: [
          "User crontab + system cron.d / daily / hourly / weekly / monthly.",
          "Preview is read-only — edit via terminal or SFTP if you need changes.",
        ],
      },
      {
        id: "monitor",
        title: "Monitor",
        keywords: ["monitor", "cpu", "ram", "disk", "tick"],
        steps: [
          "Live CPU, RAM, swap, load, uptime, and disk bars (Linux).",
          "Tick sets auto-refresh; Charts shows recent CPU/RAM sparklines.",
        ],
      },
    ],
  },
  {
    id: "snippets",
    title: "Snippets",
    summary: "Saved commands you inject into the active terminal.",
    keywords: ["snippet", "zap", "macro", "command"],
    blocks: [
      {
        id: "use",
        title: "Create & run",
        keywords: ["add", "run", "inject"],
        steps: [
          "Zap icon → add a name and command text.",
          "Run injects into the active tab (opens a local tab if none exist).",
          "Stored in the same encrypted vault as profiles.",
        ],
        tip: "Write for the shell you’re in (remote bash vs local PowerShell).",
      },
    ],
  },
  {
    id: "vault",
    title: "Vault & security",
    summary: "Encryption, master password, and portable backups.",
    keywords: ["vault", "password", "lock", "backup", "export", "import", "dpapi"],
    blocks: [
      {
        id: "how",
        title: "How it works",
        keywords: ["aes", "encrypt", "argon2"],
        steps: [
          "Profiles, passwords, and snippets are AES-GCM encrypted on disk.",
          "No master password → Windows DPAPI wraps the key for this user.",
          "With a master password → Argon2 unlock after launch or Lock.",
        ],
      },
      {
        id: "master",
        title: "Master password",
        keywords: ["master", "set", "change", "remove", "lock"],
        steps: [
          "Key icon — set, change, or remove the master password.",
          "Lock (File menu / activity bar) stops sessions and shows the unlock screen.",
          "Lock only appears when a master password is set.",
        ],
      },
      {
        id: "backup",
        title: "Backup export & import",
        keywords: ["backup", "export", "import", "migrate"],
        steps: [
          "Export backup — choose a backup password, save .sshyar-backup (portable).",
          "Import — Replace everything or Merge (matching ids overwrite).",
          "Use this to move PCs or recover if you still have the backup file.",
        ],
      },
      {
        id: "hosts",
        title: "Host keys",
        keywords: ["known_hosts", "fingerprint"],
        steps: [
          "OpenSSH StrictHostKeyChecking=accept-new on first connect.",
          "Unexpected host-key changes on shared networks deserve a second look.",
        ],
      },
    ],
  },
  {
    id: "theme-updates",
    title: "Theme & updates",
    summary: "Appearance and downloading new releases.",
    keywords: ["theme", "dark", "light", "about", "update", "version", "github"],
    blocks: [
      {
        id: "theme",
        title: "Theme",
        keywords: ["theme", "sun", "moon"],
        steps: [
          "Sun / Moon toggles dark and light; remembered for next launch.",
          "Terminal colors follow the theme.",
        ],
      },
      {
        id: "about",
        title: "About & updates",
        keywords: ["about", "update", "download", "release"],
        steps: [
          "Open About from the SSHyar brand, or Help → About.",
          "After unlock, SSHyar checks GitHub in the background.",
          "Toast + teal badge on the brand / Help mean a newer version is out.",
          "In About: Download for your OS, or open the release page.",
        ],
      },
      {
        id: "this-help",
        title: "This Help",
        keywords: ["help", "search"],
        steps: [
          "Open with ? · Escape or click outside to close.",
          "Pick a topic on the left, or search to filter topics and tips.",
        ],
      },
    ],
  },
  {
    id: "fix",
    title: "Fix problems",
    summary: "Quick answers when something fails.",
    keywords: [
      "error",
      "timeout",
      "troubleshoot",
      "fix",
      "docker",
      "sftp",
      "vault",
      "sudo",
    ],
    blocks: [
      {
        id: "connect",
        title: "Connection",
        keywords: ["timeout", "refused", "auth", "host"],
        steps: [
          "Timed out — check VPN, IP, port, firewall.",
          "Refused — nothing listening on that port.",
          "Host not found — DNS or typo.",
          "Auth failed — wrong user, password, or key path.",
        ],
      },
      {
        id: "paste",
        title: "Copy / paste",
        keywords: ["paste", "clipboard"],
        steps: [
          "Click inside the terminal first.",
          "Try Ctrl+V, right-click Paste, or middle-click.",
        ],
      },
      {
        id: "vault",
        title: "Vault",
        keywords: ["password", "forgot", "locked"],
        steps: [
          "Wrong master password — no in-app reset without it or a backup.",
          "Forgot it — Import a .sshyar-backup, or start fresh.",
          "Moving PCs — Export backup first (DPAPI is machine/user-bound).",
        ],
      },
      {
        id: "sftp",
        title: "SFTP / Follow",
        keywords: ["sftp", "follow", "permission"],
        steps: [
          "Needs a live SSH session — reconnect if the channel dropped.",
          "Permission denied — your SSH user can’t access that path.",
          "Follow not updating — use bash remote shell, or browse with Follow off.",
        ],
      },
      {
        id: "plugins",
        title: "Docker & host tools",
        keywords: ["docker", "nginx", "systemd", "sudo", "tab missing"],
        steps: [
          "Missing tab — enable the plugin on the profile, Save, reconnect.",
          "Docker “not installed” — no docker on PATH for that SSH user.",
          "Nginx/systemd actions disabled — open a terminal tab for that profile first.",
          "sudo password prompt in the terminal is expected — type it there.",
        ],
      },
    ],
  },
];

export function filterHelpSections(query: string): HelpSection[] {
  const q = query.trim().toLowerCase();
  if (!q) return HELP_SECTIONS;

  const tokens = q.split(/\s+/).filter(Boolean);

  return HELP_SECTIONS.map((section) => {
    const sectionHit = tokens.every(
      (t) =>
        section.title.toLowerCase().includes(t) ||
        section.summary.toLowerCase().includes(t) ||
        section.keywords.some((k) => k.includes(t)),
    );

    const blocks = section.blocks.filter((block) => {
      if (sectionHit) return true;
      const hay = [block.title, ...block.keywords, ...block.steps, block.tip ?? ""]
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });

    if (!blocks.length && !sectionHit) return null;
    return { ...section, blocks: sectionHit ? section.blocks : blocks };
  }).filter((s): s is HelpSection => s !== null);
}
