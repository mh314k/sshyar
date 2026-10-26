import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import DnsOutlinedIcon from "@mui/icons-material/DnsOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import { iconProps } from "./icons";

const STORAGE_KEY = "sshyar-panel-layout";

interface LayoutState {
  leftWidth: number;
  rightWidth: number;
  leftOpen: boolean;
  rightOpen: boolean;
}

const DEFAULTS: LayoutState = {
  leftWidth: 300,
  rightWidth: 340,
  leftOpen: true,
  rightOpen: true,
};

function loadLayout(): LayoutState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
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
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftOpen: boolean;
  rightOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  onRightOpenChange: (open: boolean) => void;
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

  return {
    leftOpen: layout.leftOpen,
    rightOpen: layout.rightOpen,
    leftWidth: layout.leftWidth,
    rightWidth: layout.rightWidth,
    setLeftOpen,
    setRightOpen,
    setLeftWidth,
    setRightWidth,
  };
}

type DragSide = "left" | "right";

export function PanelLayout({
  left,
  center,
  right,
  leftOpen,
  rightOpen,
  onLeftOpenChange,
  onRightOpenChange,
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

      if (dragging.current === "left") {
        onLeftWidthChange(Math.round(Math.min(maxLeft, Math.max(minLeft, e.clientX))));
      } else {
        const w = window.innerWidth - e.clientX;
        onRightWidthChange(Math.round(Math.min(maxRight, Math.max(minRight, w))));
      }
    },
    [onLeftWidthChange, onRightWidthChange],
  );

  const stopDrag = useCallback(() => {
    dragging.current = null;
    document.body.classList.remove("is-resizing");
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
    document.body.classList.add("is-resizing");
  }

  return (
    <div className="app-shell panel-layout">
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
      ) : (
        <button
          type="button"
          className="panel-rail panel-rail-left"
          title="Show sidebar"
          onClick={() => onLeftOpenChange(true)}
        >
          <DnsOutlinedIcon {...iconProps(16)} />
          <span>Profiles</span>
        </button>
      )}

      <div className="panel panel-center">{center}</div>

      {rightOpen ? (
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
      ) : (
        <button
          type="button"
          className="panel-rail panel-rail-right"
          title="Show SFTP"
          onClick={() => onRightOpenChange(true)}
        >
          <FolderOpenOutlinedIcon {...iconProps(16)} />
          <span>Files</span>
        </button>
      )}
    </div>
  );
}
