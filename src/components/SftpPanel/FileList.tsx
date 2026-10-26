import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import type { RemoteEntry } from "../../types";
import { iconProps, iconSizeSm } from "../icons";
import { FileTypeIcon } from "./fileIcon";
import { formatSize } from "./format";
import type { SortDir, SortKey } from "./sort";

type Props = {
  entries: RemoteEntry[];
  checked: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  busy: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onToggleAll: () => void;
  onRowClick: (e: React.MouseEvent, entry: RemoteEntry) => void;
  onOpen: (entry: RemoteEntry) => void;
  onContext: (e: React.MouseEvent, entry: RemoteEntry | null) => void;
  onTogglePath: (path: string) => void;
  onMarkLast: (path: string) => void;
  onDrop: (e: React.DragEvent) => void;
};

function SortLabel({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`sftp-sort-btn ${active ? "is-active" : ""}`} onClick={onClick}>
      {label}
      {active &&
        (dir === "asc" ? (
          <ArrowUpwardIcon {...iconProps(12)} />
        ) : (
          <ArrowDownwardIcon {...iconProps(12)} />
        ))}
    </button>
  );
}

export function SftpFileList({
  entries,
  checked,
  allChecked,
  someChecked,
  busy,
  sortKey,
  sortDir,
  onSort,
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
          <span className="sftp-name">
            <SortLabel
              label="Name"
              active={sortKey === "name"}
              dir={sortDir}
              onClick={() => onSort("name")}
            />
          </span>
          <span className="sftp-meta">
            <SortLabel
              label="Size"
              active={sortKey === "size"}
              dir={sortDir}
              onClick={() => onSort("size")}
            />
          </span>
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
            <FileTypeIcon name={e.name} isDir={e.isDir} size={iconSizeSm} />
            <span className="sftp-name">{e.name}</span>
            <span className="sftp-meta">{e.isDir ? "" : formatSize(e.size)}</span>
          </div>
        );
      })}
      {!entries.length && !busy && (
        <p className="muted sftp-list-empty">Empty — drop files here to upload</p>
      )}
    </div>
  );
}
