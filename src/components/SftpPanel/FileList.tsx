import { File, Folder } from "lucide-react";
import type { RemoteEntry } from "../../types";
import { iconStroke } from "../IconButton";
import { formatSize } from "./format";

type Props = {
  entries: RemoteEntry[];
  checked: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  busy: boolean;
  onToggleAll: () => void;
  onRowClick: (e: React.MouseEvent, entry: RemoteEntry) => void;
  onOpen: (entry: RemoteEntry) => void;
  onContext: (e: React.MouseEvent, entry: RemoteEntry | null) => void;
  onTogglePath: (path: string) => void;
  onMarkLast: (path: string) => void;
  onDrop: (e: React.DragEvent) => void;
};

export function SftpFileList({
  entries,
  checked,
  allChecked,
  someChecked,
  busy,
  onToggleAll,
  onRowClick,
  onOpen,
  onContext,
  onTogglePath,
  onMarkLast,
  onDrop,
}: Props) {
  return (
    <div
      className="sftp-list"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onContextMenu={(e) => onContext(e, null)}
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
              onChange={onToggleAll}
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
            onDoubleClick={() => void onOpen(e)}
            onContextMenu={(ev) => onContext(ev, e)}
          >
            <label className="sftp-check" onClick={(ev) => ev.stopPropagation()}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {
                  onTogglePath(e.path);
                  onMarkLast(e.path);
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
      {!entries.length && !busy && <p className="muted">Empty — drop files here to upload</p>}
    </div>
  );
}
