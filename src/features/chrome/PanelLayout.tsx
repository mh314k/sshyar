import { useCallback, useEffect, useRef, type ReactNode } from "react";

export { usePanelLayout, type MainLayoutMode } from "../../hooks/usePanelLayout";

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
