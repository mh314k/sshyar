# Develop & build

Technical notes for contributing to SSHyar. For the product overview, see the [README](../README.md).

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
git tag v1.0.0
git push origin v1.0.0
```

Pushing a `v*` tag runs [`.github/workflows/release.yml`](../.github/workflows/release.yml), which builds **Windows** and **Linux** (Ubuntu 24.04) and publishes a GitHub Release.

To move an existing tag onto a new commit:

```bash
git tag -d v1.0.0
git tag v1.0.0
git push origin refs/tags/v1.0.0 --force
```

## Smoke checklist

After larger changes, run [smoke-checklist.md](smoke-checklist.md).

## Remote footprint

SSHyar does **not** install anything on the SSH host. Profiles, keys, and vault data stay on your desktop (`Data location` below). Session plugins run short read commands over SSH and leave no helper files. Writes happen only for actions you start (SFTP upload/edit/delete, Install public key, Docker/Nginx/systemd controls you click).

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
