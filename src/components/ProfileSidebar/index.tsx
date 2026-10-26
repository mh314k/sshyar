import { useEffect, useMemo, useRef, useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import AddIcon from "@mui/icons-material/Add";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ControlPointDuplicateOutlinedIcon from "@mui/icons-material/ControlPointDuplicateOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import UploadIcon from "@mui/icons-material/Upload";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import type { Profile, ProfileInput, Snippet } from "../../types";
import { api } from "../../lib/api";
import { appConfirm, appPasswordPrompt, appPrompt } from "../../lib/dialogs";
import { toastError, toastSuccess } from "../../lib/toast";
import type { ThemeMode } from "../../lib/theme";
import { APP_VERSION, checkForAppUpdate, type UpdateInfo } from "../../lib/version";
import { AboutPopover } from "../AboutPopover";
import { BrandLogo } from "../BrandLogo";
import { ContextMenu, type ContextMenuItem } from "../ContextMenu";
import { HelpModal } from "../HelpModal";
import { IconButton, iconProps, iconSize } from "../IconButton";
import { Popover } from "../Popover";
import { ProfileForm } from "../ProfileForm";
import { SnippetList } from "../SnippetList";
import { passwordStrengthHint } from "./passwordStrength";
import { ProfileList } from "./ProfileList";

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

type Panel = "actions" | "snippets" | "security" | "about" | null;

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  const actionsBtnRef = useRef<HTMLButtonElement>(null);
  const snippetsBtnRef = useRef<HTMLButtonElement>(null);
  const securityBtnRef = useRef<HTMLButtonElement>(null);
  const aboutBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    void checkForAppUpdate()
      .then((info) => {
        if (!cancelled) setUpdate(info);
      })
      .catch(() => {
        /* ignore background check failures */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function exportBackup() {
    setPanel(null);
    const result = await appPasswordPrompt({
      title: "Export vault backup",
      message:
        "Choose a password for this backup file. You will need it to import on another machine (independent of master password / DPAPI).",
      strengthHint: passwordStrengthHint,
    });
    if (!result) return;
    const path = await saveDialog({
      title: "Save vault backup",
      defaultPath: `sshyar-vault-${new Date().toISOString().slice(0, 10)}.sshyar-backup`,
      filters: [{ name: "SSHyar backup", extensions: ["sshyar-backup", "json"] }],
    });
    if (!path) return;
    try {
      const out = await api.vaultExportBackup(result.password, path);
      toastSuccess(
        `Saved ${out.profileCount} profile(s), ${out.snippetCount} snippet(s)`,
        "Vault backup",
      );
    } catch (e) {
      toastError(e, "Vault backup");
    }
  }

  async function importBackup() {
    setPanel(null);
    const path = await openDialog({
      title: "Import vault backup",
      multiple: false,
      filters: [{ name: "SSHyar backup", extensions: ["sshyar-backup", "json"] }],
    });
    if (!path || Array.isArray(path)) return;
    const pass = await appPrompt({
      title: "Import vault backup",
      message: "Enter the password used when this backup was exported.",
      password: true,
      placeholder: "Backup password",
    });
    if (!pass) return;
    const replace = await appConfirm({
      title: "Import mode",
      message:
        "Replace: wipe current profiles/snippets and load the backup.\nMerge: keep existing items; backup entries overwrite matching ids.",
      confirmLabel: "Replace all",
      danger: true,
    });
    // Cancel → false; user may want merge. Offer merge if they cancel replace?
    // Better: two-step — ask Merge first with secondary. Simpler: confirm Replace vs Merge via second dialog if first cancelled.
    let doReplace = replace;
    if (!replace) {
      const merge = await appConfirm({
        title: "Merge backup?",
        message: "Merge backup into the current vault (matching ids are overwritten).",
        confirmLabel: "Merge",
      });
      if (!merge) return;
      doReplace = false;
    }
    try {
      const out = await api.vaultImportBackup(pass, path, doReplace);
      onRefresh();
      toastSuccess(
        `${doReplace ? "Replaced" : "Merged"} · ${out.profiles} profile(s), ${out.snippets} snippet(s)`,
        "Vault import",
      );
    } catch (e) {
      toastError(e, "Vault import");
    }
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
          <div className="brand-text">
            <h1>SSHyar</h1>
            <span className="brand-version">v{APP_VERSION}</span>
          </div>
        </div>
        <div className="brand-actions">
          <IconButton
            ref={snippetsBtnRef}
            variant="icon"
            title="Snippets"
            className={panel === "snippets" ? "is-active" : ""}
            onClick={() => togglePanel("snippets")}
            icon={<BoltOutlinedIcon {...iconProps(iconSize)} />}
          />
          <IconButton
            variant="icon"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            onClick={onToggleTheme}
            icon={
              theme === "dark" ? (
                <LightModeOutlinedIcon {...iconProps(iconSize)} />
              ) : (
                <DarkModeOutlinedIcon {...iconProps(iconSize)} />
              )
            }
          />
          <IconButton
            ref={securityBtnRef}
            variant="icon"
            title="Master password"
            className={panel === "security" ? "is-active" : ""}
            onClick={() => togglePanel("security")}
            icon={<KeyOutlinedIcon {...iconProps(iconSize)} />}
          />
          <IconButton
            ref={aboutBtnRef}
            variant="icon"
            title={update ? `About — update v${update.latest} available` : "About"}
            className={`about-btn ${panel === "about" ? "is-active" : ""} ${update ? "has-update" : ""}`}
            onClick={() => togglePanel("about")}
            icon={<InfoOutlinedIcon {...iconProps(iconSize)} />}
          />
          <IconButton
            variant="icon"
            title="Help"
            className={helpOpen ? "is-active" : ""}
            onClick={() => {
              setPanel(null);
              setHelpOpen(true);
            }}
            icon={<HelpOutlinedIcon {...iconProps(iconSize)} />}
          />
          <IconButton
            variant="icon"
            title="New profile"
            onClick={() => setEditing(null)}
            icon={<AddIcon {...iconProps(iconSize)} />}
          />
          {onCollapse && (
            <IconButton
              variant="icon"
              title="Hide sidebar"
              onClick={onCollapse}
              icon={<ViewSidebarOutlinedIcon {...iconProps(iconSize)} />}
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

      <ProfileList
        groups={groups}
        filteredEmpty={!filtered.length}
        hasAnyProfiles={profiles.length > 0}
        query={query}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          if (!id) setPanel(null);
        }}
        onConnect={onConnect}
        onClearSearch={() => setQuery("")}
        onContextMenu={(e, p) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedId(p.id);
          setPanel(null);
          setMenu({ x: e.clientX, y: e.clientY, profile: p });
        }}
      />

      {selected && (
        <div className="profile-quickbar">
          <IconButton
            variant="primary"
            label="Connect"
            icon={<TerminalOutlinedIcon {...iconProps(16)} />}
            onClick={() => onConnect(selected)}
          />
          <IconButton
            ref={actionsBtnRef}
            variant="ghost"
            title="More actions"
            className={panel === "actions" ? "is-active" : ""}
            onClick={() => togglePanel("actions")}
            icon={<MoreHorizIcon {...iconProps(iconSize)} />}
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
              <OpenInNewIcon {...iconProps(16)} /> External terminal
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "copy")}>
              <ContentCopyIcon {...iconProps(16)} /> Copy SSH
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "edit")}>
              <EditOutlinedIcon {...iconProps(16)} /> Edit
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "duplicate")}>
              <ControlPointDuplicateOutlinedIcon {...iconProps(16)} /> Duplicate
            </button>
            <div className="popover-sep" />
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "genkey")}>
              <KeyOutlinedIcon {...iconProps(16)} /> Generate key
            </button>
            <button type="button" className="popover-item" onClick={() => void runProfileAction(selected, "install")}>
              <UploadIcon {...iconProps(16)} /> Install key
            </button>
            <div className="popover-sep" />
            <button
              type="button"
              className="popover-item danger"
              onClick={() => void runProfileAction(selected, "delete")}
            >
              <DeleteOutlinedIcon {...iconProps(16)} /> Delete
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
        <div className="popover-header">Vault & security</div>
        <p className="muted popover-copy">
          {hasMasterPassword
            ? "Vault unlocks with your master password."
            : "Vault is protected by Windows DPAPI (or a local key file on Linux). Optionally add a master password."}
        </p>
        {hasMasterPassword ? (
          <>
            <IconButton
              variant="ghost"
              label="Lock vault"
              icon={<LockOutlinedIcon {...iconProps(iconSize)} />}
              onClick={lockVault}
            />
            <IconButton variant="ghost" label="Change password" onClick={() => void changeMaster()} />
            <IconButton variant="ghost" label="Remove master password" onClick={() => void removeMaster()} />
          </>
        ) : (
          <IconButton variant="ghost" label="Set master password" onClick={() => void setMaster()} />
        )}
        <div className="popover-sep" />
        <IconButton
          variant="ghost"
          label="Export backup…"
          icon={<FileDownloadOutlinedIcon {...iconProps(iconSize)} />}
          onClick={() => void exportBackup()}
        />
        <IconButton
          variant="ghost"
          label="Import backup…"
          icon={<FileUploadOutlinedIcon {...iconProps(iconSize)} />}
          onClick={() => void importBackup()}
        />
      </Popover>

      <Popover
        open={panel === "about"}
        onClose={() => setPanel(null)}
        anchorRef={aboutBtnRef}
        width={300}
        align="end"
        className="popover-about"
      >
        <div className="popover-header">About</div>
        <AboutPopover update={update} onUpdateChange={setUpdate} />
      </Popover>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

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
