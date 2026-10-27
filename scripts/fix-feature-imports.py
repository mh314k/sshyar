from __future__ import annotations

import os
import re
from pathlib import Path

root = Path("src")

COMPONENTS_STAY = {
    "IconButton": "components/IconButton",
    "icons": "components/icons",
    "ContextMenu": "components/ContextMenu",
    "RemoteFileEditor": "components/RemoteFileEditor",
    "Popover": "components/Popover",
    "ErrorBoundary": "components/ErrorBoundary",
}

FEATURE = {
    "RightPlugins": "features/plugins/RightPlugins",
    "DockerPanel": "features/plugins/docker/DockerPanel",
    "DockerPanel/DockerFilter": "features/plugins/docker/DockerPanel/DockerFilter",
    "dockerJob/DockerJobContext": "features/plugins/docker/dockerJob/DockerJobContext",
    "dockerJob/DockerJobBar": "features/plugins/docker/dockerJob/DockerJobBar",
    "DockerLogsModal": "features/plugins/docker/DockerLogsModal",
    "NginxPanel": "features/plugins/nginx/NginxPanel",
    "SystemdPanel": "features/plugins/systemd/SystemdPanel",
    "CronPanel": "features/plugins/cron/CronPanel",
    "MonitorPanel": "features/plugins/monitor/MonitorPanel",
    "ProfileSidebar": "features/profiles/ProfileSidebar",
    "ProfileForm": "features/profiles/ProfileForm",
    "SnippetList": "features/profiles/SnippetList",
    "BrandLogo": "features/chrome/BrandLogo",
    "WindowControls": "features/chrome/WindowControls",
    "MenuBar": "features/chrome/MenuBar",
    "ActivityBar": "features/chrome/ActivityBar",
    "UnlockGate": "features/chrome/UnlockGate",
    "AppTitleChrome": "features/chrome/AppTitleChrome",
    "AboutPopover": "features/chrome/AboutPopover",
    "HelpModal": "features/chrome/HelpModal",
    "StatusBar": "features/chrome/StatusBar",
    "PanelLayout": "features/chrome/PanelLayout",
    "MainSplit": "features/chrome/MainSplit",
    "TerminalPane": "features/terminal/TerminalPane",
    "SessionTabBar": "features/terminal/SessionTabBar",
}


def rel_from(file: Path, target: str) -> str:
    dest = root / target
    relp = os.path.relpath(dest, start=file.parent).replace("\\", "/")
    if not relp.startswith("."):
        relp = "./" + relp
    return relp


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    def repl_prefixed(prefix: str):
        def inner(m: re.Match[str]) -> str:
            quote, rest = m.group(1), m.group(2)
            idx = rest.find(prefix)
            target = rest[idx:]
            return f"from {quote}{rel_from(path, target)}{quote}"

        return inner

    text = re.sub(
        r'from (["\'])((?:\.\./)+lib/[^"\']+)\1',
        repl_prefixed("lib/"),
        text,
    )
    text = re.sub(
        r'from (["\'])((?:\.\./)+hooks/[^"\']+)\1',
        repl_prefixed("hooks/"),
        text,
    )

    def repl_types(m: re.Match[str]) -> str:
        quote, rest = m.group(1), m.group(2)
        after = rest.split("types", 1)[1]
        target = "types" + after
        return f"from {quote}{rel_from(path, target)}{quote}"

    text = re.sub(
        r'from (["\'])((?:\.\./)+types(?:/[^"\']*)?)\1',
        repl_types,
        text,
    )

    names = sorted({**COMPONENTS_STAY, **FEATURE}.items(), key=lambda x: -len(x[0]))
    for name, target in names:
        pattern = (
            r'from (["\'])((?:\.\./|\./)+)('
            + re.escape(name)
            + r'(?:/[^"\']*)?)\1'
        )

        def make_repl(tgt: str = target, n: str = name):
            def r(m: re.Match[str]) -> str:
                quote = m.group(1)
                suffix = m.group(3)[len(n) :]
                full = tgt + suffix
                return f"from {quote}{rel_from(path, full)}{quote}"

            return r

        text = re.sub(pattern, make_repl(), text)

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = 0
    for p in root.rglob("*"):
        if p.suffix in {".ts", ".tsx"}:
            if fix_file(p):
                changed += 1
                print("fixed", p)
    print("changed", changed)


if __name__ == "__main__":
    main()
