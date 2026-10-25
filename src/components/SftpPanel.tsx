import { useCallback, useEffect, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { api } from "../lib/api";
import type { RemoteEntry } from "../types";
import {
  ArrowUp,
  ClipboardPaste,
  Copy,
  Download,
  File,
  Folder,
  FolderPlus,
  Link2,
  PanelRightClose,
  Pencil,
  RefreshCw,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react";
import { ContextMenu, type ContextMenuItem } from "./ContextMenu";
import { RemoteFileEditor, type FileEditorMode } from "./RemoteFileEditor";
import { IconButton, iconSize, iconStroke } from "./IconButton";

interface Props {
  profileId: string | null;
  ptyId: string | null;
  open: boolean;
  onToggle: () => void;
}

/** Invisible OSC used by remote PROMPT_COMMAND when Follow shell is on. */
const CWD_OSC_RE = /\x1b\]7337;cwd=([^\x07\x1b]*)\x07/g;

// Sent as keystrokes into the remote bash session (after SSH). $vars expand on the VPS, not in JS.
const FOLLOW_SETUP =
  '__sshyar_pwd(){ printf \'\\033]7337;cwd=%s\\007\' "$PWD"; }; ' +
  'PROMPT_COMMAND="__sshyar_pwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}"; __sshyar_pwd';

export function SftpPanel({ profileId, ptyId, open: isOpen, onToggle }: Props) {
  const [sftpId, setSftpId] = useState<string | null>(null);
  const [cwd, setCwd] = useState("");
  const [entries, setEntries] = useState<RemoteEntry[]>([]);
  const [selected, setSelected] = useState<RemoteEntry | null>(null);
  const [clipboard, setClipboard] = useState<{ path: string; cut: boolean } | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [followShell, setFollowShell] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; entry: RemoteEntry | null } | null>(
    null,
  );
  const [editor, setEditor] = useState<{
    path: string;
    mode: FileEditorMode;
  } | null>(null);

  const sftpIdRef = useRef<string | null>(null);
  const cwdRef = useRef("");
  const followRef = useRef(false);
  const oscBufRef = useRef("");
  const navTimerRef = useRef<number | null>(null);

  useEffect(() => {
    sftpIdRef.current = sftpId;
  }, [sftpId]);
  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);
  useEffect(() => {
    followRef.current = followShell;
  }, [followShell]);

  const refresh = useCallback(async (id: string, path?: string) => {
    const list = await api.sftpList(id, path);
    setEntries(list);
    if (path) setCwd(path);
  }, []);

  const navigateFollow = useCallback(
    (path: string) => {
      const id = sftpIdRef.current;
      if (!id || !path) return;
      const normalized = path.replace(/\/+$/, "") || "/";
      if (normalized === cwdRef.current) return;
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
      navTimerRef.current = window.setTimeout(() => {
        void refresh(id, normalized).catch((err) => setError(String(err)));
      }, 120);
    },
    [refresh],
  );

  // Listen for cwd OSC from the active PTY while Follow is enabled
  useEffect(() => {
    if (!ptyId || !followShell) {
      oscBufRef.current = "";
      return;
    }
    let cancelled = false;
    const unlisten = listen<string>(`pty-output-${ptyId}`, (ev) => {
      if (!followRef.current || cancelled) return;
      oscBufRef.current = (oscBufRef.current + ev.payload).slice(-8000);
      CWD_OSC_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      let last: string | null = null;
      while ((match = CWD_OSC_RE.exec(oscBufRef.current)) !== null) {
        last = match[1];
      }
      if (last) {
        // Keep a short tail so split OSC across chunks still works
        const cut = oscBufRef.current.lastIndexOf("\x1b]7337;cwd=");
        oscBufRef.current = cut >= 0 ? oscBufRef.current.slice(cut) : "";
        navigateFollow(last);
      }
    });
    return () => {
      cancelled = true;
      void unlisten.then((u) => u());
    };
  }, [ptyId, followShell, navigateFollow]);

  // When Follow is turned on, install remote PROMPT_COMMAND reporter
  useEffect(() => {
    if (!followShell || !ptyId) return;
    void api.ptyInject(ptyId, FOLLOW_SETUP).catch((err) => {
      setError(`Follow setup failed: ${err}`);
    });
    setStatus("Follow shell: on — cd in terminal updates SFTP");
  }, [followShell, ptyId]);

  useEffect(() => {
    let cancelled = false;
    async function connect() {
      if (!isOpen || !profileId) {
        if (sftpId) {
          await api.sftpClose(sftpId).catch(() => undefined);
          setSftpId(null);
        }
        return;
      }
      setBusy(true);
      setError("");
      try {
        if (sftpId) {
          await api.sftpClose(sftpId).catch(() => undefined);
        }
        const { sftpId: id, cwd: c } = await api.sftpOpen(profileId);
        if (cancelled) {
          await api.sftpClose(id);
          return;
        }
        setSftpId(id);
        setCwd(c);
        await refresh(id, c);
        setStatus("Connected");
      } catch (err) {
        setError(String(err));
        setStatus("");
      } finally {
        setBusy(false);
      }
    }
    void connect();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, profileId]);

  async function goUp() {
    if (!sftpId || !cwd) return;
    const parent = cwd.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/";
    await refresh(sftpId, parent);
  }

  async function openEntry(e: RemoteEntry) {
    if (!sftpId) return;
    if (e.isDir) {
      await refresh(sftpId, e.path);
      setSelected(null);
    } else {
      setSelected(e);
      setEditor({ path: e.path, mode: "view" });
    }
  }

  async function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    if (!sftpId) return;
    const files = ev.dataTransfer.files;
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const localPath = (file as File & { path?: string }).path;
        if (!localPath) {
          setError("Drag path unavailable — use Upload button");
          continue;
        }
        const remotePath = `${cwd.replace(/\/$/, "")}/${file.name}`;
        setStatus(`Uploading ${file.name}...`);
        await api.sftpUpload(sftpId, localPath, remotePath);
      }
      await refresh(sftpId, cwd);
      setStatus("Upload done");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function uploadPicker() {
    if (!sftpId) return;
    const selectedPath = await open({ multiple: true });
    if (!selectedPath) return;
    const paths = Array.isArray(selectedPath) ? selectedPath : [selectedPath];
    setBusy(true);
    try {
      for (const p of paths) {
        const name = p.replace(/\\/g, "/").split("/").pop()!;
        await api.sftpUpload(sftpId, p, `${cwd.replace(/\/$/, "")}/${name}`);
      }
      await refresh(sftpId, cwd);
      setStatus("Upload done");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function downloadEntry(entry: RemoteEntry) {
    if (!sftpId || entry.isDir) return;
    const dest = await save({ defaultPath: entry.name });
    if (!dest) return;
    setBusy(true);
    try {
      await api.sftpDownload(sftpId, entry.path, dest);
      setStatus("Downloaded");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(entry: RemoteEntry) {
    if (!sftpId) return;
    if (!confirm(`Delete ${entry.name}?`)) return;
    setBusy(true);
    try {
      await api.sftpRemove(sftpId, entry.path, entry.isDir);
      setSelected(null);
      await refresh(sftpId, cwd);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function mkdir() {
    if (!sftpId) return;
    const name = prompt("Folder name");
    if (!name) return;
    await api.sftpMkdir(sftpId, `${cwd.replace(/\/$/, "")}/${name}`);
    await refresh(sftpId, cwd);
  }

  async function renameEntry(entry: RemoteEntry) {
    if (!sftpId) return;
    const name = prompt("New name", entry.name);
    if (!name || name === entry.name) return;
    const parent = entry.path.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/";
    await api.sftpRename(sftpId, entry.path, `${parent}/${name}`);
    setSelected(null);
    await refresh(sftpId, cwd);
  }

  async function paste() {
    if (!sftpId || !clipboard) return;
    const name = clipboard.path.replace(/\/+$/, "").split("/").pop()!;
    const dest = `${cwd.replace(/\/$/, "")}/${name}`;
    setBusy(true);
    try {
      if (clipboard.cut) {
        await api.sftpRename(sftpId, clipboard.path, dest);
        setClipboard(null);
      } else {
        await api.sftpCopyRemote(sftpId, clipboard.path, dest);
      }
      await refresh(sftpId, cwd);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  function openCtx(e: React.MouseEvent, entry: RemoteEntry | null) {
    e.preventDefault();
    e.stopPropagation();
    if (entry) setSelected(entry);
    setMenu({ x: e.clientX, y: e.clientY, entry });
  }

  async function onMenuAction(id: string) {
    const entry = menu?.entry;
    if (id === "open" && entry) await openEntry(entry);
    else if (id === "view" && entry && !entry.isDir) {
      setEditor({ path: entry.path, mode: "view" });
    } else if (id === "edit" && entry && !entry.isDir) {
      setEditor({ path: entry.path, mode: "edit" });
    } else if (id === "download" && entry) await downloadEntry(entry);
    else if (id === "rename" && entry) await renameEntry(entry);
    else if (id === "delete" && entry) await removeEntry(entry);
    else if (id === "copy" && entry) setClipboard({ path: entry.path, cut: false });
    else if (id === "cut" && entry) setClipboard({ path: entry.path, cut: true });
    else if (id === "paste") await paste();
    else if (id === "mkdir") await mkdir();
    else if (id === "upload") await uploadPicker();
    else if (id === "refresh" && sftpId) await refresh(sftpId, cwd);
  }

  const menuItems: ContextMenuItem[] = (() => {
    if (!menu) return [];
    if (!menu.entry) {
      return [
        { id: "upload", label: "Upload…", disabled: !sftpId || busy },
        { id: "mkdir", label: "New folder", disabled: !sftpId || busy },
        { id: "paste", label: "Paste", disabled: !clipboard || busy },
        { id: "sep1", label: "", separator: true },
        { id: "refresh", label: "Refresh", disabled: !sftpId || busy },
      ];
    }
    const entry = menu.entry;
    if (entry.isDir) {
      return [
        { id: "open", label: "Open" },
        { id: "rename", label: "Rename" },
        { id: "sep1", label: "", separator: true },
        { id: "copy", label: "Copy" },
        { id: "cut", label: "Cut" },
        { id: "paste", label: "Paste", disabled: !clipboard || busy },
        { id: "sep2", label: "", separator: true },
        { id: "delete", label: "Delete", danger: true },
      ];
    }
    return [
      { id: "view", label: "View" },
      { id: "edit", label: "Edit" },
      { id: "download", label: "Download" },
      { id: "rename", label: "Rename" },
      { id: "sep1", label: "", separator: true },
      { id: "copy", label: "Copy" },
      { id: "cut", label: "Cut" },
      { id: "paste", label: "Paste", disabled: !clipboard || busy },
      { id: "sep2", label: "", separator: true },
      { id: "delete", label: "Delete", danger: true },
    ];
  })();

  if (!isOpen) return null;

  return (
    <aside className="sftp-panel">
      <div className="sftp-header">
        <strong>SFTP</strong>
        <IconButton
          variant="icon"
          title="Hide SFTP"
          onClick={onToggle}
          icon={<PanelRightClose size={iconSize} strokeWidth={iconStroke} />}
        />
      </div>
      {!profileId ? (
        <p className="muted">Connect a profile session to browse files.</p>
      ) : (
        <>
          <label className="follow-shell" title="When checked, SFTP tracks the remote shell cwd (after SSH is connected)">
            <input
              type="checkbox"
              checked={followShell}
              disabled={!ptyId}
              onChange={(e) => setFollowShell(e.target.checked)}
            />
            <Link2 size={13} strokeWidth={iconStroke} />
            <span>Follow shell</span>
          </label>
          <div className="sftp-toolbar">
            <IconButton
              variant="soft"
              title="Up"
              disabled={!sftpId || busy}
              onClick={goUp}
              icon={<ArrowUp size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Refresh"
              disabled={!sftpId || busy}
              onClick={() => sftpId && void refresh(sftpId, cwd)}
              icon={<RefreshCw size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Upload"
              label="Upload"
              disabled={!sftpId || busy}
              onClick={() => void uploadPicker()}
              icon={<Upload size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Download"
              disabled={!selected || selected.isDir || busy}
              onClick={() => selected && void downloadEntry(selected)}
              icon={<Download size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="New folder"
              disabled={!sftpId || busy}
              onClick={() => void mkdir()}
              icon={<FolderPlus size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Rename"
              disabled={!selected || busy}
              onClick={() => selected && void renameEntry(selected)}
              icon={<Pencil size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Delete"
              disabled={!selected || busy}
              onClick={() => selected && void removeEntry(selected)}
              icon={<Trash2 size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Copy"
              disabled={!selected}
              onClick={() => selected && setClipboard({ path: selected.path, cut: false })}
              icon={<Copy size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Cut"
              disabled={!selected}
              onClick={() => selected && setClipboard({ path: selected.path, cut: true })}
              icon={<Scissors size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Paste"
              disabled={!clipboard || busy}
              onClick={() => void paste()}
              icon={<ClipboardPaste size={14} strokeWidth={iconStroke} />}
            />
          </div>
          <div className="sftp-path" title={cwd}>
            {cwd || "…"}
          </div>
          <div
            className="sftp-list"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onContextMenu={(e) => openCtx(e, null)}
          >
            {busy && <div className="sftp-busy">Working…</div>}
            {entries.map((e) => (
              <div
                key={e.path}
                className={`sftp-row ${selected?.path === e.path ? "selected" : ""}`}
                onClick={() => setSelected(e)}
                onDoubleClick={() => void openEntry(e)}
                onContextMenu={(ev) => openCtx(ev, e)}
              >
                <span className="sftp-icon">
                  {e.isDir ? (
                    <Folder size={15} strokeWidth={iconStroke} />
                  ) : (
                    <File size={15} strokeWidth={iconStroke} />
                  )}
                </span>
                <span className="sftp-name">{e.name}</span>
                <span className="sftp-meta">{e.isDir ? "" : formatSize(e.size)}</span>
              </div>
            ))}
            {!entries.length && !busy && (
              <p className="muted">Empty — drop files here to upload</p>
            )}
          </div>
          {status && <p className="hint">{status}</p>}
          {error && <p className="error">{error}</p>}
          {menu && (
            <ContextMenu
              x={menu.x}
              y={menu.y}
              items={menuItems}
              onAction={(id) => void onMenuAction(id)}
              onClose={() => setMenu(null)}
            />
          )}
          {editor && sftpId && (
            <RemoteFileEditor
              sftpId={sftpId}
              path={editor.path}
              mode={editor.mode}
              onClose={() => setEditor(null)}
            />
          )}
        </>
      )}
    </aside>
  );
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
