import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

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

interface Props {
  menuBar: ReactNode;
  activityBar: ReactNode;
  statusBar: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftOpen: boolean;
  rightOpen: boolean;
  /** When false, hide the right pane entirely. */
  rightAvailable: boolean;
  leftWidth: number;
  rightWidth: number;
  onLeftWidthChange: (w: number) => void;
  onRightWidthChange: (w: number) => void;
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
      // sftp-first: SFTP is always the top pane — hide it → terminal fullscreen
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

type DragSide = "left" | "right";

export function PanelLayout({
  menuBar,
  activityBar,
  statusBar,
  left,
  center,
  right,
  leftOpen,
  rightOpen,
  rightAvailable,
  leftWidth,
  rightWidth,
  onLeftWidthChange,
  onRightWidthChange,
}: Props) {
  const dragging = useRef<DragSide | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      const minLeft = 200;
      const maxLeft = Math.min(520, window.innerWidth * 0.45);
      const minRight = 220;
      const maxRight = Math.min(560, window.innerWidth * 0.5);
      const activityW = 48; // keep in sync with --activity-w

      if (dragging.current === "left") {
        onLeftWidthChange(
          Math.round(Math.min(maxLeft, Math.max(minLeft, e.clientX - activityW))),
        );
      } else {
        const w = window.innerWidth - e.clientX;
        onRightWidthChange(Math.round(Math.min(maxRight, Math.max(minRight, w))));
      }
    },
    [onLeftWidthChange, onRightWidthChange],
  );

  const stopDrag = useCallback(() => {
    dragging.current = null;
    document.body.classList.remove("is-resizing", "is-resizing-col");
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [onPointerMove, stopDrag]);

  function startDrag(side: DragSide) {
    dragging.current = side;
    document.body.classList.add("is-resizing", "is-resizing-col");
  }

  const showRight = rightAvailable && rightOpen;

  return (
    <div className="app-shell vscode-shell">
      {menuBar}
      <div className="vscode-body">
        {activityBar}
        <div className="panel-layout">
          {leftOpen ? (
            <div className="panel panel-left" style={{ width: leftWidth }}>
              {left}
              <div
                className="resize-handle resize-handle-right"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrag("left");
                }}
                title="Drag to resize"
              />
            </div>
          ) : null}

          <div className="panel panel-center">{center}</div>

          {showRight ? (
            <div className="panel panel-right" style={{ width: rightWidth }}>
              <div
                className="resize-handle resize-handle-left"
                onPointerDown={(e) => {
                  e.preventDefault();
                  startDrag("right");
                }}
                title="Drag to resize"
              />
              {right}
            </div>
          ) : null}
        </div>
      </div>
      {statusBar}
    </div>
  );
}
