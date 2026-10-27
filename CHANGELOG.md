# Changelog

All notable changes to SSHyar are documented here.

## [1.0.0] — 2026-10-28

First stable product release. Focus: trustable desktop SSH helper with in-app updates and a product-oriented docs landing.

### Highlights

- Encrypted profile vault (AES-GCM), optional master password, portable backup
- Embedded terminal + graphical SFTP in one window (Follow shell, Compose bar)
- Optional session plugins: Docker, Nginx, systemd, cron, Monitor
- Frameless chrome, Help as a floating window, dark/light theme
- In-app update check from GitHub Releases: download installer, then launch Update
- Product README in English, فارسی, العربية, Русский, 简体中文

### Notes

- Windows and Linux installers are published via GitHub Actions on `v*` tags
- No agent or `.sshyar` tree is installed on remote hosts

## [0.9.x] — 2026-10

Pre-1.0 hardening: Help window rewrite, About polish, sticky update notifier with download/install flow, version bumps toward 1.0.

## [0.5.0] and earlier

Foundation: profiles, terminal, SFTP, vault, Docker and host plugins, frameless UI. See git history for detail.
