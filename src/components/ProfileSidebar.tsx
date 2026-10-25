import { useMemo, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  Copy,
  ExternalLink,
  KeyRound,
  Moon,
  PanelLeftClose,
  Pencil,
  Plus,
  Shield,
  Sun,
  Trash2,
  Upload,
  CopyPlus,
  Terminal,
} from "lucide-react";
import type { Profile, ProfileInput, Snippet } from "../types";
import { api } from "../lib/api";
import type { ThemeMode } from "../lib/theme";
import { ProfileForm } from "./ProfileForm";
import { SnippetList } from "./SnippetList";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { IconButton, iconSize, iconStroke } from "./IconButton";

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
          <IconButton
            variant="icon"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            onClick={onToggleTheme}
            icon={
              theme === "dark" ? (
                <Sun size={iconSize} strokeWidth={iconStroke} />
              ) : (
                <Moon size={iconSize} strokeWidth={iconStroke} />
              )
            }
          />
          <IconButton
            variant="icon"
            title="New profile"
            onClick={() => setEditing(null)}
            icon={<Plus size={iconSize} strokeWidth={iconStroke} />}
          />
          {onCollapse && (
            <IconButton
              variant="icon"
              title="Hide sidebar"
              onClick={onCollapse}
              icon={<PanelLeftClose size={iconSize} strokeWidth={iconStroke} />}
            />
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
          <IconButton
            variant="primary"
            label="Connect"
            icon={<Terminal size={14} strokeWidth={iconStroke} />}
            onClick={() => onConnect(selected)}
          />
          <IconButton
            variant="ghost"
            label="External"
            icon={<ExternalLink size={14} strokeWidth={iconStroke} />}
            onClick={() => onExternal(selected)}
          />
          <IconButton
            variant="ghost"
            label="Copy SSH"
            icon={<Copy size={14} strokeWidth={iconStroke} />}
            onClick={() => void copySsh(selected.id)}
          />
          <IconButton
            variant="ghost"
            label="Edit"
            icon={<Pencil size={14} strokeWidth={iconStroke} />}
            onClick={() => setEditing(selected)}
          />
          <IconButton
            variant="ghost"
            label="Duplicate"
            icon={<CopyPlus size={14} strokeWidth={iconStroke} />}
            onClick={async () => {
              await api.duplicateProfile(selected.id);
              onRefresh();
            }}
          />
          <IconButton
            variant="ghost"
            label="Generate key"
            icon={<KeyRound size={14} strokeWidth={iconStroke} />}
            onClick={() => void genKey()}
          />
          <IconButton
            variant="ghost"
            label="Install key"
            icon={<Upload size={14} strokeWidth={iconStroke} />}
            onClick={() => void installKey()}
          />
          <IconButton
            variant="danger"
            label="Delete"
            icon={<Trash2 size={14} strokeWidth={iconStroke} />}
            onClick={async () => {
              if (!confirm(`Delete ${selected.name}?`)) return;
              await api.deleteProfile(selected.id);
              setSelectedId(null);
              onRefresh();
            }}
          />
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
        <h4>
          <Shield size={13} strokeWidth={iconStroke} /> Security
        </h4>
        {hasMasterPassword ? (
          <IconButton
            variant="ghost"
            label="Remove master password"
            onClick={() => void removeMaster()}
          />
        ) : (
          <IconButton
            variant="ghost"
            label="Set master password"
            onClick={() => void setMaster()}
          />
        )}
      </div>

      {msg && <p className="hint">{msg}</p>}
    </aside>
  );
}
