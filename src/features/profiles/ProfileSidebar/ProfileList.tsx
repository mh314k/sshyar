import type { Profile } from "../../../types";

type Props = {
  groups: [string, Profile[]][];
  filteredEmpty: boolean;
  hasAnyProfiles: boolean;
  query: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onConnect: (profile: Profile) => void;
  onContextMenu: (e: React.MouseEvent, profile: Profile) => void;
  onClearSearch?: () => void;
};

export function ProfileList({
  groups,
  filteredEmpty,
  hasAnyProfiles,
  query,
  selectedId,
  onSelect,
  onConnect,
  onContextMenu,
  onClearSearch,
}: Props) {
  return (
    <div className="profile-groups">
      {groups.map(([group, list]) => (
        <div key={group} className="group">
          <div className="group-title">{group}</div>
          {list.map((p) => (
            <div
              key={p.id}
              className={`profile-item ${selectedId === p.id ? "selected" : ""}`}
              title="Double-click to connect"
              onClick={() => onSelect(selectedId === p.id ? null : p.id)}
              onDoubleClick={() => onConnect(p)}
              onContextMenu={(e) => onContextMenu(e, p)}
            >
              <div className="profile-name">{p.name}</div>
              <div className="profile-meta">
                {p.username}@{p.host}:{p.port}
              </div>
              {!!p.tags.length && (
                <div className="tags">
                  {p.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="profile-hint">Double-click to connect</div>
            </div>
          ))}
        </div>
      ))}
      {filteredEmpty && (
        <div className="profile-empty">
          {!hasAnyProfiles ? (
            <>
              <p className="muted">No profiles yet</p>
              <p className="muted profile-empty-sub">Use + above to add your first host.</p>
            </>
          ) : (
            <>
              <p className="muted">No matches for “{query.trim()}”</p>
              <p className="muted profile-empty-sub">Try another name, host, tag, or group.</p>
              {onClearSearch && (
                <button type="button" className="ghost profile-empty-clear" onClick={onClearSearch}>
                  Clear search
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
