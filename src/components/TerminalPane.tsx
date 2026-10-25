import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { listen } from "@tauri-apps/api/event";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { api } from "../lib/api";
import { toastError, toastSuccess } from "../lib/toast";
import { terminalThemes, type ThemeMode } from "../lib/theme";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import "@xterm/xterm/css/xterm.css";

interface Props {
  ptyId: string;
  active: boolean;
  theme: ThemeMode;
}

function toPtyText(text: string) {
  // ConPTY / SSH expect CR as line ending for typed input.
  return text.replace(/\r\n/g, "\n").replace(/\n/g, "\r");
}

export function TerminalPane({ ptyId, active, theme }: Props) {
  const paneRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  function focusTerminal() {
    try {
      termRef.current?.focus();
    } catch {
      /* ignore */
    }
  }

  function fitTerminal() {
    const fit = fitRef.current;
    const term = termRef.current;
    const host = hostRef.current;
    if (!fit || !term || !host) return;
    if (host.clientWidth < 8 || host.clientHeight < 8) return;
    try {
      fit.fit();
      void api.ptyResize(ptyId, term.cols, term.rows);
    } catch {
      /* ignore */
    }
  }

  async function copySelection(silent = false) {
    const term = termRef.current;
    if (!term) return false;
    const sel = term.getSelection();
    if (!sel) return false;
    try {
      await writeText(sel);
      if (!silent) toastSuccess("Copied");
      return true;
    } catch (e) {
      toastError(e, "Copy");
      return false;
    }
  }

  async function pasteClipboard() {
    try {
      const text = await readText();
      if (!text) return;
      await api.ptyWrite(ptyId, toPtyText(text));
      focusTerminal();
    } catch (e) {
      toastError(e, "Paste");
    }
  }

  useEffect(() => {
    if (!hostRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontSize: 13,
      theme: terminalThemes[theme],
      allowProposedApi: true,
      rightClickSelectsWord: false,
      // Keep browser/OS clipboard shortcuts from being swallowed incorrectly.
      overviewRuler: undefined,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(hostRef.current);
    termRef.current = term;
    fitRef.current = fit;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitTerminal();
        term.focus();
      });
    });

    const unlistenOut = listen<string>(`pty-output-${ptyId}`, (ev) => {
      term.write(ev.payload);
    });
    const unlistenExit = listen<string>(`pty-exit-${ptyId}`, () => {
      term.writeln("\r\n\x1b[90m[session ended]\x1b[0m");
    });

    const onData = term.onData((data) => {
      void api.ptyWrite(ptyId, data);
    });

    const onResize = term.onResize(({ cols, rows }) => {
      void api.ptyResize(ptyId, cols, rows);
    });

    const onSel = term.onSelectionChange(() => {
      setHasSelection(Boolean(term.getSelection()));
    });

    // Keyboard copy/paste — xterm does not do this by itself.
    term.attachCustomKeyEventHandler((ev) => {
      if (ev.type !== "keydown") return true;
      const key = ev.key.toLowerCase();
      const mod = ev.ctrlKey || ev.metaKey;
      if (!mod) return true;

      // Copy: Ctrl+Shift+C, or Ctrl+C when there is a selection
      if (key === "c") {
        if (ev.shiftKey || term.hasSelection()) {
          ev.preventDefault();
          void copySelection(true);
          return false;
        }
        return true; // bare Ctrl+C → SIGINT via onData
      }

      // Paste: Ctrl+V or Ctrl+Shift+V
      if (key === "v") {
        ev.preventDefault();
        void pasteClipboard();
        return false;
      }

      // Copy all: Ctrl+Shift+A handled via select-all in menu; Ctrl+A often means "home" in shells
      return true;
    });

    const ro = new ResizeObserver(() => {
      fitTerminal();
    });
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();
      onData.dispose();
      onResize.dispose();
      onSel.dispose();
      void unlistenOut.then((u) => u());
      void unlistenExit.then((u) => u());
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptyId]);

  useEffect(() => {
    if (termRef.current?.options) {
      termRef.current.options.theme = terminalThemes[theme];
    }
  }, [theme]);

  useEffect(() => {
    if (!active) return;
    requestAnimationFrame(() => {
      fitTerminal();
      focusTerminal();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function onMenuAction(id: string) {
    const term = termRef.current;
    if (!term) return;
    if (id === "copy") {
      await copySelection();
    } else if (id === "paste") {
      await pasteClipboard();
    } else if (id === "selectAll") {
      term.selectAll();
      setHasSelection(true);
    } else if (id === "clear") {
      term.clear();
    }
  }

  const items: ContextMenuItem[] = [
    { id: "copy", label: "Copy", disabled: !hasSelection },
    { id: "paste", label: "Paste" },
    { id: "sep1", label: "", separator: true },
    { id: "selectAll", label: "Select all" },
    { id: "clear", label: "Clear scrollback" },
  ];

  return (
    <>
      <div
        ref={paneRef}
        className={`terminal-pane ${active ? "" : "is-hidden"}`}
        onPointerDown={(e) => {
          if (e.button === 1) {
            // Middle-click paste (common in terminals)
            e.preventDefault();
            void pasteClipboard();
            return;
          }
          if (e.button !== 0) return;
          pointerDownRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (e.button !== 0) return;
          const start = pointerDownRef.current;
          pointerDownRef.current = null;
          if (!start) return;
          if (Math.abs(e.clientX - start.x) > 4 || Math.abs(e.clientY - start.y) > 4) return;
          focusTerminal();
        }}
        onPointerCancel={() => {
          pointerDownRef.current = null;
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHasSelection(Boolean(termRef.current?.getSelection()));
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <div className="terminal-host" ref={hostRef} />
      </div>
      {menu && active && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={items}
          onAction={(id) => void onMenuAction(id)}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
}
