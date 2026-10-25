# SSHyar

Windows SSH helper with an embedded real PowerShell terminal, profile manager, key tooling, and graphical SFTP.

## Features

- Embedded PowerShell via ConPTY (`pwsh` preferred, else Windows PowerShell) + xterm.js
- Open the same SSH command in Windows Terminal / external PowerShell
- Session tabs (`Ctrl+T` / `Ctrl+W` / `Ctrl+Tab`) with reconnect
- Profiles: host, user, password or key, group, tags, search, post-connect command, keepalive
- Copy SSH command to clipboard
- Generate per-profile ed25519 keys and install the public key on the VPS (password auth)
- Graphical SFTP panel: browse, upload (drag/drop or picker), download, delete, rename, copy/cut/paste
- Command snippets (click to send into the active terminal)
- Optional master password (Argon2id + AES-GCM); otherwise DPAPI-protected vault key

## Requirements

- Windows 10/11
- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) stable
- OpenSSH Client (`ssh`, `ssh-keygen`) — Settings → Apps → Optional features

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Data is stored under `%APPDATA%\sshyar\` (encrypted vault, keys, known hosts).
