import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { api } from "../lib/api";
import { appConfirm, appPrompt } from "../lib/dialogs";
import { toast, toastError, toastSuccess } from "../lib/toast";
import type { RemoteEntry, TransferProgressEvent } from "../types";
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

type ClipItem = { path: string; name: string; isDir: boolean };
type ClipboardState = { items: ClipItem[]; cut: boolean };

type TransferFile = {
  name: string;
  bytesSent: number;
  bytesTotal: number;
  status: "pending" | "active" | "done" | "error";
};

type TransferState = {
  id: string;
  files: TransferFile[];
  overallSent: number;
  overallTotal: number;
};

const CWD_OSC_RE = /\x1b\]7337;cwd=([^\x07\x1b]*)\x07/g;

/** Remote bash helper — base64 avoids $ / escape corruption while typing into the PTY. */
function buildFollowInject(enable: boolean): string {
  const script = enable
    ? [
        // Use $'...' so OSC escapes are real ESC bytes; keep name free of ambiguous $tokens.
        "_sshyar_cwd(){ printf $'\\033]7337;cwd=%s\\007' \"$PWD\"; }",
        'case ";${PROMPT_COMMAND};" in *_sshyar_cwd*) ;; *) PROMPT_COMMAND="_sshyar_cwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}" ;; esac',
        "_sshyar_cwd",
      ].join("\n")
    : [
        'PROMPT_COMMAND="${PROMPT_COMMAND//_sshyar_cwd;/}"',
        'PROMPT_COMMAND="${PROMPT_COMMAND//;_sshyar_cwd/}"',
        'PROMPT_COMMAND="${PROMPT_COMMAND//_sshyar_cwd/}"',
        "unset -f _sshyar_cwd 2>/dev/null",
        "true",
      ].join("\n");

  const b64 = btoa(script);
  // Ctrl+U only (clear line) — never Ctrl+C, that aborts SSH / running commands.
  return `\x15eval "$(printf '%s' '${b64}' | base64 -d 2>/dev/null || printf '%s' '${b64}' | base64 -D 2>/dev/null)"`;
}

