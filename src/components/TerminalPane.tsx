import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { listen } from "@tauri-apps/api/event";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { api } from "../lib/api";
import { terminalThemes, type ThemeMode } from "../lib/theme";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import "@xterm/xterm/css/xterm.css";

interface Props {
  ptyId: string;
  active: boolean;
  theme: ThemeMode;
}

export function TerminalPane({ ptyId, active, theme }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontSize: 13,
      theme: terminalThemes[theme],
      allowProposedApi: true,
      rightClickSelectsWord: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(containerRef.current);
    fit.fit();
    term.focus();

    termRef.current = term;
    fitRef.current = fit;

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

    void api.ptyResize(ptyId, term.cols, term.rows);

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      onData.dispose();
      onResize.dispose();
      onSel.dispose();
      void unlistenOut.then((u) => u());
      void unlistenExit.then((u) => u());
      term.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ptyId]);

  useEffect(() => {
    if (termRef.current?.options) {
      termRef.current.options.theme = terminalThemes[theme];
    }
  }, [theme]);

  useEffect(() => {
    if (active) {
      try {
        fitRef.current?.fit();
        termRef.current?.focus();
      } catch {
        /* ignore */
      }
    }
  }, [active]);

  async function onMenuAction(id: string) {
    const term = termRef.current;
    if (!term) return;
    if (id === "copy") {
      const sel = term.getSelection();
      if (sel) await writeText(sel);
    } else if (id === "paste") {
      try {
        const text = await readText();
        if (text) await api.ptyWrite(ptyId, text);
      } catch {
        /* clipboard empty / denied */
      }
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
        className="terminal-pane"
        style={{ display: active ? "flex" : "none" }}
        ref={containerRef}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHasSelection(Boolean(termRef.current?.getSelection()));
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      />
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
