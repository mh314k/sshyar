import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sshyar-panel-layout";

export type MainLayoutMode = "terminal-first" | "sftp-first";

interface LayoutState {
  leftWidth: number;
  rightWidth: number;
  leftOpen: boolean;
  rightOpen: boolean;
  mainLayoutMode: MainLayoutMode;
  /** Fraction of center stack height for the top pane (0.2–0.8). */
  centerSplit: number;
  /** Whether the bottom (secondary) pane is open. */
  bottomOpen: boolean;
}

const DEFAULTS: LayoutState = {
  leftWidth: 280,
  rightWidth: 340,
  leftOpen: true,
  rightOpen: false,
  mainLayoutMode: "terminal-first",
  centerSplit: 0.62,
  bottomOpen: false,
};

function clampSplit(n: number) {
  return Math.min(0.8, Math.max(0.2, n));
}

function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as LayoutState;
    parsed.centerSplit = clampSplit(Number(parsed.centerSplit) || DEFAULTS.centerSplit);
    if (parsed.mainLayoutMode !== "sftp-first" && parsed.mainLayoutMode !== "terminal-first") {
      parsed.mainLayoutMode = DEFAULTS.mainLayoutMode;
    }
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

function saveLayout(s: LayoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function usePanelLayout() {
  const [layout, setLayout] = useState<LayoutState>(() => loadLayout());

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const setLeftOpen = useCallback((open: boolean) => {
    setLayout((l) => ({ ...l, leftOpen: open }));
  }, []);
  const setRightOpen = useCallback((open: boolean) => {
    setLayout((l) => ({ ...l, rightOpen: open }));
  }, []);
  const setLeftWidth = useCallback((w: number) => {
    setLayout((l) => ({ ...l, leftWidth: w }));
  }, []);
  const setRightWidth = useCallback((w: number) => {
    setLayout((l) => ({ ...l, rightWidth: w }));
  }, []);
  const setMainLayoutMode = useCallback((mode: MainLayoutMode) => {
    setLayout((l) => ({
      ...l,
      mainLayoutMode: mode,
      bottomOpen: mode === "sftp-first" ? true : l.bottomOpen,
    }));
  }, []);
  const toggleMainLayoutMode = useCallback(() => {
    setLayout((l) => {
      const next: MainLayoutMode =
        l.mainLayoutMode === "terminal-first" ? "sftp-first" : "terminal-first";
      return {
        ...l,
        mainLayoutMode: next,
        bottomOpen: next === "sftp-first" ? true : l.bottomOpen,
      };
    });
  }, []);
  const setCenterSplit = useCallback((ratio: number) => {
    setLayout((l) => ({ ...l, centerSplit: clampSplit(ratio) }));
  }, []);
  const setBottomOpen = useCallback((open: boolean) => {
    setLayout((l) => ({ ...l, bottomOpen: open }));
  }, []);
  const toggleBottomOpen = useCallback(() => {
    setLayout((l) => ({ ...l, bottomOpen: !l.bottomOpen }));
  }, []);
  /** Show SFTP pane (does not toggle the unrelated bottom panel in sftp-first). */
  const openSftpPane = useCallback(() => {
    setLayout((l) => {
      if (l.mainLayoutMode === "sftp-first") return l;
      return { ...l, bottomOpen: true };
    });
  }, []);
  /**
   * Activity-bar SFTP: show/hide the SFTP pane specifically.
   * In terminal-first, SFTP is the bottom pane → toggle bottomOpen.
   * In sftp-first, SFTP is the top pane → hide by switching to terminal-only.
   */
  const toggleSftpPane = useCallback(() => {
    setLayout((l) => {
      if (l.mainLayoutMode === "terminal-first") {
        return { ...l, bottomOpen: !l.bottomOpen };
      }
      return { ...l, mainLayoutMode: "terminal-first", bottomOpen: false };
    });
  }, []);

  return {
    leftOpen: layout.leftOpen,
    rightOpen: layout.rightOpen,
    leftWidth: layout.leftWidth,
    rightWidth: layout.rightWidth,
    mainLayoutMode: layout.mainLayoutMode,
    centerSplit: layout.centerSplit,
    bottomOpen: layout.bottomOpen,
    setLeftOpen,
    setRightOpen,
    setLeftWidth,
    setRightWidth,
    setMainLayoutMode,
    toggleMainLayoutMode,
    setCenterSplit,
    setBottomOpen,
    toggleBottomOpen,
    openSftpPane,
    toggleSftpPane,
  };
}

export type PanelLayoutApi = ReturnType<typeof usePanelLayout>;
