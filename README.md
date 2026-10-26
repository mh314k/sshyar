# SSHyar

Windows SSH helper with an embedded real PowerShell terminal, encrypted profile vault, graphical SFTP, snippets, and optional master-password lock.

**Version:** 0.2.0 · **License:** [GPL-3.0-or-later](LICENSE)

## Features

- **Terminal** — ConPTY + PowerShell wrapping OpenSSH; local PowerShell tabs; session tabs (`Ctrl+T` / `Ctrl+W` / `Ctrl+Tab`); reconnect
- **Clipboard** — copy/paste in the terminal (`Ctrl+C` with selection, `Ctrl+V`, context menu, middle-click)
- **Profiles** — host, user, password or key, group, tags, search, post-connect command, keepalive, **remote shell** (bash / zsh / fish / sh / custom / server default)
- **Keys** — generate per-profile ed25519 keys; install public key on the server
- **External SSH** — same command in Windows Terminal / external PowerShell; copy SSH command to clipboard
- **SFTP** — browse, multi-select, upload (batch + progress), download, mkdir, rename, delete, copy/cut/paste; View/Edit with syntax highlighting; **Follow shell** cwd sync
- **Snippets** — vault-backed commands injected into the active terminal
- **Vault** — AES-GCM; Windows DPAPI by default; optional master password (set / change / remove / lock)
- **UI** — dark/light theme, in-app Help (searchable), About with GitHub release update check

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

Installer artifacts land under `src-tauri/target/release/bundle/`.

## Release (GitHub)

1. Bump version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src/lib/version.ts` (keep them identical).
2. Commit, then tag and push:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Pushing a `v*` tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds the Windows app and publishes a GitHub Release.

## Data location

`%APPDATA%\sshyar\`

| Path | Purpose |
|------|---------|
| `vault.dat` | Encrypted profiles, secrets, snippets |
| `vault.meta.json` | Public vault metadata |
| `vault.key.dpapi` | DPAPI-wrapped key (when no master password) |
| `keys\` | Generated SSH keys |
| `known_hosts.json` | Host key tracking |

## License

SSHyar is free software under the **GNU General Public License v3 or later**. See [LICENSE](LICENSE).
