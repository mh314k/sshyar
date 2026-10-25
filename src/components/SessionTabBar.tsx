import type { SessionTab } from "../types";

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
              <button
                className="tab-action"
                title="Reconnect"
                onClick={(e) => {
                  e.stopPropagation();
                  onReconnect(t.id);
                }}
              >
                ↻
              </button>
            )}
            <button
              className="tab-close"
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="tab-new" title="New local shell (Ctrl+T)" onClick={onNew}>
        +
      </button>
    </div>
  );
}
