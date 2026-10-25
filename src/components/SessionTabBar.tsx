import { Plus, RotateCcw, X } from "lucide-react";
import type { SessionTab } from "../types";
import { IconButton, iconSize, iconStroke } from "./IconButton";

interface Props {
  tabs: SessionTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onReconnect: (id: string) => void;
}

export function SessionTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNew,
  onReconnect,
}: Props) {
  return (
    <div className="tab-bar">
      <div className="tab-list">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`tab ${t.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(t.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(t.id);
              }
            }}
          >
            <span className={`dot status-${t.status}`} title={t.status} />
            <span className="tab-title">{t.title}</span>
            {t.profileId && (
              <IconButton
                className="tab-icon-btn"
                variant="icon"
                title="Reconnect"
                icon={<RotateCcw size={13} strokeWidth={iconStroke} />}
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
              icon={<X size={14} strokeWidth={iconStroke} />}
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
        icon={<Plus size={iconSize} strokeWidth={iconStroke} />}
        onClick={onNew}
      />
    </div>
  );
}
