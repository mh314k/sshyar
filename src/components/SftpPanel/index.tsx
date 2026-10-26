import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import LinkIcon from "@mui/icons-material/Link";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import { api } from "../../lib/api";
import { appConfirm, appPrompt } from "../../lib/dialogs";
import { toast, toastError, toastSuccess } from "../../lib/toast";
import type { ThemeMode } from "../../lib/theme";
import type { RemoteEntry, TransferProgressEvent } from "../../types";
import { ContextMenu } from "../ContextMenu";
import { IconButton, iconProps, iconSize } from "../IconButton";
import { RemoteFileEditor, type FileEditorMode } from "../RemoteFileEditor";
import { buildSftpMenuItems } from "./buildMenuItems";
import { SftpFileList } from "./FileList";
import { buildFollowInject, CWD_OSC_RE } from "./followShell";
import { joinRemote, parentPath } from "./format";
import { SftpPathBar } from "./PathBar";
import { nextSort, sortEntries, type SortDir, type SortKey } from "./sort";
import { SftpToolbar } from "./Toolbar";
import { TransferBar } from "./TransferBar";
import {
  applyTransferProgress,
  initialTransfer,
  markTransferError,
} from "./transferState";
import type { ClipboardState, TransferState, UploadPlanItem } from "./types";

interface Props {
  profileId: string | null;
  ptyId: string | null;
  open: boolean;
  onToggle: () => void;
  theme?: ThemeMode;
}

