import type { Profile } from "../../types";

type Props = {
  groups: [string, Profile[]][];
  filteredEmpty: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onConnect: (profile: Profile) => void;
  onContextMenu: (e: React.MouseEvent, profile: Profile) => void;
};

export function ProfileList({
  groups,
  filteredEmpty,
  selectedId,
  onSelect,
  onConnect,
  onContextMenu,
}: Props) {
  return (
    <div className="sidebar-section profile-groups">
      <div className="sidebar-section-label">Profiles</div>
      {groups.map(([group, list]) => (
        <div key={group} className="group">
          <div className="group-title">{group}</div>
          {list.map((p) => (
            <div
              key={p.id}
              className={`profile-item ${selectedId === p.id ? "selected" : ""}`}
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
            </div>
          ))}
        </div>
      ))}
      {filteredEmpty && <p className="muted">No profiles yet — add one with +</p>}
    </div>
  );
}
