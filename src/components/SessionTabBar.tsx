import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import type { SessionStatus, SessionTab } from "../types";
import { IconButton, iconProps, iconSize, iconSizeSm } from "./IconButton";

interface Props {
  tabs: SessionTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onReconnect: (id: string) => void;
  /** When true, omit outer tab-bar chrome (parent provides the row). */
  embedded?: boolean;
}

function statusLabel(status: SessionStatus): string {
  switch (status) {
    case "local":
      return "Local shell";
    case "connecting":
      return "Connecting…";
    case "connected":
      return "Connected";
    case "disconnected":
      return "Disconnected";
  }
}

function tabTooltip(t: SessionTab): string {
  const base = statusLabel(t.status);
  return t.hostLabel ? `${base} · ${t.hostLabel}` : base;
}

export function SessionTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  onReconnect,
  embedded = false,
}: Props) {
  const sm = iconProps(iconSizeSm);
  const inner = (
    <>
      <div className="tab-list">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab ${t.id === activeId ? "active" : ""}`}
            title={tabTooltip(t)}
            onClick={() => onSelect(t.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(t.id);
              }
            }}
          >
            <span
              className={`dot status-${t.status}`}
              title={tabTooltip(t)}
              aria-label={tabTooltip(t)}
            />
            <span className="tab-title">{t.title}</span>
            {t.profileId && (
              <IconButton
                className="tab-icon-btn"
                variant="icon"
                title="Reconnect"
                icon={<RestartAltIcon {...sm} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onReconnect(t.id);
                }}
              />
            )}
            <IconButton
              className="tab-icon-btn"
              variant="icon"
              title="Close"
              icon={<CloseIcon {...sm} />}
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.id);
              }}
            />
          </div>
        ))}
      </div>
      <IconButton
        className="tab-new"
        variant="ghost"
        title="New local shell (Ctrl+T)"
        icon={<AddIcon {...iconProps(iconSize)} />}
        onClick={onNew}
      />
    </>
  );
  if (embedded) return <div className="tab-bar tab-bar-embedded">{inner}</div>;
  return <div className="tab-bar">{inner}</div>;
}
