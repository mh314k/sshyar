# SSHyar

[English](README.md) | [فارسی](README.fa.md) | [العربية](README.ar.md) | [Русский](README.ru.md) | [简体中文](README.zh-CN.md)

**在一个桌面窗口中完成 SSH、SFTP 与服务器工具 — 主机上不安装任何 agent。**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/mh314k/sshyar?include_prereleases)](https://github.com/mh314k/sshyar/releases/latest)

**Windows 与 Linux** · 开源 · 加密保险库保存在*你自己的*电脑上

**[下载最新版本](https://github.com/mh314k/sshyar/releases/latest)**

## 截图

<p align="center">
  <img src="docs/screenshots/main-window.png" alt="SSHyar 主窗口" width="720" />
</p>

<p align="center">
  <img src="docs/screenshots/terminal.png" alt="终端、SFTP 与 Compose" width="360" />
  &nbsp;
  <img src="docs/screenshots/monitor.png" alt="Monitor 面板" width="360" />
</p>

<p align="center">
  <img src="docs/screenshots/docker.png" alt="Docker 状态与安全清理" width="280" />
</p>

## 为什么选择 SSHyar

- **一个窗口** — SSH 终端、图形化 SFTP 与可选主机工具放在一起。
- **服务器零安装** — 无 agent、无 `.sshyar` 目录、无静默落盘；插件仅通过 SSH 执行短命令。
- **密钥留在本地** — AES-GCM 保险库（可选主密码）与可移植加密备份。
- **按需面板** — Docker、Nginx、systemd、cron 与实时 Monitor — 按配置文件启用。
- **应用内更新** — 从 GitHub Releases 下载安装包并一键运行。

## 与其他方案对比

| | **SSHyar** | Termius / Tabby 类 | WinSCP + 终端 | MobaXterm 类 |
|---|------------|-------------------|---------------|--------------|
| 单窗口 SSH + SFTP | 是 | 视产品而定 | 多应用拆分 | 是 |
| Docker / Nginx / systemd / Monitor 面板 | 是 | 少见 | 否 | 有限 |
| 服务器上的 agent | **无** | 通常无 | 无 | 偶有附加组件 |
| 本地加密库 + 可移植备份 | 是 | 常依赖云/账号 | 密钥另存 | 视产品而定 |
| Windows **与** Linux 桌面构建 | 是 | 视产品而定 | 以 Windows 为主 | 以 Windows 为主 |
| 开源 (GPL) | **是** | 多为专有 | WinSCP 为 GPL | 分层收费 |

## 获取

1. 打开 **[Releases](https://github.com/mh314k/sshyar/releases/latest)**。
2. 按系统下载：Windows（`.msi` / `.exe`）或 Linux（`.AppImage` / `.deb`）。
3. 安装并运行；需已安装 OpenSSH 客户端。

从源码构建见 [docs/develop.md](docs/develop.md)。

## 社区

- 若对你有帮助，请给仓库点 **Star**。
- **[提交 Issue](https://github.com/mh314k/sshyar/issues)** — Bug、想法与问题都欢迎。
- **贡献** — 文档、翻译与修复：从 [docs/develop.md](docs/develop.md) 开始。

## 许可

自由软件，遵循 **GNU GPL v3 或更新版本**。见 [LICENSE](LICENSE)。