export function SftpPanel({ profileId, ptyId, open: isOpen, onToggle }: Props) {
  const [sftpId, setSftpId] = useState<string | null>(null);
  const [cwd, setCwd] = useState("");
  const [entries, setEntries] = useState<RemoteEntry[]>([]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [busy, setBusy] = useState(false);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
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
  const lastClickedRef = useRef<string | null>(null);
  const transferIdRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const followWasOnRef = useRef(false);
  const followPtyRef = useRef<string | null>(null);

  useEffect(() => {
    sftpIdRef.current = sftpId;
  }, [sftpId]);
  useEffect(() => {
    cwdRef.current = cwd;
  }, [cwd]);
  useEffect(() => {
    followRef.current = followShell;
  }, [followShell]);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    let cancelled = false;
    const unlisten = listen<TransferProgressEvent>("sftp-transfer-progress", (ev) => {
      if (cancelled) return;
      const p = ev.payload;
      if (!transferIdRef.current || p.transferId !== transferIdRef.current) return;
      setTransfer((prev) => {
        if (!prev || prev.id !== p.transferId) return prev;
        const files = prev.files.map((f, i) => {
          if (i !== p.fileIndex) {
            if (i < p.fileIndex && f.status !== "done") {
              return { ...f, bytesSent: f.bytesTotal || f.bytesSent, status: "done" as const };
            }
            return f;
          }
          const done = p.bytesTotal > 0 && p.bytesSent >= p.bytesTotal;
          return {
            name: p.fileName || f.name,
            bytesSent: p.bytesSent,
            bytesTotal: p.bytesTotal || f.bytesTotal,
            status: done ? ("done" as const) : ("active" as const),
          };
        });
        return {
          ...prev,
          files,
          overallSent: p.overallSent,
          overallTotal: p.overallTotal || prev.overallTotal,
        };
      });
    });
    return () => {
      cancelled = true;
      void unlisten.then((u) => u());
    };
  }, []);

  const refresh = useCallback(async (id: string, path?: string) => {
    const list = await api.sftpList(id, path);
    setEntries(list);
    if (path !== undefined) {
      setCwd(path);
      setChecked(new Set());
      lastClickedRef.current = null;
    } else {
      setChecked((prev) => {
        const next = new Set<string>();
        for (const e of list) if (prev.has(e.path)) next.add(e.path);
        return next;
      });
    }
  }, []);

  const selectedEntries = useMemo(
    () => entries.filter((e) => checked.has(e.path)),
    [entries, checked],
  );

  const allChecked = entries.length > 0 && selectedEntries.length === entries.length;
  const someChecked = selectedEntries.length > 0 && !allChecked;

  const navigateFollow = useCallback(
    (path: string) => {
      const id = sftpIdRef.current;
      if (!id || !path) return;
      const normalized = path.replace(/\/+$/, "") || "/";
      if (normalized === cwdRef.current) return;
      if (busyRef.current) return;
      if (navTimerRef.current) window.clearTimeout(navTimerRef.current);
      navTimerRef.current = window.setTimeout(() => {
        if (busyRef.current) return;
        void refresh(id, normalized).catch((err) => toastError(err, "SFTP"));
      }, 120);
    },
    [refresh],
  );

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

  useEffect(() => {
    if (!ptyId) {
      followWasOnRef.current = false;
      followPtyRef.current = null;
      return;
    }
    const wasOn = followWasOnRef.current;
    const ptyChanged = followPtyRef.current !== ptyId;
    followWasOnRef.current = followShell;
    followPtyRef.current = ptyId;

    let timer: number | undefined;

    if (followShell) {
      // After a new PTY/SSH session, wait for login before injecting.
      // When only toggling the checkbox on an existing session, inject sooner.
      const delayMs = ptyChanged ? 2500 : 600;
      timer = window.setTimeout(() => {
        void api
          .ptyInject(ptyId, buildFollowInject(true))
          .then(() => {
            toast("Follow shell on — cd in remote shell updates SFTP", { kind: "info" });
          })
          .catch((err) => {
            toastError(err, "Follow shell");
          });
      }, delayMs);
    } else if (wasOn) {
      // Only tear down when the user turns it off (not on first mount).
      void api.ptyInject(ptyId, buildFollowInject(false)).catch(() => undefined);
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
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
      } catch (err) {
        if (!cancelled) toastError(err, "SFTP connect");
        setSftpId(null);
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

  function togglePath(path: string, on?: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      const shouldOn = on ?? !next.has(path);
      if (shouldOn) next.add(path);
      else next.delete(path);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) setChecked(new Set());
    else setChecked(new Set(entries.map((e) => e.path)));
  }

  function onRowClick(e: React.MouseEvent, entry: RemoteEntry) {
    if ((e.target as HTMLElement).closest("input[type=checkbox]")) return;

    if (e.shiftKey && lastClickedRef.current) {
      const a = entries.findIndex((x) => x.path === lastClickedRef.current);
      const b = entries.findIndex((x) => x.path === entry.path);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setChecked((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(entries[i].path);
          return next;
        });
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      togglePath(entry.path);
      lastClickedRef.current = entry.path;
      return;
    }

    // plain click: select only this one (or deselect if already sole selection)
    setChecked((prev) => {
      if (prev.size === 1 && prev.has(entry.path)) return new Set();
      return new Set([entry.path]);
    });
    lastClickedRef.current = entry.path;
  }

  function targetsForAction(contextEntry: RemoteEntry | null | undefined): RemoteEntry[] {
    if (selectedEntries.length > 0) return selectedEntries;
    if (contextEntry) return [contextEntry];
    return [];
  }

  async function goUp() {
    if (!sftpId || !cwd) return;
    const parent = cwd.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/";
    await refresh(sftpId, parent);
  }

  async function openEntry(e: RemoteEntry) {
    if (!sftpId) return;
    if (e.isDir) {
      await refresh(sftpId, e.path);
    } else {
      setEditor({ path: e.path, mode: "view" });
    }
  }

  async function runUpload(
    items: { localPath: string; remotePath: string; name: string; sizeHint?: number }[],
  ) {
    if (!sftpId || !items.length) return;
    const transferId = crypto.randomUUID();
    transferIdRef.current = transferId;
    setTransfer({
      id: transferId,
      files: items.map((it) => ({
        name: it.name,
        bytesSent: 0,
        bytesTotal: it.sizeHint ?? 0,
        status: "pending",
      })),
      overallSent: 0,
      overallTotal: items.reduce((s, it) => s + (it.sizeHint ?? 0), 0),
    });
    setBusy(true);
    try {
      await api.sftpUploadBatch(
        sftpId,
        transferId,
        items.map(({ localPath, remotePath }) => ({ localPath, remotePath })),
      );
      await refresh(sftpId, cwd);
      toastSuccess(
        items.length === 1 ? "Upload done" : `Uploaded ${items.length} files`,
      );
    } catch (err) {
      toastError(err, "Upload");
      setTransfer((prev) =>
        prev
          ? {
              ...prev,
              files: prev.files.map((f) =>
                f.status === "active" || f.status === "pending"
                  ? { ...f, status: "error" as const }
                  : f,
              ),
            }
          : prev,
      );
    } finally {
      setBusy(false);
      transferIdRef.current = null;
      window.setTimeout(() => setTransfer(null), 1600);
    }
  }

  async function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    if (!sftpId) return;
    const files = ev.dataTransfer.files;
    if (!files?.length) return;
    const items: { localPath: string; remotePath: string; name: string; sizeHint?: number }[] = [];
    for (const file of Array.from(files)) {
      const localPath = (file as File & { path?: string }).path;
      if (!localPath) {
        toast("Drag path unavailable — use Upload", { kind: "error", title: "Upload" });
        continue;
      }
      items.push({
        localPath,
        remotePath: `${cwd.replace(/\/$/, "")}/${file.name}`,
        name: file.name,
        sizeHint: file.size,
      });
    }
    await runUpload(items);
  }

  async function uploadPicker() {
    if (!sftpId) return;
    const selectedPath = await open({ multiple: true });
    if (!selectedPath) return;
    const paths = Array.isArray(selectedPath) ? selectedPath : [selectedPath];
    const items = paths.map((p) => {
      const name = p.replace(/\\/g, "/").split("/").pop()!;
      return {
        localPath: p,
        remotePath: `${cwd.replace(/\/$/, "")}/${name}`,
        name,
      };
    });
    await runUpload(items);
  }

  async function downloadEntries(list: RemoteEntry[]) {
    if (!sftpId) return;
    const files = list.filter((e) => !e.isDir);
    if (!files.length) {
      toast("Select file(s) to download — folders not supported yet", {
        kind: "info",
        title: "Download",
      });
      return;
    }
    if (files.length === 1) {
      const dest = await save({ defaultPath: files[0].name });
      if (!dest) return;
      setBusy(true);
      try {
        await api.sftpDownload(sftpId, files[0].path, dest);
        toastSuccess("Downloaded");
      } catch (err) {
        toastError(err, "Download");
      } finally {
        setBusy(false);
      }
      return;
    }
    const dir = await open({ directory: true, title: "Download folder" });
    if (!dir || Array.isArray(dir)) return;
    setBusy(true);
    try {
      for (const f of files) {
        const dest = `${dir.replace(/[\\/]+$/, "")}\\${f.name}`;
        await api.sftpDownload(sftpId, f.path, dest);
      }
      toastSuccess(`Downloaded ${files.length} files`);
    } catch (err) {
      toastError(err, "Download");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntries(list: RemoteEntry[]) {
    if (!sftpId || !list.length) return;
    const ok = await appConfirm({
      title: list.length === 1 ? `Delete ${list[0].name}?` : `Delete ${list.length} items?`,
      message: list.some((e) => e.isDir)
        ? "Folders and their contents will be removed."
        : undefined,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      for (const entry of list) {
        await api.sftpRemove(sftpId, entry.path, entry.isDir);
      }
      setChecked(new Set());
      await refresh(sftpId, cwd);
      toastSuccess(list.length === 1 ? "Deleted" : `Deleted ${list.length} items`);
    } catch (err) {
      toastError(err, "Delete");
    } finally {
      setBusy(false);
    }
  }

  async function mkdir() {
    if (!sftpId) return;
    const name = await appPrompt({
      title: "New folder",
      placeholder: "Folder name",
    });
    if (!name?.trim()) return;
    try {
      await api.sftpMkdir(sftpId, `${cwd.replace(/\/$/, "")}/${name.trim()}`);
      await refresh(sftpId, cwd);
    } catch (err) {
      toastError(err, "New folder");
    }
  }

  async function renameEntry(entry: RemoteEntry) {
    if (!sftpId) return;
    const name = await appPrompt({
      title: "Rename",
      defaultValue: entry.name,
      placeholder: "New name",
    });
    if (!name?.trim() || name.trim() === entry.name) return;
    const parent = entry.path.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/";
    try {
      await api.sftpRename(sftpId, entry.path, `${parent}/${name.trim()}`);
      setChecked(new Set());
      await refresh(sftpId, cwd);
    } catch (err) {
      toastError(err, "Rename");
    }
  }

  function copyOrCut(list: RemoteEntry[], cut: boolean) {
    if (!list.length) return;
    setClipboard({
      items: list.map((e) => ({ path: e.path, name: e.name, isDir: e.isDir })),
      cut,
    });
    toast(
      cut
        ? `Cut ${list.length} item${list.length === 1 ? "" : "s"}`
        : `Copied ${list.length} item${list.length === 1 ? "" : "s"}`,
      { kind: "info" },
    );
  }

  async function paste() {
    if (!sftpId || !clipboard?.items.length) return;
    setBusy(true);
    try {
      let ok = 0;
      let skipped = 0;
      for (const item of clipboard.items) {
        const dest = `${cwd.replace(/\/$/, "")}/${item.name}`;
        if (item.path === dest || item.path.replace(/\/+$/, "") === dest.replace(/\/+$/, "")) {
          skipped++;
          continue;
        }
        if (clipboard.cut) {
          await api.sftpRename(sftpId, item.path, dest);
          ok++;
        } else if (item.isDir) {
          skipped++;
        } else {
          await api.sftpCopyRemote(sftpId, item.path, dest);
          ok++;
        }
      }
      if (clipboard.cut) setClipboard(null);
      setChecked(new Set());
      await refresh(sftpId, cwd);
      if (ok) toastSuccess(clipboard.cut ? `Moved ${ok}` : `Pasted ${ok}`);
      if (skipped && !clipboard.cut) {
        toast("Folder copy not supported yet — files only", { kind: "info", title: "Paste" });
      }
    } catch (err) {
      toastError(err, "Paste");
    } finally {
      setBusy(false);
    }
  }

  function openCtx(e: React.MouseEvent, entry: RemoteEntry | null) {
    e.preventDefault();
    e.stopPropagation();
    if (entry && !checked.has(entry.path)) {
      setChecked(new Set([entry.path]));
      lastClickedRef.current = entry.path;
    }
    setMenu({ x: e.clientX, y: e.clientY, entry });
  }

  async function onMenuAction(id: string) {
    const context = menu?.entry ?? null;
    const list = targetsForAction(context);
    if (id === "open" && context) await openEntry(context);
    else if (id === "view" && context && !context.isDir) {
      setEditor({ path: context.path, mode: "view" });
    } else if (id === "edit" && context && !context.isDir) {
      setEditor({ path: context.path, mode: "edit" });
    } else if (id === "download") await downloadEntries(list);
    else if (id === "rename" && list.length === 1) await renameEntry(list[0]);
    else if (id === "delete") await removeEntries(list);
    else if (id === "copy") copyOrCut(list, false);
    else if (id === "cut") copyOrCut(list, true);
    else if (id === "paste") await paste();
    else if (id === "mkdir") await mkdir();
    else if (id === "upload") await uploadPicker();
    else if (id === "refresh" && sftpId) await refresh(sftpId, cwd);
  }

  const menuItems: ContextMenuItem[] = (() => {
    if (!menu) return [];
    const list = targetsForAction(menu.entry);
    const n = list.length;
    const multi = n > 1;

    if (!menu.entry && n === 0) {
      return [
        { id: "upload", label: "Upload…", disabled: !sftpId || busy },
        { id: "mkdir", label: "New folder", disabled: !sftpId || busy },
        { id: "paste", label: "Paste", disabled: !clipboard || busy },
        { id: "sep1", label: "", separator: true },
        { id: "refresh", label: "Refresh", disabled: !sftpId || busy },
      ];
    }

    if (multi) {
      const hasFile = list.some((e) => !e.isDir);
      return [
        { id: "download", label: `Download (${n})`, disabled: !hasFile || busy },
        { id: "copy", label: `Copy (${n})` },
        { id: "cut", label: `Cut (${n})` },
        { id: "paste", label: "Paste", disabled: !clipboard || busy },
        { id: "sep1", label: "", separator: true },
        { id: "delete", label: `Delete (${n})`, danger: true },
      ];
    }

    const entry = list[0] ?? menu.entry!;
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

  const hasSelection = selectedEntries.length > 0;
  const single = selectedEntries.length === 1 ? selectedEntries[0] : null;

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
        <p className="muted sftp-empty">Connect a profile session to browse remote files here.</p>
      ) : (
        <>
          <label
            className="follow-shell"
            title="When checked, SFTP tracks the remote shell cwd (after SSH is connected)"
          >
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
              title="Download selected"
              disabled={!hasSelection || busy}
              onClick={() => void downloadEntries(selectedEntries)}
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
              disabled={!single || busy}
              onClick={() => single && void renameEntry(single)}
              icon={<Pencil size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Delete selected"
              disabled={!hasSelection || busy}
              onClick={() => void removeEntries(selectedEntries)}
              icon={<Trash2 size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Copy selected"
              disabled={!hasSelection}
              onClick={() => copyOrCut(selectedEntries, false)}
              icon={<Copy size={14} strokeWidth={iconStroke} />}
            />
            <IconButton
              variant="soft"
              title="Cut selected"
              disabled={!hasSelection}
              onClick={() => copyOrCut(selectedEntries, true)}
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
            {entries.length > 0 && (
              <div className="sftp-row sftp-row-head">
                <label className="sftp-check" title="Select all" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={toggleAll}
                  />
                </label>
                <span className="sftp-icon" aria-hidden />
                <span className="sftp-name">Name</span>
                <span className="sftp-meta">Size</span>
              </div>
            )}
            {entries.map((e) => {
              const isChecked = checked.has(e.path);
              return (
                <div
                  key={e.path}
                  className={`sftp-row ${isChecked ? "selected" : ""}`}
                  onClick={(ev) => onRowClick(ev, e)}
                  onDoubleClick={() => void openEntry(e)}
                  onContextMenu={(ev) => openCtx(ev, e)}
                >
                  <label className="sftp-check" onClick={(ev) => ev.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        togglePath(e.path);
                        lastClickedRef.current = e.path;
                      }}
                    />
                  </label>
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
              );
            })}
            {!entries.length && !busy && (
              <p className="muted">Empty — drop files here to upload</p>
            )}
          </div>
          {hasSelection && (
            <div className="sftp-selection-bar">
              <span>
                {selectedEntries.length} selected
                {clipboard ? ` · clipboard: ${clipboard.items.length}` : ""}
              </span>
              <button
                type="button"
                className="ghost sftp-clear-sel"
                onClick={() => setChecked(new Set())}
              >
                Clear
              </button>
            </div>
          )}
          {transfer && (
            <div className="sftp-transfer">
              <div className="sftp-transfer-head">
                <span>
                  Uploading {transfer.files.filter((f) => f.status === "done").length}/
                  {transfer.files.length}
                </span>
                <span className="sftp-transfer-pct">
                  {pct(transfer.overallSent, transfer.overallTotal)}%
                </span>
              </div>
              <div className="sftp-transfer-bar">
                <div
                  className="sftp-transfer-bar-fill"
                  style={{ width: `${pct(transfer.overallSent, transfer.overallTotal)}%` }}
                />
              </div>
              <div className="sftp-transfer-overall muted">
                {formatSize(transfer.overallSent)} / {formatSize(transfer.overallTotal || 0)}
                {transfer.overallTotal > transfer.overallSent
                  ? ` · ${formatSize(transfer.overallTotal - transfer.overallSent)} left`
                  : ""}
              </div>
              <ul className="sftp-transfer-files">
                {transfer.files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className={`sftp-transfer-file status-${f.status}`}>
                    <div className="sftp-transfer-file-row">
                      <span className="sftp-transfer-name" title={f.name}>
                        {f.name}
                      </span>
                      <span className="sftp-transfer-file-pct">
                        {f.status === "pending"
                          ? "…"
                          : f.status === "error"
                            ? "err"
                            : `${pct(f.bytesSent, f.bytesTotal)}%`}
                      </span>
                    </div>
                    <div className="sftp-transfer-bar thin">
                      <div
                        className="sftp-transfer-bar-fill"
                        style={{ width: `${pct(f.bytesSent, f.bytesTotal)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
  if (!n || n < 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function pct(sent: number, total: number) {
  if (!total || total <= 0) return sent > 0 ? 100 : 0;
  return Math.min(100, Math.round((sent / total) * 100));
}
