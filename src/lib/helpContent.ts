export type HelpBlock = {
  id: string;
  title: string;
  keywords: string[];
  steps: string[];
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
    id: "overview",
    title: "Overview",
    summary: "What SSHyar is and how the main layout works.",
    keywords: ["overview", "intro", "layout", "sidebar", "panels"],
    blocks: [
      {
        id: "layout",
        title: "Main layout",
        keywords: ["layout", "sidebar", "terminal", "sftp", "panels"],
        steps: [
          "Left sidebar: profiles, search, snippets, theme, security, about, and help.",
          "Center: session tabs and the embedded PowerShell / SSH terminal.",
          "Right panel: SFTP file browser for the active SSH session (opens when you connect to a profile).",
          "Drag the panel edges to resize the sidebar and SFTP panel.",
        ],
      },
      {
        id: "first-run",
        title: "First steps",
        keywords: ["start", "begin", "first", "new profile"],
        steps: [
          "Click + to create a profile (host, user, auth method).",
          "Select the profile, then Connect — or use the context menu / Actions.",
          "Optionally set a master password under the key icon so the vault locks on next launch.",
        ],
      },
    ],
  },
  {
    id: "profiles",
    title: "Profiles",
    summary: "Save SSH targets with groups, tags, auth, and post-connect commands.",
    keywords: ["profile", "host", "ssh", "group", "tag", "password", "key"],
    blocks: [
      {
        id: "create-edit",
        title: "Create and edit",
        keywords: ["create", "edit", "new", "form", "port", "username"],
        steps: [
          "Click + in the brand bar to add a profile, or right-click a profile → Edit.",
          "Fill name, host, port, username, and choose Password or Key authentication.",
          "Remote shell defaults to bash — switch to zsh, fish, sh, server default, or a custom path.",
          "Optional: group, tags, notes, post-connect command, and keepalive settings.",
          "Save — secrets are stored in the encrypted vault.",
        ],
      },
      {
        id: "find-connect",
        title: "Find and connect",
        keywords: ["search", "connect", "select", "actions"],
        steps: [
          "Use the search box to filter by name, host, tag, or group.",
          "Click a profile to select it; click again to deselect.",
          "With a profile selected, open Actions (⚡ area / menu) or right-click for Connect, External terminal, Copy SSH, Duplicate, Generate key, Install key, Delete.",
          "Connect opens an embedded session; External terminal launches the system SSH client.",
        ],
      },
      {
        id: "keys",
        title: "SSH keys",
        keywords: ["keygen", "ed25519", "install", "public key"],
        steps: [
          "Generate key creates an ed25519 key pair for that profile and wires the private key path.",
          "Install key uploads the public key to the server (needs password auth available for the install step).",
          "You can also point the profile at an existing private key file path.",
        ],
      },
    ],
  },
  {
    id: "terminal",
    title: "Terminal",
    summary: "Embedded ConPTY PowerShell, local or SSH sessions, copy/paste.",
    keywords: ["terminal", "shell", "powershell", "pty", "copy", "paste", "ctrl"],
    blocks: [
      {
        id: "sessions",
        title: "Sessions and tabs",
        keywords: ["tab", "session", "new", "reconnect", "close"],
        steps: [
          "Each Connect (or New PowerShell) opens a tab in the center.",
          "Use the + on the tab bar for a local PowerShell without SSH.",
          "Reconnect (rotate icon on a tab) restarts that profile session.",
          "Close a tab with × — that ends the PTY session.",
        ],
      },
      {
        id: "clipboard",
        title: "Copy and paste",
        keywords: ["copy", "paste", "clipboard", "ctrl+c", "ctrl+v", "middle click"],
        steps: [
          "Select text in the terminal, then Ctrl+C (or Ctrl+Shift+C) to copy. Bare Ctrl+C with no selection still sends interrupt (SIGINT).",
          "Paste with Ctrl+V or Ctrl+Shift+V.",
          "Right-click for Copy / Paste / Select all / Clear scrollback.",
          "Middle-click pastes from the clipboard (classic terminal behavior).",
          "Click (without dragging) focuses the terminal; drag to select text.",
        ],
      },
      {
        id: "shortcuts",
        title: "Keyboard shortcuts",
        keywords: ["shortcut", "hotkey", "ctrl+t", "ctrl+w", "ctrl+tab"],
        steps: [
          "Ctrl+T — new local PowerShell tab.",
          "Ctrl+W — close the active tab.",
          "Ctrl+Tab / Ctrl+Shift+Tab — cycle tabs.",
        ],
      },
    ],
  },
  {
    id: "sftp",
    title: "SFTP",
    summary: "Browse, transfer, edit, and follow the remote shell cwd.",
    keywords: ["sftp", "file", "upload", "download", "folder", "follow"],
    blocks: [
      {
        id: "browse",
        title: "Browse and select",
        keywords: ["browse", "checkbox", "multi", "refresh", "up"],
        steps: [
          "After Connect, the right panel lists the remote directory.",
          "Double-click folders to enter; use ↑ to go up; Refresh to reload.",
          "Use checkboxes for multi-select, then bulk download, delete, copy, or cut.",
        ],
      },
      {
        id: "transfer",
        title: "Upload and download",
        keywords: ["upload", "download", "progress", "transfer", "batch"],
        steps: [
          "Upload opens a file picker and sends files to the current remote folder.",
          "Download saves selected remote files locally.",
          "Transfer progress (per-file and overall) appears at the bottom of the SFTP panel.",
        ],
      },
      {
        id: "edit-view",
        title: "View and edit files",
        keywords: ["view", "edit", "editor", "syntax", "codemirror"],
        steps: [
          "Open a file to View (read-only) or Edit in the built-in editor.",
          "Syntax highlighting follows the file extension (many languages supported).",
          "Save writes back over SFTP; discard reloads from the server.",
        ],
      },
      {
        id: "follow",
        title: "Follow shell",
        keywords: ["follow", "cwd", "pwd", "sync", "path"],
        steps: [
          "Enable Follow shell so the SFTP path tracks the directory of the linked terminal session.",
          "SSHyar injects a small shell hook (no Ctrl+C) so cd in the terminal updates the file panel.",
          "Turn Follow off if you want to browse independently of the shell cwd.",
        ],
      },
      {
        id: "clipboard-ops",
        title: "Remote copy / cut / paste",
        keywords: ["copy", "cut", "paste", "rename", "mkdir", "delete"],
        steps: [
          "Copy or Cut selected items into the SFTP clipboard, then Paste in another folder.",
          "Rename, New folder, and Delete are available from the toolbar and context menu.",
        ],
      },
    ],
  },
  {
    id: "snippets",
    title: "Snippets",
    summary: "Reusable shell commands you can inject into the active terminal.",
    keywords: ["snippet", "command", "macro", "zap"],
    blocks: [
      {
        id: "use-snippets",
        title: "Create and run",
        keywords: ["add", "run", "inject", "delete"],
        steps: [
          "Open Snippets from the zap icon in the brand bar.",
          "Add a name and command body; snippets are stored in the vault.",
          "Run sends the command into the active terminal session (creates a local tab if needed).",
          "Delete removes a snippet from the vault.",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "Vault & security",
    summary: "Encrypted profile vault, DPAPI, and optional master password.",
    keywords: ["vault", "password", "lock", "dpapi", "security", "encrypt"],
    blocks: [
      {
        id: "master",
        title: "Master password",
        keywords: ["master", "set", "change", "remove", "unlock"],
        steps: [
          "By default Windows DPAPI protects the vault key on this machine.",
          "Set master password (key icon) to require a password on launch — enter twice; weak passwords only warn.",
          "Change password asks for the current password plus a new confirmed password.",
          "Remove master password requires the current password and switches back to DPAPI-only.",
          "Lock vault closes sessions, clears in-memory secrets, and returns to the unlock screen.",
        ],
      },
    ],
  },
  {
    id: "theme-about",
    title: "Theme, About & updates",
    summary: "Appearance and checking for new releases.",
    keywords: ["theme", "dark", "light", "about", "update", "version", "release"],
    blocks: [
      {
        id: "theme",
        title: "Theme",
        keywords: ["theme", "dark", "light", "sun", "moon"],
        steps: [
          "Toggle dark / light with the sun/moon icon in the brand bar.",
          "Preference is remembered for next launches.",
        ],
      },
      {
        id: "about",
        title: "About and updates",
        keywords: ["about", "update", "github", "download", "version"],
        steps: [
          "Open About (i icon) to see the app version and a short description.",
          "SSHyar checks GitHub Releases; if a newer version exists, Download update / Open release appear.",
          "A small badge on the About icon means an update is available.",
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
      const hay = [block.title, ...block.keywords, ...block.steps].join(" ").toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });

    if (!blocks.length && !sectionHit) return null;
    return { ...section, blocks: sectionHit ? section.blocks : blocks };
  }).filter((s): s is HelpSection => s !== null);
}
