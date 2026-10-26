import { useMemo, useRef, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  Copy,
  ExternalLink,
  KeyRound,
  Lock,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Plus,
  Sun,
  Trash2,
  Upload,
  CopyPlus,
  Terminal,
  Zap,
} from "lucide-react";
import type { Profile, ProfileInput, Snippet } from "../types";
import { api } from "../lib/api";
import { appConfirm, appPasswordPrompt, appPrompt } from "../lib/dialogs";
import { toastError, toastSuccess } from "../lib/toast";
import type { ThemeMode } from "../lib/theme";
import { ProfileForm } from "./ProfileForm";
import { SnippetList } from "./SnippetList";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { Popover } from "./Popover";
import { IconButton, iconSize, iconStroke } from "./IconButton";
import { BrandLogo } from "./BrandLogo";

interface Props {
  profiles: Profile[];
  snippets: Snippet[];
  onRefresh: () => void;
  onConnect: (profile: Profile) => void;
  onExternal: (profile: Profile) => void;
  onRunSnippet: (command: string) => void;
  hasMasterPassword: boolean;
  onMasterPasswordChange: () => void;
  onLock?: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onCollapse?: () => void;
}

type Panel = "actions" | "snippets" | "security" | null;

/** Soft hint only — never blocks setting the password. */
function passwordStrengthHint(password: string): string | null {
  const issues: string[] = [];
  if (password.length < 8) issues.push("shorter than 8 characters");
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  if (classes < 2) issues.push("only one character type");
  if (!issues.length) return null;
  return `This password looks weak (${issues.join(", ")}).`;
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
  onLock,
  theme,
  onToggleTheme,
  onCollapse,
}: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Profile | null | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; profile: Profile } | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  const actionsBtnRef = useRef<HTMLButtonElement>(null);
  const snippetsBtnRef = useRef<HTMLButtonElement>(null);
  const securityBtnRef = useRef<HTMLButtonElement>(null);

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

  function togglePanel(next: Panel) {
    setPanel((cur) => (cur === next ? null : next));
  }

  async function save(input: ProfileInput) {
    await api.upsertProfile(editing?.id ?? null, input);
    setEditing(undefined);
    onRefresh();
  }

  async function copySsh(id: string) {
    const cmd = await api.getSshCommand(id);
    await writeText(cmd);
    toastSuccess("SSH command copied");
  }

  async function genKey(profile: Profile) {
    const pass = await appPrompt({
      title: "Key passphrase",
      message: "Optional passphrase for the private key. Leave empty for none.",
      password: true,
      allowEmpty: true,
      placeholder: "Empty = none",
    });
    if (pass === null) return;
    try {
      await api.generateProfileKey(profile.id, pass);
      toastSuccess("Key generated");
      onRefresh();
    } catch (e) {
      toastError(e, "Keygen");
    }
  }

  async function installKey(profile: Profile) {
    try {
      await api.installProfileKey(profile.id);
      toastSuccess("Public key installed on server");
      onRefresh();
    } catch (e) {
      toastError(e, "Install key");
    }
  }

  async function setMaster() {
    setPanel(null);
    const result = await appPasswordPrompt({
      title: "Set master password",
      message: "Used to unlock the vault on next launch.",
      strengthHint: passwordStrengthHint,
    });
    if (!result) return;
    try {
      await api.vaultSetMasterPassword(result.password);
      onMasterPasswordChange();
      toastSuccess("Master password set — unlock required next launch");
    } catch (e) {
      toastError(e, "Master password");
    }
  }

  async function changeMaster() {
    setPanel(null);
    const result = await appPasswordPrompt({
      title: "Change master password",
      message: "Enter your current password, then choose a new one.",
      strengthHint: passwordStrengthHint,
      requireCurrent: true,
    });
    if (!result?.current) return;
    try {
      await api.vaultChangeMasterPassword(result.current, result.password);
      onMasterPasswordChange();
      toastSuccess("Master password changed");
    } catch (e) {
      toastError(e, "Master password");
    }
  }

  async function removeMaster() {
    setPanel(null);
    const pass = await appPrompt({
      title: "Remove master password",
      message: "Enter your current master password to confirm. Vault will use Windows DPAPI only.",
      password: true,
      placeholder: "Current password",
    });
    if (!pass) return;
    try {
      await api.vaultRemoveMasterPassword(pass);
      onMasterPasswordChange();
      toastSuccess("Master password removed");
    } catch (e) {
      toastError(e, "Master password");
    }
  }

  function lockVault() {
    setPanel(null);
    onLock?.();
  }

  async function runProfileAction(profile: Profile, id: string) {
    if (id === "connect") onConnect(profile);
    else if (id === "external") onExternal(profile);
    else if (id === "copy") await copySsh(profile.id);
    else if (id === "edit") setEditing(profile);
    else if (id === "duplicate") {
      await api.duplicateProfile(profile.id);
      onRefresh();
    } else if (id === "genkey") await genKey(profile);
    else if (id === "install") await installKey(profile);
    else if (id === "delete") {
      const ok = await appConfirm({
        title: `Delete ${profile.name}?`,
        message: "This cannot be undone.",
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
      await api.deleteProfile(profile.id);
      setSelectedId(null);
      onRefresh();
    }
    setPanel(null);
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
          <BrandLogo size={28} />
          <h1>SSHyar</h1>
        </div>
        <div className="brand-actions">
          <IconButton
            ref={snippetsBtnRef}
            variant="icon"
            title="Snippets"
            className={panel === "snippets" ? "is-active" : ""}
            onClick={() => togglePanel("snippets")}
            icon={<Zap size={iconSize} strokeWidth={iconStroke} />}
          />
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
            ref={securityBtnRef}
            variant="icon"
            title="Master password"
            className={panel === "security" ? "is-active" : ""}
            onClick={() => togglePanel("security")}
            icon={<KeyRound size={iconSize} strokeWidth={iconStroke} />}
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

      <div className="sidebar-section">
        <input
          className="search"
          placeholder="Search name, host, tag, group…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-section profile-groups">
        <div className="sidebar-section-label">Profiles</div>
        {groups.map(([group, list]) => (
          <div key={group} className="group">
            <div className="group-title">{group}</div>
            {list.map((p) => (
              <div
                key={p.id}
                className={`profile-item ${selectedId === p.id ? "selected" : ""}`}
                onClick={() => {
                  if (selectedId === p.id) {
                    setSelectedId(null);
                    setPanel(null);
                  } else {
                    setSelectedId(p.id);
                  }
                }}
                onDoubleClick={() => onConnect(p)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedId(p.id);
                  setPanel(null);
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
        {!filtered.length && <p className="muted">No profiles yet — add one with +</p>}
      </div>

      {selected && (
        <div className="profile-quickbar">
          <IconButton
            variant="primary"
            label="Connect"
            icon={<Terminal size={14} strokeWidth={iconStroke} />}
            onClick={() => onConnect(selected)}
          />
          <IconButton
            ref={actionsBtnRef}
            variant="ghost"
            title="More actions"
            className={panel === "actions" ? "is-active" : ""}
            onClick={() => togglePanel("actions")}
            icon={<MoreHorizontal size={iconSize} strokeWidth={iconStroke} />}
          />
        </div>
      )}

      <Popover
        open={panel === "actions" && !!selected}
        onClose={() => setPanel(null)}
        anchorRef={actionsBtnRef}
        width={220}
        align="end"
        className="popover-actions"
      >
        {selected && (
          <div className="popover-list">
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "external")}>
              <ExternalLink size={14} strokeWidth={iconStroke} /> External terminal
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "copy")}>
              <Copy size={14} strokeWidth={iconStroke} /> Copy SSH
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "edit")}>
              <Pencil size={14} strokeWidth={iconStroke} /> Edit
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "duplicate")}>
              <CopyPlus size={14} strokeWidth={iconStroke} /> Duplicate
            </button>
            <div className="popover-sep" />
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "genkey")}>
              <KeyRound size={14} strokeWidth={iconStroke} /> Generate key
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "install")}>
              <Upload size={14} strokeWidth={iconStroke} /> Install key
            </button>
            <div className="popover-sep" />
            <button
              type="button"
              className="popover-item danger"
              onClick={() => void runProfileAction(selected, "delete")}
            >
              <Trash2 size={14} strokeWidth={iconStroke} /> Delete
            </button>
          </div>
        )}
      </Popover>

      <Popover
        open={panel === "snippets"}
        onClose={() => setPanel(null)}
        anchorRef={snippetsBtnRef}
        width={280}
        align="end"
        className="popover-snippets"
      >
        <div className="popover-header">Snippets</div>
        <SnippetList
          snippets={snippets}
          onChange={onRefresh}
          onRun={(cmd) => {
            onRunSnippet(cmd);
            setPanel(null);
          }}
        />
      </Popover>

      <Popover
        open={panel === "security"}
        onClose={() => setPanel(null)}
        anchorRef={securityBtnRef}
        width={260}
        align="end"
        className="popover-security"
      >
        <div className="popover-header">Master password</div>
        <p className="muted popover-copy">
          {hasMasterPassword
            ? "Vault unlocks with your master password."
            : "Vault is protected by Windows DPAPI. Optionally add a master password."}
        </p>
        {hasMasterPassword ? (
          <>
            <IconButton
              variant="ghost"
              label="Lock vault"
              icon={<Lock size={iconSize} strokeWidth={iconStroke} />}
              onClick={lockVault}
            />
            <IconButton variant="ghost" label="Change password" onClick={() => void changeMaster()} />
            <IconButton variant="ghost" label="Remove master password" onClick={() => void removeMaster()} />
          </>
        ) : (
          <IconButton variant="ghost" label="Set master password" onClick={() => void setMaster()} />
        )}
      </Popover>

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
              { id: "genkey", label: "Generate key" },
              { id: "install", label: "Install key" },
              { id: "sep2", label: "", separator: true },
              { id: "delete", label: "Delete", danger: true },
            ] satisfies ContextMenuItem[]
          }
          onClose={() => setMenu(null)}
          onAction={(id) => {
            void runProfileAction(menu.profile, id);
          }}
        />
      )}
    </aside>
  );
}
