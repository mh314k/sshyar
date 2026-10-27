# SSHyar

[English](README.md) | [فارسی](README.fa.md) | [العربية](README.ar.md) | [Русский](README.ru.md) | [简体中文](README.zh-CN.md)

**SSH وSFTP وأدوات الخادم في نافذة سطح مكتب واحدة — بدون وكيل على المضيف.**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/mh314k/sshyar?include_prereleases)](https://github.com/mh314k/sshyar/releases/latest)

**Windows وLinux** · مفتوح المصدر · خزنة مشفّرة على *جهازك*

**[تحميل آخر إصدار](https://github.com/mh314k/sshyar/releases/latest)**

## لقطات الشاشة

<p align="center">
  <img src="docs/screenshots/main-window.png" alt="النافذة الرئيسية" width="720" />
</p>

<p align="center">
  <img src="docs/screenshots/terminal.png" alt="الطرفية وSFTP وCompose" width="360" />
  &nbsp;
  <img src="docs/screenshots/monitor.png" alt="لوحة المراقبة" width="360" />
</p>

<p align="center">
  <img src="docs/screenshots/docker.png" alt="حالة Docker والتنظيف الآمن" width="280" />
</p>

## لماذا SSHyar

- **نافذة واحدة** — طرفية SSH وSFTP رسومي وأدوات خادم اختيارية معاً.
- **لا يُثبَّت شيء على الخادم** — بلا وكيل وبلا مجلد `.sshyar` وبلا ملفات صامتة.
- **أسرارك محلية** — خزنة AES-GCM (كلمة مرور رئيسية اختيارية) ونسخ احتياطي مشفّر محمول.
- **لوحات عند الحاجة** — Docker وNginx وsystemd وcron ومراقبة مباشرة — لكل ملف تعريف.
- **تحديث من داخل التطبيق** — تنزيل المُثبِّت من GitHub وتشغيله عند الجاهزية.

## مقارنة سريعة

| | **SSHyar** | Termius / Tabby وأشباهها | WinSCP + طرفية | فئة MobaXterm |
|---|------------|--------------------------|----------------|---------------|
| SSH + SFTP في نافذة واحدة | نعم | يختلف | تطبيقات منفصلة | نعم |
| لوحات Docker / Nginx / systemd / Monitor | نعم | نادر | لا | محدود |
| وكيل على الخادم | **لا** | غالباً لا | لا | أحياناً إضافات |
| خزنة محلية + نسخة محمولة | نعم | غالباً سحابة / حساب | مفاتيح في مكان آخر | يختلف |
| بناء Windows **و** Linux | نعم | يختلف | Windows أولاً | Windows أولاً |
| مفتوح المصدر (GPL) | **نعم** | غالباً مغلق | WinSCP بـ GPL | طبقات مدفوعة |

## التحميل

1. افتح **[Releases](https://github.com/mh314k/sshyar/releases/latest)**.
2. حمّل لنظامك: Windows (`.msi` / `.exe`) أو Linux (`.AppImage` / `.deb`).
3. ثبّت وشغّل مع وجود عميل OpenSSH.

البناء من المصدر اختياري — [docs/develop.md](docs/develop.md).

## المجتمع

- **نجّم** المستودع إن وفر وقتك.
- **[افتح Issue](https://github.com/mh314k/sshyar/issues)** للأخطاء والأفكار والأسئلة.
- **ساهم** — توثيق، ترجمات، وإصلاحات مرحّب بها عبر [docs/develop.md](docs/develop.md).

## الرخصة

برمجيات حرة وفق **GNU GPL v3 أو أحدث**. انظر [LICENSE](LICENSE).
