# SSHyar

[English](README.md) | [فارسی](README.fa.md) | [العربية](README.ar.md) | [Русский](README.ru.md) | [简体中文](README.zh-CN.md)

**SSH, SFTP, and server tools in one desktop window — no agent on the host.**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/mh314k/sshyar?include_prereleases)](https://github.com/mh314k/sshyar/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/mh314k/sshyar/total)](https://github.com/mh314k/sshyar/releases)

**Windows & Linux** · open source · encrypted vault on *your* machine

**[Download latest release](https://github.com/mh314k/sshyar/releases/latest)**

## Screenshots

<p align="center">
  <img src="docs/screenshots/main-window.png" alt="SSHyar main window" width="720" />
</p>

<p align="center">
  <img src="docs/screenshots/terminal.png" alt="Terminal, SFTP, and Compose" width="360" />
  &nbsp;
  <img src="docs/screenshots/monitor.png" alt="Live Monitor panel" width="360" />
</p>

<p align="center">
  <img src="docs/screenshots/docker.png" alt="Docker status and safe prune" width="280" />
</p>

## Why SSHyar

- **One window** — SSH terminal, graphical SFTP, and optional host tools together (not three separate apps).
- **Nothing installed on the server** — no agent, no `.sshyar` folder, no silent file drops. Plugins only run short commands over your SSH session.
- **Your secrets stay local** — AES-GCM vault (optional master password) with portable encrypted backup.
- **Server panels when you need them** — Docker, Nginx, systemd, cron, and live Monitor — enable per profile.
- **Updates in-app** — download the installer from GitHub Releases and launch it when ready.

## Compared to alternatives

Honest, high-level fit — pick what matches your workflow:

| | **SSHyar** | Termius / Tabby-like | WinSCP + terminal | MobaXterm-class |
|---|------------|----------------------|-------------------|-----------------|
| SSH + SFTP in one desktop window | Yes | Varies | Split apps | Yes |
| Docker / Nginx / systemd / Monitor panels | Yes | Rare | No | Limited |
| Agent / extra footprint on the server | **None** | Usually none | None | Sometimes extras |
| Local encrypted vault + portable backup | Yes | Often cloud / account | Keys elsewhere | Varies |
| Windows **and** Linux desktop builds | Yes | Varies | Windows-first | Windows-first |
| Open source (GPL) | **Yes** | Often proprietary | WinSCP is GPL | Proprietary tiers |

**Best when** you want a free desktop client that keeps profiles offline, refuses remote agents, and still gives you file + Docker/host panels next to the shell.

## Get it

1. Open **[Releases](https://github.com/mh314k/sshyar/releases/latest)**.
2. Download for your OS:
   - **Windows** — `.msi` (preferred) or setup `.exe`
   - **Linux** — `.AppImage` or `.deb`
3. Install / run. OpenSSH client must be available on the machine.

Requirements in short: Windows 10/11 or a modern Linux desktop; OpenSSH (`ssh`). Building from source is optional — see [docs/develop.md](docs/develop.md).

After install, the app can check GitHub for newer releases and download the installer for you.

## Community

SSHyar grows with people who use it day to day.

- **Star** the repo if it saves you time — it helps others find the project.
- **[Open an issue](https://github.com/mh314k/sshyar/issues)** for bugs, ideas, or questions. Templates welcome clear repro steps.
- **Contribute** — docs, translations, and fixes are especially welcome. Start with [docs/develop.md](docs/develop.md).

## License

SSHyar is free software under the **GNU General Public License v3 or later**. See [LICENSE](LICENSE).