export function SftpPanel({ profileId, ptyId, open: isOpen, onToggle, theme = "dark" }: Props) {
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
  const [editor, setEditor] = useState<{ path: string; mode: FileEditorMode } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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
        return applyTransferProgress(prev, p);
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

  const sortedEntries = useMemo(
    () => sortEntries(entries, sortKey, sortDir),
    [entries, sortKey, sortDir],
  );

  const selectedEntries = useMemo(
    () => sortedEntries.filter((e) => checked.has(e.path)),
    [sortedEntries, checked],
  );

  const allChecked = sortedEntries.length > 0 && selectedEntries.length === sortedEntries.length;
  const someChecked = selectedEntries.length > 0 && !allChecked;
  const hasFileSelection = selectedEntries.some((e) => !e.isDir);

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

  function beginTransfer(state: TransferState) {
    transferIdRef.current = state.id;
    setTransfer(state);
  }

  function endTransfer(ok: boolean) {
    if (!ok) setTransfer(markTransferError);
    setBusy(false);
    transferIdRef.current = null;
    window.setTimeout(() => setTransfer(null), 1600);
  }

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
    else setChecked(new Set(sortedEntries.map((e) => e.path)));
  }

  function onSort(key: SortKey) {
    const next = nextSort(sortKey, sortDir, key);
    setSortKey(next.key);
    setSortDir(next.dir);
  }

  function onRowClick(e: React.MouseEvent, entry: RemoteEntry) {
    if ((e.target as HTMLElement).closest("input[type=checkbox]")) return;

    if (e.shiftKey && lastClickedRef.current) {
      const a = sortedEntries.findIndex((x) => x.path === lastClickedRef.current);
      const b = sortedEntries.findIndex((x) => x.path === entry.path);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        setChecked((prev) => {
          const next = new Set(prev);
          for (let i = lo; i <= hi; i++) next.add(sortedEntries[i].path);
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
    await refresh(sftpId, parentPath(cwd));
  }

  async function openEntry(e: RemoteEntry) {
    if (!sftpId) return;
    if (e.isDir) await refresh(sftpId, e.path);
    else setEditor({ path: e.path, mode: "view" });
  }

  async function runUpload(items: UploadPlanItem[]) {
    if (!sftpId || !items.length) return;
    const transferId = crypto.randomUUID();
    beginTransfer(initialTransfer(transferId, "upload", items));
    setBusy(true);
    try {
      await api.sftpUploadBatch(
        sftpId,
        transferId,
        items.map(({ localPath, remotePath }) => ({ localPath, remotePath })),
      );
      await refresh(sftpId, cwd);
      toastSuccess(items.length === 1 ? "Upload done" : `Uploaded ${items.length} files`);
      endTransfer(true);
    } catch (err) {
      toastError(err, "Upload");
      endTransfer(false);
    }
  }

  async function onDrop(ev: React.DragEvent) {
    ev.preventDefault();
    if (!sftpId) return;
    const files = ev.dataTransfer.files;
    if (!files?.length) return;
    const items: UploadPlanItem[] = [];
    for (const file of Array.from(files)) {
      const localPath = (file as File & { path?: string }).path;
      if (!localPath) {
        toast("Drag path unavailable — use Upload", { kind: "error", title: "Upload" });
        continue;
      }
      items.push({
        localPath,
        remotePath: joinRemote(cwd, file.name),
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
      return { localPath: p, remotePath: joinRemote(cwd, name), name };
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
    const transferId = crypto.randomUUID();
    beginTransfer(initialTransfer(transferId, "delete", list));
    setBusy(true);
    try {
      await api.sftpRemoveBatch(
        sftpId,
        transferId,
        list.map((e) => ({ path: e.path, isDir: e.isDir })),
      );
      setChecked(new Set());
      await refresh(sftpId, cwd);
      toastSuccess(list.length === 1 ? "Deleted" : `Deleted ${list.length} items`);
      endTransfer(true);
    } catch (err) {
      toastError(err, "Delete");
      endTransfer(false);
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
      await api.sftpMkdir(sftpId, joinRemote(cwd, name.trim()));
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
    try {
      await api.sftpRename(sftpId, entry.path, `${parentPath(entry.path)}/${name.trim()}`);
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
    const items: { from: string; to: string; name: string }[] = [];
    let skipped = 0;
    for (const item of clipboard.items) {
      const dest = joinRemote(cwd, item.name);
      const fromNorm = item.path.replace(/\/+$/, "");
      const destNorm = dest.replace(/\/+$/, "");
      if (fromNorm === destNorm || destNorm.startsWith(`${fromNorm}/`)) {
        skipped++;
        continue;
      }
      items.push({ from: item.path, to: dest, name: item.name });
    }
    if (!items.length) {
      if (skipped) {
        toast("Skipped items that would overwrite themselves", {
          kind: "info",
          title: "Paste",
        });
      }
      return;
    }

    const cut = clipboard.cut;
    const transferId = crypto.randomUUID();
    beginTransfer(initialTransfer(transferId, cut ? "move" : "copy", items));
    setBusy(true);
    try {
      const payload = items.map(({ from, to }) => ({ from, to }));
      if (cut) {
        await api.sftpMoveBatch(sftpId, transferId, payload);
        setClipboard(null);
      } else {
        await api.sftpCopyBatch(sftpId, transferId, payload);
      }
      setChecked(new Set());
      await refresh(sftpId, cwd);
      toastSuccess(
        cut
          ? items.length === 1
            ? "Move done"
            : `Moved ${items.length} items`
          : items.length === 1
            ? "Copy done"
            : `Copied ${items.length} items`,
      );
      if (skipped) {
        toast("Skipped items that would overwrite themselves", {
          kind: "info",
          title: "Paste",
        });
      }
      endTransfer(true);
    } catch (err) {
      toastError(err, "Paste");
      endTransfer(false);
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

  const menuItems = menu
    ? buildSftpMenuItems({
        menuEntry: menu.entry,
        targets: targetsForAction(menu.entry),
        clipboard,
        sftpId,
        busy,
      })
    : [];

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
          icon={<ViewSidebarOutlinedIcon {...iconProps(iconSize)} />}
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
            <LinkIcon {...iconProps(14)} />
            <span>Follow shell</span>
          </label>
          <SftpToolbar
            sftpId={sftpId}
            busy={busy}
            hasSelection={hasSelection}
            hasFileSelection={hasFileSelection}
            single={single}
            clipboard={clipboard}
            onUp={() => void goUp()}
            onRefresh={() => sftpId && void refresh(sftpId, cwd)}
            onUpload={() => void uploadPicker()}
            onDownload={() => void downloadEntries(selectedEntries)}
            onMkdir={() => void mkdir()}
            onRename={() => single && void renameEntry(single)}
            onDelete={() => void removeEntries(selectedEntries)}
            onCopy={() => copyOrCut(selectedEntries, false)}
            onCut={() => copyOrCut(selectedEntries, true)}
            onPaste={() => void paste()}
          />
          <SftpPathBar
            cwd={cwd}
            disabled={!sftpId || busy}
            onNavigate={(path) => sftpId && void refresh(sftpId, path)}
          />
          <SftpFileList
            entries={sortedEntries}
            checked={checked}
            allChecked={allChecked}
            someChecked={someChecked}
            busy={busy}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={onSort}
            onToggleAll={toggleAll}
            onRowClick={onRowClick}
            onOpen={(e) => void openEntry(e)}
            onContext={openCtx}
            onTogglePath={togglePath}
            onMarkLast={(path) => {
              lastClickedRef.current = path;
            }}
            onDrop={(e) => void onDrop(e)}
          />
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
          {transfer && <TransferBar transfer={transfer} />}
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
              theme={theme}
              onClose={() => setEditor(null)}
            />
          )}
        </>
      )}
    </aside>
  );
}
