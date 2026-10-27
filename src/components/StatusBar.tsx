import type { SessionStatus } from "../types";
import type { MainLayoutMode } from "./PanelLayout";
import { APP_VERSION } from "../lib/version";

interface Props {
  status: SessionStatus | null;
  title: string | null;
  hostLabel: string | null;
  tabCount: number;
  layoutMode: MainLayoutMode;
}

function statusText(status: SessionStatus | null): string {
  if (!status) return "No session";
  switch (status) {
    case "local":
      return "Local";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "disconnected":
      return "Disconnected";
  }
}

export function StatusBar({ status, title, hostLabel, tabCount, layoutMode }: Props) {
  const layoutLabel = layoutMode === "sftp-first" ? "SFTP first" : "Terminal first";
  return (
    <footer className="status-bar" role="status">
      <div className="status-bar-left">
        <span className={`status-bar-pill status-${status ?? "none"}`}>
          {statusText(status)}
        </span>
        {title ? <span className="status-bar-item">{title}</span> : null}
        {hostLabel ? <span className="status-bar-item muted-on-status">{hostLabel}</span> : null}
      </div>
      <div className="status-bar-right">
        <span className="status-bar-item">
          {tabCount} tab{tabCount === 1 ? "" : "s"}
        </span>
        <span className="status-bar-item">{layoutLabel}</span>
        <span className="status-bar-item status-bar-version">v{APP_VERSION}</span>
      </div>
    </footer>
  );
}
