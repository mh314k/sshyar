# SSHyar

Desktop SSH helper for **Windows and Linux** — embedded terminal, encrypted profile vault, graphical SFTP, optional Docker management, snippets, and optional master-password lock.

**Version:** 0.4.0 · **License:** [GPL-3.0-or-later](LICENSE)

## Features

- **Terminal** — local shell + OpenSSH in a real PTY (PowerShell / ConPTY on Windows; `$SHELL` on Linux); session tabs (`Ctrl+T` / `Ctrl+W` / `Ctrl+Tab`); reconnect
- **Clipboard** — copy/paste in the terminal (`Ctrl+C` with selection, `Ctrl+V`, context menu, middle-click)
- **Profiles** — host, user, password or key, group, tags, search, post-connect command, keepalive, **remote shell** (bash / zsh / fish / sh / custom / server default), **local port forwards** (`ssh -L`, with common-port presets), optional **Docker management** flag
- **Keys** — generate per-profile ed25519 keys; install public key on the server
- **External SSH** — same command in your system terminal (Windows Terminal / PowerShell on Windows; gnome-terminal, konsole, kitty, … on Linux); copy SSH command to clipboard
- **SFTP** — browse, multi-select, upload/download with progress, mkdir, rename, delete, copy/cut/paste; View/Edit with syntax highlighting; **Follow shell** cwd sync; **Compose bar** (up/down/restart/recreate/build/pull/logs/ps) when the folder has a compose file and Docker management is on — **Logs** uses the shared live logs popup
- **Docker** — per-profile plugin tab next to SFTP: Status (`docker system df` + **safe prune** for unused images/volumes with preview list and typed `PRUNE` confirm), Containers (Compose-grouped; start/stop/restart/remove; **live logs** popup; **Open in SFTP** when Compose working-dir labels exist), Images, Volumes, Networks; list search/filters; **persistent SSH** for Docker ops; toast + streamed progress bar for remote jobs
- **Snippets** — vault-backed commands injected into the active terminal
- **Vault** — AES-GCM; Windows DPAPI by default; on Linux a user-only key file (`0600`); optional master password (set / change / remove / lock)
- **UI** — dark/light theme, Material icons, in-app Help (searchable), About with GitHub release update check

## Requirements

### Both platforms

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) stable
- OpenSSH client (`ssh`, `ssh-keygen`)

### Windows

- Windows 10/11
- OpenSSH Client optional feature (Settings → Apps → Optional features)

### Linux

- A desktop environment with WebKitGTK 4.1 (e.g. Ubuntu 24.04+)
- A terminal emulator for **Open external** (gnome-terminal, konsole, kitty, xfce4-terminal, or `x-terminal-emulator`)
- Build deps (example on Debian/Ubuntu):

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
  librsvg2-dev patchelf build-essential curl wget file libssl-dev xdg-utils \
  openssh-client
```

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Artifacts land under `src-tauri/target/release/bundle/` (`.msi` / `.exe` on Windows; `.AppImage` / `.deb` on Linux).

## Release (GitHub)

1. Bump version in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, and `src/lib/version.ts` (keep them identical).
2. Commit, then tag and push:

```bash
git tag v0.4.0
git push origin v0.4.0
```

Pushing a `v*` tag runs [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds **Windows** and **Linux** (Ubuntu 24.04) and publishes a GitHub Release.

To move an existing tag onto a new commit:

```bash
git tag -d v0.4.0
git tag v0.4.0
git push origin refs/tags/v0.4.0 --force
```

## Data location

| Platform | Directory |
|----------|-----------|
| Windows | `%APPDATA%\sshyar\` |
| Linux | `~/.local/share/sshyar/` |

| Path | Purpose |
|------|---------|
| `vault.dat` | Encrypted profiles, secrets, snippets |
| `vault.meta.json` | Public vault metadata |
| `vault.key.dpapi` | DPAPI-wrapped key (Windows, when no master password) |
| `vault.key.raw` | Local vault key, mode `0600` (Linux, when no master password) |
| `keys/` | Generated SSH keys |
| `known_hosts.json` | Host key tracking |

## License

SSHyar is free software under the **GNU General Public License v3 or later**. See [LICENSE](LICENSE).
