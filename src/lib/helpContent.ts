export type HelpBlock = {
  id: string;
  title: string;
  keywords: string[];
  steps: string[];
  tip?: string;
};

export type HelpSection = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  blocks: HelpBlock[];
};

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "start",
    title: "Start here",
    summary: "What SSHyar is and how to connect in the first minute.",
    keywords: ["start", "begin", "first", "quickstart", "overview", "intro", "layout"],
    blocks: [
      {
        id: "what",
        title: "What is SSHyar?",
        keywords: ["what", "ssh", "desktop", "windows", "linux"],
        steps: [
          "SSHyar is a desktop SSH helper for Windows and Linux: encrypted profiles, an embedded terminal wrapping OpenSSH, graphical SFTP, optional session plugins, and snippets.",
          "Day-to-day server work stays in one window — connect, browse files, check services, edit configs, reuse commands — without installing anything on the host.",
        ],
      },
      {
        id: "connect",
        title: "First connection",
        keywords: ["profile", "connect", "new", "ssh", "quickstart"],
        steps: [
          "Click + in the profiles sidebar and fill name, host/IP, port (default 22), username, and Password or Key auth.",
          "Pick a Remote shell if the server should not use its passwd default (bash is the usual choice).",
          "Select the profile → Connect (or double-click the row / right-click → Connect).",
          "A session tab opens with the terminal; SFTP appears in the center split for that same session.",
          "Optional: open the key icon and set a master password so the next launch asks you to unlock the vault.",
        ],
        tip: "Open Help anytime with ? on the activity bar, or Help → Help in the menu. Drag the title bar to move this window; the corner resizes it.",
      },
      {
        id: "where",
        title: "Window layout",
        keywords: ["layout", "menu", "activity", "sidebar", "panels", "status"],
        steps: [
          "Menu bar — File / View / Help; click the SSHyar brand for About. Drag empty menubar space to move the app window; min / max / close sit on the right.",
          "Activity bar (far left) — Profiles, SFTP, then one icon per enabled session plugin, plus theme and Help at the bottom. Lock appears only when a master password is set.",
          "Left sidebar — search and grouped profiles, with snippets / vault / new profile controls.",
          "Center — session tabs and a resizable terminal ↔ SFTP split (Terminal first or SFTP first from View).",
          "Right panel — Docker, Nginx, systemd, cron, or Monitor when enabled on the connected profile.",
          "Status bar — connection state, active host, layout mode, and version. Drag splitters to resize; widths are remembered.",
        ],
      },
      {
        id: "trust",
        title: "Trust & remote footprint",
        keywords: ["trust", "privacy", "agent", "safe", "footprint", "write"],
        steps: [
          "SSHyar never installs an agent, helper binary, or hidden .sshyar folder on the server.",
          "Plugins use your normal SSH session and only run short commands (e.g. docker ps, systemctl, /proc, nginx -v). Nothing is left behind after the command finishes.",
          "Monitor, cron preview, status lists, and SFTP browse/View/download are read-only.",
          "Remote files change only when you start the action: SFTP upload/mkdir/rename/delete/copy/move, Edit → Save, or Install public key.",
          "Docker / Nginx / systemd controls change services only when you click them (or inject into the terminal); they do not drop scripts on disk.",
          "Follow shell keeps a tiny helper in the current shell session only — no remote files.",
        ],
        tip: "Normal SSH still leaves OS login/auth log lines on the server; that is not an SSHyar artifact.",
      },
    ],
  },
  {
    id: "profiles",
    title: "Profiles",
    summary: "SSH targets with auth, shell, tunnels, keepalive, and session plugins.",
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
        title: "Create and edit",
        keywords: ["create", "edit", "form", "auth", "group", "tags", "notes"],
        steps: [
          "Click + for a new profile, or right-click a profile → Edit (also under Actions when selected).",
          "Double-click a row to connect quickly (a hint appears on hover).",
          "Required fields: name, host, port (default 22), username, and auth method.",
          "Password auth — store the password in the vault, or leave blank to type when OpenSSH prompts.",
          "Key auth — set the private key path (e.g. C:\\Users\\…\\.ssh\\id_ed25519).",
          "Group organizes the sidebar; Tags (comma-separated) are searchable. Notes are free-form reminders.",
          "Save writes into the encrypted vault immediately.",
        ],
      },
      {
        id: "connect-actions",
        title: "Find, connect, and actions",
        keywords: ["search", "connect", "external", "copy", "duplicate", "delete"],
        steps: [
          "Search filters by name, host, tag, or group. Click a row to select; click again to deselect.",
          "Right-click (or Actions): Connect, Open external, Copy SSH, Edit, Duplicate, Generate key, Install key, Delete.",
          "Connect — embedded terminal session in a new tab.",
          "Open external — launches your system terminal with the same ssh command line.",
          "Copy SSH — copies a ready-to-paste OpenSSH command quoted for your local shell.",
          "Duplicate clones the profile (new id, name with “(copy)”). Delete asks for confirmation first.",
        ],
      },
      {
        id: "shell-keepalive",
        title: "Remote shell, post-connect & keepalive",
        keywords: ["bash", "zsh", "fish", "post-connect", "keepalive", "ServerAlive"],
        steps: [
          "Remote shell defaults to bash (login shell via ssh -t … exec bash -l).",
          "Choose zsh, fish, sh, dash, Server default (no forced shell), or a Custom path.",
          "Post-connect command runs once after SSH is up (example: cd /var/www && sudo -i), then the chosen shell is exec’d.",
          "Keepalive interval / count map to OpenSSH ServerAliveInterval and ServerAliveCountMax. Set interval to 0 to disable.",
          "Reconnect after changing shell or keepalive — existing tabs keep the old SSH command.",
        ],
        tip: "Follow shell (SFTP) works best with bash-style PROMPT_COMMAND; other shells may not update the path automatically.",
      },
      {
        id: "forwards",
        title: "Local port forwards",
        keywords: ["port forward", "LocalForward", "-L", "postgres", "redis", "mysql", "mongo"],
        steps: [
          "In the profile form, Local port forwards adds OpenSSH -L tunnels for Connect, Open external, and Copy SSH.",
          "Each row is local port → remote host:remote port (remote host defaults to 127.0.0.1 on the server).",
          "Presets (HTTP, HTTPS, Postgres, MySQL, Redis, Mongo) fill common pairs; skip if that local port is already listed.",
          "Example: local 5432 → 127.0.0.1:5432 lets a local DB client use localhost:5432 while SSH is up.",
          "Forwards last only while that SSH session is connected. Reconnect after editing them.",
        ],
      },
      {
        id: "keys",
        title: "SSH keys",
        keywords: ["keygen", "ed25519", "install", "authorized_keys"],
        steps: [
          "Generate key creates an ed25519 key pair for that profile and sets the private key path.",
          "Install key connects with the profile’s current auth (often password) and installs the public key on the server.",
          "You can still point Private key path at an existing key you manage yourself.",
          "After switching a profile to Key auth, Connect uses -i with that path.",
        ],
      },
      {
        id: "plugins-enable",
        title: "Session plugins",
        keywords: ["docker", "nginx", "systemd", "cron", "monitor", "plugins"],
        steps: [
          "Under Session plugins, enable Docker, Nginx, systemd, cron, and/or Monitor, then Save.",
          "After you Connect that profile, matching icons appear on the activity bar and open the right panel.",
          "Duplicate copies plugin flags along with the rest of the profile.",
        ],
      },
    ],
  },
  {
    id: "terminal",
    title: "Terminal",
    summary: "Embedded PTY, tabs, clipboard, restore, and shortcuts.",
    keywords: ["terminal", "shell", "tab", "copy", "paste", "shortcut", "powershell"],
    blocks: [
      {
        id: "how",
        title: "How it works",
        keywords: ["conpty", "powershell", "bash", "openssh", "pty"],
        steps: [
          "On Windows, SSHyar opens PowerShell in a ConPTY, then runs the OpenSSH client for profile sessions.",
          "On Linux, it opens your login shell ($SHELL) in a PTY and runs the same OpenSSH client.",
          "Local tabs are a plain interactive shell without SSH.",
          "Output streams into xterm.js; your keystrokes go to the PTY.",
        ],
      },
      {
        id: "tabs",
        title: "Sessions and tabs",
        keywords: ["tab", "reconnect", "restore", "local", "status"],
        steps: [
          "Connect (or New Terminal / empty-state button) opens a center tab.",
          "Tab bar + creates a local terminal; × closes the tab and kills that PTY.",
          "Status dot: amber (connecting), green (connected), red (disconnected), grey (local). Hover a tab for status · user@host:port.",
          "Reconnect (rotate icon) kills the old PTY and starts a fresh SSH session for that profile.",
          "Open tabs are remembered locally. After relaunch with an empty tab bar, Restore previous can reopen them; Dismiss clears the offer.",
        ],
      },
      {
        id: "clipboard",
        title: "Copy and paste",
        keywords: ["copy", "paste", "ctrl+c", "ctrl+v", "middle click"],
        steps: [
          "Select text, then Ctrl+C or Ctrl+Shift+C to copy. With no selection, Ctrl+C is the interrupt (SIGINT).",
          "Paste with Ctrl+V or Ctrl+Shift+V (line endings normalized for the PTY).",
          "Right-click: Copy, Paste, Select all, Clear scrollback.",
          "Middle-click pastes (classic X11-style habit).",
        ],
      },
      {
        id: "shortcuts",
        title: "Keyboard shortcuts",
        keywords: ["ctrl+t", "ctrl+w", "ctrl+tab", "hotkey"],
        steps: [
          "Ctrl+T — new local terminal tab.",
          "Ctrl+W — close the active tab.",
          "Ctrl+Tab / Ctrl+Shift+Tab — cycle forward / backward through tabs.",
        ],
      },
    ],
  },
  {
    id: "sftp",
    title: "SFTP",
    summary: "Browse, transfer, edit, follow the shell cwd, and Compose controls.",
    keywords: ["sftp", "file", "upload", "download", "follow", "edit", "compose"],
    blocks: [
      {
        id: "open",
        title: "Opening the panel",
        keywords: ["panel", "split", "toggle", "connect"],
        steps: [
          "Connecting to a profile opens SFTP in the main split with the terminal for that session tab.",
          "Use the activity bar or View menu to show or hide SFTP; widths and split ratios are remembered.",
          "Enabled session plugins open in the right panel, separate from SFTP.",
        ],
      },
      {
        id: "browse",
        title: "Browse and select",
        keywords: ["browse", "folder", "sort", "breadcrumb", "select", "checkbox"],
        steps: [
          "Files appear as an icon grid for the remote cwd; double-click a folder to enter it.",
          "Long names truncate; select a tile to expand the full name.",
          "↑ goes to the parent directory; Refresh reloads the listing.",
          "Click a path segment in the breadcrumb to jump up; use the copy icon for the full path.",
          "Sort by Name / Size and the direction button (A–Z or size). Folders stay first.",
          "Checkboxes support multi-select for bulk download, delete, copy, or cut. Right-click matches the toolbar.",
        ],
      },
      {
        id: "transfer-edit",
        title: "Transfer, view, and edit",
        keywords: ["upload", "download", "view", "edit", "save", "codemirror"],
        steps: [
          "Upload picks local files into the current remote folder (batch supported).",
          "Download saves selected remote file(s) via a save dialog.",
          "A bottom transfer bar shows per-file and overall progress for uploads, copies, moves, and deletes.",
          "View (read-only) or Edit opens the in-app CodeMirror editor with syntax highlighting by extension.",
          "Save writes the buffer back over SFTP. Soft size limit ~1.5 MB — meant for config-style files.",
        ],
      },
      {
        id: "ops",
        title: "Copy, cut, folders, and cd",
        keywords: ["copy", "cut", "paste", "mkdir", "rename", "delete", "cd"],
        steps: [
          "Copy / Cut place entries on the SFTP clipboard; Paste applies them in the current folder (move if cut).",
          "Folder copy pastes the whole tree into the current directory.",
          "New folder, Rename, and Delete are on the toolbar and context menu; destructive actions ask first.",
          "Right-click empty space → cd here in terminal — injects cd into the linked terminal tab (needs an open session).",
        ],
      },
      {
        id: "follow",
        title: "Follow shell",
        keywords: ["follow", "cwd", "pwd", "bash", "prompt"],
        steps: [
          "Check Follow shell to keep SFTP cwd synced with the linked terminal’s working directory.",
          "Requires a bash-compatible Remote shell on the profile (PROMPT_COMMAND). For zsh/fish the control stays disabled — browse manually.",
          "Injects a session-only shell helper (no remote files) that emits an OSC cwd sequence.",
          "Browsing in SFTP (open folder, Up, breadcrumbs) turns Follow off so the list stays where you navigated.",
          "Toggle Follow back on when you want the shell to drive the path again.",
        ],
      },
      {
        id: "compose",
        title: "Docker Compose in this folder",
        keywords: ["compose", "docker-compose", "up", "down", "logs", "ps"],
        steps: [
          "Requires Docker management enabled on the profile.",
          "When the folder contains compose.yaml, compose.yml, docker-compose.yml, or docker-compose.yaml, a Compose bar appears under the toolbar.",
          "Actions: Up (up -d), Down (confirm), Restart, Recreate, Build, Pull, Logs, and Ps.",
          "Logs opens the same live logs popup as Containers. Jobs show toast + progress in the right panel.",
        ],
      },
    ],
  },
  {
    id: "docker",
    title: "Docker",
    summary: "Remote containers, images, volumes, networks, prune, and live logs.",
    keywords: ["docker", "container", "image", "volume", "network", "logs", "prune", "compose"],
    blocks: [
      {
        id: "enable",
        title: "Enable on a profile",
        keywords: ["enable", "management", "tab"],
        steps: [
          "Edit the profile → Session plugins → Docker → Save.",
          "Connect — Docker icon on the activity bar opens Status, Containers, Images, Volumes, and Networks.",
          "While Docker is active for the connected profile, SSHyar keeps a pooled SSH session so lists and actions reuse one connection.",
        ],
      },
      {
        id: "status",
        title: "Status and safe prune",
        keywords: ["status", "df", "prune", "disk", "version"],
        steps: [
          "Status probes docker --version and shows whether Docker is installed.",
          "Disk usage runs docker system df (type, total, active, size, reclaimable).",
          "Safe prune can remove unused images (image prune -a) and/or unused volumes — never system prune -a --volumes.",
          "Before deleting, SSHyar lists what would be removed; you must type PRUNE to confirm.",
          "Prune jobs show toast + progress; Refresh updates version and disk usage.",
        ],
      },
      {
        id: "containers",
        title: "Containers and live logs",
        keywords: ["containers", "start", "stop", "logs", "compose", "filter"],
        steps: [
          "Lists all containers (docker ps -a), grouped by Compose project when labels exist; others under Standalone.",
          "Rows show name, state, image, ports, and Compose service. Filter by text and All / Running / Stopped chips.",
          "Actions: Logs, Start, Stop, Restart, Remove (force rm, with confirmation).",
          "Compose groups with a working_dir label get a folder icon that opens that project in SFTP.",
          "Logs streams docker logs -f (or compose logs -f). Tail / Pause / Clear / Scroll to bottom. Escape stops the stream.",
        ],
      },
      {
        id: "resources",
        title: "Images, volumes, networks",
        keywords: ["images", "volumes", "networks", "remove"],
        steps: [
          "Images — repository:tag, size, created; filter; Remove runs docker rmi (confirm).",
          "Volumes — name, driver, mountpoint; Remove runs docker volume rm (confirm).",
          "Networks — name, driver, scope; filter All / Custom / Built-in. Built-in bridge / host / none cannot be removed.",
          "Only one Docker job runs at a time from the UI; controls stay disabled while a job is running.",
        ],
      },
    ],
  },
  {
    id: "host-tools",
    title: "Host tools",
    summary: "Nginx, systemd, cron, and live Monitor over the same SSH session.",
    keywords: ["nginx", "systemd", "cron", "monitor", "sudo", "cpu", "ram", "disk"],
    blocks: [
      {
        id: "enable",
        title: "Enable plugins",
        keywords: ["enable", "plugins", "profile"],
        steps: [
          "Profile → Session plugins → check Nginx, systemd, cron, and/or Monitor → Save → Connect.",
          "Click the matching activity-bar icon to open that plugin in the right panel.",
          "These plugins share the same pooled SSH session pattern as Docker when any of them is enabled.",
        ],
      },
      {
        id: "nginx",
        title: "Nginx",
        keywords: ["nginx", "reload", "test", "sites", "conf.d", "sudo"],
        steps: [
          "Status shows whether nginx is installed, version, and active state when systemctl is available.",
          "Configs lists nginx.conf plus files under sites-enabled, sites-available, and conf.d.",
          "View / Edit open the selected file in the same full-screen editor as SFTP (Ctrl+S to save). Your SSH user needs permission on that path.",
          "Test in terminal and Reload in terminal inject sudo nginx -t / sudo systemctl reload nginx into the active SSH terminal.",
          "Enter your sudo password in the terminal if prompted — SSHyar does not store or automate sudo passwords.",
        ],
        tip: "A terminal tab for that profile must be open for Test/Reload; otherwise those buttons stay disabled.",
      },
      {
        id: "systemd",
        title: "systemd",
        keywords: ["systemd", "systemctl", "start", "stop", "restart", "units"],
        steps: [
          "Lists service units (systemctl list-units --type=service --all) with a filter box.",
          "Status runs in the panel over the pooled SSH session (read-oriented).",
          "Start, Stop, and Restart inject sudo systemctl … into the active terminal so you can authenticate interactively.",
          "Refresh the list after privileged actions complete in the terminal.",
        ],
      },
      {
        id: "cron",
        title: "cron",
        keywords: ["cron", "crontab", "cron.d", "read-only"],
        steps: [
          "User tab shows this SSH user’s crontab (or an empty state).",
          "System tab lists /etc/cron.d and cron.daily/hourly/weekly/monthly, grouped by directory, with filter.",
          "Click a file to preview contents (read-only; paths are allow-listed).",
          "Editing crontabs is not available from the plugin — use the terminal or SFTP.",
        ],
      },
      {
        id: "monitor",
        title: "Monitor",
        keywords: ["monitor", "cpu", "ram", "disk", "swap", "load", "tick", "chart"],
        steps: [
          "Enable Monitor on the profile, connect, then click the Monitor icon on the activity bar.",
          "Gauges show live CPU %, RAM used/total/available, and swap when present; load averages and uptime appear in the header.",
          "Disks list each mount with a progress bar plus used / free / total and the filesystem name.",
          "Tick sets auto-refresh (Off, 2s, 5s, 10s, 30s). Refresh samples immediately.",
          "Charts toggles CPU and RAM time-series sparklines from recent samples (up to 60 points).",
          "Sampling uses /proc and df over the pooled SSH session — Linux hosts only.",
        ],
      },
    ],
  },
  {
    id: "snippets",
    title: "Snippets",
    summary: "Vault-backed command macros injected into the active terminal.",
    keywords: ["snippet", "zap", "macro", "command", "inject"],
    blocks: [
      {
        id: "use",
        title: "Create and run",
        keywords: ["add", "run", "inject", "delete"],
        steps: [
          "Open Snippets from the zap icon in the profiles toolbar.",
          "Add a display name and the exact command text to send.",
          "Run injects into the active tab; if none exists, SSHyar can open a local terminal first then inject shortly after.",
          "Snippets live in the same encrypted vault as profiles. Delete removes one permanently.",
        ],
        tip: "Prefer one logical command per snippet; use && or ; for chains. Match the active shell (remote bash vs local PowerShell).",
      },
    ],
  },
  {
    id: "vault",
    title: "Vault & security",
    summary: "AES-GCM vault, master password, portable backup, and host keys.",
    keywords: ["vault", "password", "lock", "backup", "export", "import", "dpapi", "argon2"],
    blocks: [
      {
        id: "how",
        title: "How the vault works",
        keywords: ["aes", "encrypt", "gcm", "argon2"],
        steps: [
          "Profiles, passwords, and snippets are stored encrypted (AES-GCM) under your app data directory.",
          "Without a master password, the vault key is wrapped with Windows DPAPI for this Windows user.",
          "With a master password, the key is derived via Argon2; unlock is required after launch or Lock.",
        ],
      },
      {
        id: "master",
        title: "Master password and lock",
        keywords: ["master", "set", "change", "remove", "lock"],
        steps: [
          "Key icon → Set master password: enter new password twice; weak passwords warn but are allowed.",
          "Change password: current + new + confirm. Remove returns to DPAPI-only protection after confirming the current password.",
          "Lock vault (File menu / activity bar, only when a master password is set) stops Docker/SFTP/PTY sessions, clears in-memory plaintext, and shows the unlock gate.",
          "The unlock screen shows how many profiles are in the vault.",
        ],
      },
      {
        id: "backup",
        title: "Backup export & import",
        keywords: ["backup", "export", "import", "migrate", "sshyar-backup"],
        steps: [
          "Key icon → Export backup: choose a backup password (can differ from the master password), then save a .sshyar-backup file.",
          "The file is Argon2 + AES-GCM encrypted and portable across machines — it does not rely on DPAPI.",
          "Import backup: pick the file, enter the backup password, then Replace (wipe current) or Merge (keep existing; matching ids overwritten).",
          "Use export before switching PCs or as recovery if you forget a master password but still have a backup file and its password.",
        ],
      },
      {
        id: "hosts",
        title: "Host keys",
        keywords: ["known_hosts", "fingerprint", "strict"],
        steps: [
          "SSHyar uses OpenSSH with StrictHostKeyChecking=accept-new for convenience on first connect.",
          "Known hosts are tracked in app data; treat unexpected host-key changes on shared networks carefully.",
        ],
      },
    ],
  },
  {
    id: "theme-updates",
    title: "Theme & updates",
    summary: "Appearance, About, GitHub updates, and this Help window.",
    keywords: ["theme", "dark", "light", "about", "update", "version", "github", "help"],
    blocks: [
      {
        id: "theme",
        title: "Theme",
        keywords: ["theme", "sun", "moon"],
        steps: [
          "Toggle dark / light with the sun/moon icon on the activity bar (or View menu).",
          "Choice is stored locally and applied on next launch; terminal colors follow the theme.",
        ],
      },
      {
        id: "about",
        title: "About and updates",
        keywords: ["about", "update", "download", "release", "msi"],
        steps: [
          "Open About from the SSHyar brand in the menu bar, or Help → About.",
          "After unlock, SSHyar checks GitHub Releases in the background; a toast appears if a newer version exists.",
          "A teal badge on the brand (and Help menu) means an update was detected.",
          "In About: Download for your OS when an installer asset exists, or open the release page. Refresh re-checks.",
        ],
      },
      {
        id: "this-help",
        title: "This Help window",
        keywords: ["help", "search", "drag", "resize", "window"],
        steps: [
          "Open with ? on the activity bar, or Help → Help. Escape or the close button dismisses it.",
          "This is a floating window — not a blocking popup. The rest of the app stays usable underneath.",
          "Drag the title bar to move; drag the bottom-right corner to resize. Position and size are remembered for this session.",
          "Pick a topic on the left, or type in search to filter topics and steps (e.g. sftp, vault, docker, sudo).",
        ],
      },
    ],
  },
  {
    id: "fix",
    title: "Fix problems",
    summary: "Connection, paste, vault, SFTP, Docker, and host-plugin issues.",
    keywords: [
      "error",
      "timeout",
      "troubleshoot",
      "fix",
      "docker",
      "sftp",
      "vault",
      "sudo",
      "nginx",
    ],
    blocks: [
      {
        id: "connect",
        title: "Connection errors",
        keywords: ["timeout", "refused", "auth", "host", "10060", "10061"],
        steps: [
          "Timed out — host unreachable or filtered; check VPN, IP, and port.",
          "Connection refused — nothing listening on that port, or firewall.",
          "Host not found — DNS / typo in hostname.",
          "Authentication failed — wrong password, key, or username; verify auth method on the profile.",
        ],
      },
      {
        id: "paste",
        title: "Copy / paste",
        keywords: ["paste", "clipboard", "ctrl+v"],
        steps: [
          "Ensure the terminal pane is focused (click inside it).",
          "Use Ctrl+V / right-click Paste; middle-click also pastes.",
          "If you see clipboard permission errors, grant clipboard access in the app capabilities (bundled builds include them).",
        ],
      },
      {
        id: "vault",
        title: "Vault / unlock",
        keywords: ["password", "forgot", "locked", "incorrect"],
        steps: [
          "Incorrect master password — retry carefully; there is no in-app reset without the password or a vault backup.",
          "Forgot master password: Import a previously exported .sshyar-backup (with its backup password), or start fresh.",
          "DPAPI vaults are tied to the Windows user on that machine — Export backup to move to another PC.",
        ],
      },
      {
        id: "sftp",
        title: "SFTP / Follow shell",
        keywords: ["sftp", "follow", "permission"],
        steps: [
          "SFTP needs a successful SSH profile session; reconnect if the channel dropped.",
          "Permission denied — your SSH user cannot read/write that path.",
          "Follow shell path not updating — use bash (or compatible) remote shell, or browse manually with Follow off.",
        ],
      },
      {
        id: "plugins",
        title: "Docker & host tools",
        keywords: ["docker", "nginx", "systemd", "cron", "monitor", "sudo", "tab missing"],
        steps: [
          "No plugin tab — enable the matching Session plugin on the profile, Save, then reconnect.",
          "Docker probe says not installed — no docker binary on PATH for that SSH user.",
          "List/action permission denied — the SSH user may need the docker group or equivalent access.",
          "No Compose bar in SFTP — enable Docker and open a folder that contains a compose file.",
          "Nginx/systemd Test/Reload or Start/Stop disabled — open a terminal tab for that profile first.",
          "sudo asks for a password in the terminal — expected; type it there. SSHyar never uses passwordless sudo automatically.",
          "Monitor charts stay flat until Tick is on (or you Refresh a few times) so samples can build history.",
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
