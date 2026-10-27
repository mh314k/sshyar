# SSHyar

[English](README.md) | [فارسی](README.fa.md) | [العربية](README.ar.md) | [Русский](README.ru.md) | [简体中文](README.zh-CN.md)

**SSH, SFTP и серверные инструменты в одном окне — без агента на хосте.**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/mh314k/sshyar?include_prereleases)](https://github.com/mh314k/sshyar/releases/latest)

**Windows и Linux** · open source · зашифрованное хранилище на *вашем* ПК

**[Скачать последний релиз](https://github.com/mh314k/sshyar/releases/latest)**

## Скриншоты

<p align="center">
  <img src="docs/screenshots/main-window.png" alt="Главное окно SSHyar" width="520" />
</p>

<table>
  <tr>
    <td align="center" valign="top" width="50%">
      <img src="docs/screenshots/terminal.png" alt="Терминал, SFTP и Compose" width="380" /><br/>
      <sub>Terminal + SFTP</sub>
    </td>
    <td align="center" valign="top" width="50%">
      <img src="docs/screenshots/monitor.png" alt="Панель Monitor" width="380" /><br/>
      <sub>Monitor</sub>
    </td>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <img src="docs/screenshots/docker.png" alt="Статус Docker и безопасный prune" width="180" /><br/>
      <sub>Docker</sub>
    </td>
  </tr>
</table>

## Зачем SSHyar

- **Одно окно** — SSH-терминал, графический SFTP и опциональные серверные панели вместе.
- **Ничего не ставится на сервер** — без агента, без каталога `.sshyar`, без тихих файлов.
- **Секреты локально** — AES-GCM vault (опциональный master password) и переносимый шифрованный бэкап.
- **Панели по необходимости** — Docker, Nginx, systemd, cron и живой Monitor — на профиль.
- **Обновление в приложении** — скачать установщик с GitHub Releases и запустить.

## Сравнение

| | **SSHyar** | Termius / Tabby-подобные | WinSCP + терминал | Класс MobaXterm |
|---|------------|--------------------------|-------------------|-----------------|
| SSH + SFTP в одном окне | Да | По-разному | Разные приложения | Да |
| Панели Docker / Nginx / systemd / Monitor | Да | Редко | Нет | Ограничено |
| Агент на сервере | **Нет** | Обычно нет | Нет | Иногда дополнения |
| Локальный vault + переносимый бэкап | Да | Часто облако / аккаунт | Ключи отдельно | По-разному |
| Сборки Windows **и** Linux | Да | По-разному | Сначала Windows | Сначала Windows |
| Open source (GPL) | **Да** | Часто проприетарно | WinSCP — GPL | Платные уровни |

## Установка

1. Откройте **[Releases](https://github.com/mh314k/sshyar/releases/latest)**.
2. Скачайте для ОС: Windows (`.msi` / `.exe`) или Linux (`.AppImage` / `.deb`).
3. Установите; нужен клиент OpenSSH.

Сборка из исходников — [docs/develop.md](docs/develop.md).

## Сообщество

- Поставьте **Star**, если SSHyar экономит время.
- **[Создайте issue](https://github.com/mh314k/sshyar/issues)** — баги, идеи, вопросы.
- **Контрибьют** — документация, переводы, фиксы: [docs/develop.md](docs/develop.md).

## Лицензия

Свободное ПО под **GNU GPL v3 или новее**. См. [LICENSE](LICENSE).
