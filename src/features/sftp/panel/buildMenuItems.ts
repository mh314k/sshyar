import type { RemoteEntry } from "../../../types";
import type { ContextMenuItem } from "../../../components/ContextMenu";
import type { ClipboardState } from "./types";

export function buildSftpMenuItems(opts: {
  menuEntry: RemoteEntry | null;
  targets: RemoteEntry[];
  clipboard: ClipboardState | null;
  sftpId: string | null;
  busy: boolean;
  /** Current SFTP folder — used for empty-area “cd in terminal”. */
  cwd?: string;
  ptyId?: string | null;
}): ContextMenuItem[] {
  const { menuEntry, targets, clipboard, sftpId, busy, cwd = "", ptyId = null } = opts;
  const n = targets.length;
  const multi = n > 1;

  if (!menuEntry && n === 0) {
    return [
      {
        id: "cd-terminal",
        label: "cd here in terminal",
        disabled: !ptyId || !cwd || busy,
      },
      { id: "sep0", label: "", separator: true },
      { id: "upload", label: "Upload…", disabled: !sftpId || busy },
      { id: "mkdir", label: "New folder", disabled: !sftpId || busy },
      { id: "paste", label: "Paste", disabled: !clipboard || busy },
      { id: "sep1", label: "", separator: true },
      { id: "refresh", label: "Refresh", disabled: !sftpId || busy },
    ];
  }

  if (multi) {
    const hasFile = targets.some((e) => !e.isDir);
    return [
      { id: "download", label: `Download (${n})`, disabled: !hasFile || busy },
      { id: "copy", label: `Copy (${n})` },
      { id: "cut", label: `Cut (${n})` },
      { id: "paste", label: "Paste", disabled: !clipboard || busy },
      { id: "sep1", label: "", separator: true },
      { id: "delete", label: `Delete (${n})`, danger: true },
    ];
  }

  const entry = targets[0] ?? menuEntry!;
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
}
