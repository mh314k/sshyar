import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import type { MainLayoutMode } from "./PanelLayout";
import { IconButton, iconProps, iconSize } from "./IconButton";

interface Props {
  mode: MainLayoutMode;
  centerSplit: number;
  bottomOpen: boolean;
  onModeChange: (mode: MainLayoutMode) => void;
  onCenterSplitChange: (ratio: number) => void;
  onBottomOpenChange: (open: boolean) => void;
  terminal: ReactNode;
  sftp: ReactNode;
  header: ReactNode;
}

export function MainSplit({
  mode,
  centerSplit,
  bottomOpen,
  onModeChange,
  onCenterSplitChange,
  onBottomOpenChange,
  terminal,
  sftp,
  header,
}: Props) {
  const stackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current || !stackRef.current) return;
      const rect = stackRef.current.getBoundingClientRect();
      if (rect.height < 40) return;
      const ratio = (e.clientY - rect.top) / rect.height;
      onCenterSplitChange(ratio);
    },
    [onCenterSplitChange],
  );

  const stopDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.classList.remove("is-resizing", "is-resizing-row");
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

  const terminalIsTop = mode === "terminal-first";
  const showSftp = mode === "sftp-first" || bottomOpen;
  const terminalVisible = terminalIsTop || bottomOpen;
  const bottomLabel = terminalIsTop ? "SFTP" : "Terminal";

  const topFlex = bottomOpen ? `${centerSplit} 1 0` : "1 1 0";
  const bottomFlex = `${1 - centerSplit} 1 0`;

  const terminalStyle: CSSProperties = !terminalVisible
    ? { display: "none" }
    : {
        order: terminalIsTop ? 1 : 3,
        flex: terminalIsTop ? topFlex : bottomFlex,
      };

  const sftpStyle: CSSProperties = {
    order: terminalIsTop ? 3 : 1,
    flex: terminalIsTop ? bottomFlex : topFlex,
  };

  return (
    <main className="main">
      <div className="main-header-row">
        {header}
        <div className="main-layout-actions">
          <IconButton
            variant="ghost"
            className="main-layout-btn"
            title={
              mode === "terminal-first" ? "Switch to SFTP on top" : "Switch to Terminal on top"
            }
            onClick={() =>
              onModeChange(mode === "terminal-first" ? "sftp-first" : "terminal-first")
            }
            icon={<SwapVertOutlinedIcon {...iconProps(iconSize)} />}
          />
          <IconButton
            variant="ghost"
            className={`main-layout-btn ${bottomOpen ? "is-active" : ""}`}
            title={bottomOpen ? `Hide ${bottomLabel}` : `Show ${bottomLabel}`}
            onClick={() => onBottomOpenChange(!bottomOpen)}
            icon={
              terminalIsTop ? (
                <FolderOutlinedIcon {...iconProps(iconSize)} />
              ) : (
                <TerminalOutlinedIcon {...iconProps(iconSize)} />
              )
            }
          />
        </div>
      </div>

      <div
        ref={stackRef}
        className={`main-split-stack ${bottomOpen ? "has-bottom" : "bottom-collapsed"}`}
      >
        <div className="main-split-pane main-split-terminal" style={terminalStyle}>
          {!terminalIsTop ? (
            <div className="main-split-bottom-bar">
              <span className="main-split-bottom-label">Terminal</span>
              <IconButton
                variant="icon"
                className="sidebar-hide-btn main-split-collapse"
                title="Hide panel"
                onClick={() => onBottomOpenChange(false)}
                icon={<ExpandMoreOutlinedIcon {...iconProps(iconSize)} />}
              />
            </div>
          ) : null}
          <div className="main-split-pane-body">{terminal}</div>
        </div>

        {bottomOpen ? (
          <div
            className="resize-handle resize-handle-row"
            style={{ order: 2 }}
            onPointerDown={(e) => {
              e.preventDefault();
              dragging.current = true;
              document.body.classList.add("is-resizing", "is-resizing-row");
            }}
            title="Drag to resize"
          />
        ) : null}

        {showSftp ? (
          <div className="main-split-pane main-split-sftp" style={sftpStyle}>
            {terminalIsTop ? (
              <div className="main-split-bottom-bar">
                <span className="main-split-bottom-label">SFTP</span>
                <IconButton
                  variant="icon"
                  className="sidebar-hide-btn main-split-collapse"
                  title="Hide panel"
                  onClick={() => onBottomOpenChange(false)}
                  icon={<ExpandMoreOutlinedIcon {...iconProps(iconSize)} />}
                />
              </div>
            ) : null}
            <div className="main-split-pane-body">{sftp}</div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
