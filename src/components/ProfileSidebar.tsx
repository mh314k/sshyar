import { useMemo, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import type { Profile, ProfileInput, Snippet } from "../types";
import { api } from "../lib/api";
import type { ThemeMode } from "../lib/theme";
import { ProfileForm } from "./ProfileForm";
import { SnippetList } from "./SnippetList";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";

interface Props {
  profiles: Profile[];
  snippets: Snippet[];
  onRefresh: () => void;
  onConnect: (profile: Profile) => void;
  onExternal: (profile: Profile) => void;
  onRunSnippet: (command: string) => void;
  hasMasterPassword: boolean;
  onMasterPasswordChange: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onCollapse?: () => void;
}

export function ProfileSidebar({
  profiles,
  snippets,
  onRefresh,
  onConnect,
  onExternal,
  onRunSnippet,
  hasMasterPassword,
  onMasterPasswordChange,
  theme,
  onToggleTheme,
  onCollapse,
}: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Profile | null | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number; profile: Profile } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.host.toLowerCase().includes(q) ||
        p.group.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [profiles, query]);

  const groups = useMemo(() => {
    const map = new Map<string, Profile[]>();
    for (const p of filtered) {
      const g = p.group || "Default";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  async function save(input: ProfileInput) {
    await api.upsertProfile(editing?.id ?? null, input);
    setEditing(undefined);
    onRefresh();
  }

  async function copySsh(id: string) {
    const cmd = await api.getSshCommand(id);
    await writeText(cmd);
    setMsg("SSH command copied");
    setTimeout(() => setMsg(""), 2000);
  }

  async function genKey() {
    if (!selected) return;
    const pass = prompt("Key passphrase (empty = none)") ?? "";
    try {
      await api.generateProfileKey(selected.id, pass);
      setMsg("Key generated");
      onRefresh();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function installKey() {
    if (!selected) return;
    try {
      await api.installProfileKey(selected.id);
      setMsg("Public key installed on server");
      onRefresh();
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function setMaster() {
    const pass = prompt("New master password (min 6 chars)");
    if (!pass) return;
    try {
      await api.vaultSetMasterPassword(pass);
      onMasterPasswordChange();
      setMsg("Master password set — unlock required next launch");
    } catch (e) {
      setMsg(String(e));
    }
  }

  async function removeMaster() {
    if (!confirm("Remove master password and use DPAPI only?")) return;
    try {
      await api.vaultRemoveMasterPassword();
      onMasterPasswordChange();
      setMsg("Master password removed");
    } catch (e) {
      setMsg(String(e));
    }
  }

  if (editing !== undefined) {
    return (
      <aside className="sidebar">
        <ProfileForm
          initial={editing}
          onSave={save}
          onCancel={() => setEditing(undefined)}
        />
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-title">
          <img src="/app-icon.png" alt="" className="brand-logo" width={28} height={28} />
          <h1>SSHyar</h1>
        </div>
        <div className="brand-actions">
          <button
            type="button"
            className="ghost theme-toggle"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button className="ghost" onClick={() => setEditing(null)} title="New profile">
            +
          </button>
          {onCollapse && (
            <button className="ghost" onClick={onCollapse} title="Hide sidebar">
              ‹
            </button>
          )}
        </div>
      </div>
      <input
        className="search"
        placeholder="Search name, host, tag, group…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="profile-groups">
        {groups.map(([group, list]) => (
          <div key={group} className="group">
            <div className="group-title">{group}</div>
            {list.map((p) => (
              <div
                key={p.id}
                className={`profile-item ${selectedId === p.id ? "selected" : ""}`}
                onClick={() => setSelectedId(p.id)}
                onDoubleClick={() => onConnect(p)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedId(p.id);
                  setMenu({ x: e.clientX, y: e.clientY, profile: p });
                }}
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
        {!filtered.length && <p className="muted">No profiles yet</p>}
      </div>

      {selected && (
        <div className="profile-actions">
          <button onClick={() => onConnect(selected)}>Connect</button>
          <button className="ghost" onClick={() => onExternal(selected)}>
            External
          </button>
          <button className="ghost" onClick={() => copySsh(selected.id)}>
            Copy SSH
          </button>
          <button className="ghost" onClick={() => setEditing(selected)}>
            Edit
          </button>
          <button
            className="ghost"
            onClick={async () => {
              await api.duplicateProfile(selected.id);
              onRefresh();
            }}
          >
            Duplicate
          </button>
          <button className="ghost" onClick={genKey}>
            Generate key
          </button>
          <button className="ghost" onClick={installKey}>
            Install key
          </button>
          <button
            className="danger"
            onClick={async () => {
              if (!confirm(`Delete ${selected.name}?`)) return;
              await api.deleteProfile(selected.id);
              setSelectedId(null);
              onRefresh();
            }}
          >
            Delete
          </button>
        </div>
      )}

      <SnippetList snippets={snippets} onChange={onRefresh} onRun={onRunSnippet} />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={
            [
              { id: "connect", label: "Connect" },
              { id: "external", label: "Open external" },
              { id: "copy", label: "Copy SSH command" },
              { id: "sep1", label: "", separator: true },
              { id: "edit", label: "Edit" },
              { id: "duplicate", label: "Duplicate" },
              { id: "sep2", label: "", separator: true },
              { id: "delete", label: "Delete", danger: true },
            ] satisfies ContextMenuItem[]
          }
          onClose={() => setMenu(null)}
          onAction={(id) => {
            const p = menu.profile;
            void (async () => {
              if (id === "connect") onConnect(p);
              else if (id === "external") onExternal(p);
              else if (id === "copy") await copySsh(p.id);
              else if (id === "edit") setEditing(p);
              else if (id === "duplicate") {
                await api.duplicateProfile(p.id);
                onRefresh();
              } else if (id === "delete") {
                if (!confirm(`Delete ${p.name}?`)) return;
                await api.deleteProfile(p.id);
                setSelectedId(null);
                onRefresh();
              }
            })();
          }}
        />
      )}

      <div className="security-box">
        <h4>Security</h4>
        {hasMasterPassword ? (
          <button className="ghost" onClick={removeMaster}>
            Remove master password
          </button>
        ) : (
          <button className="ghost" onClick={setMaster}>
            Set master password
          </button>
        )}
      </div>

      {msg && <p className="hint">{msg}</p>}
    </aside>
  );
}
