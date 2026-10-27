import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import type { RemoteEntry } from "../../../types";
import { iconProps, iconSizeSm } from "../../../components/icons";
import { FileTypeIcon } from "./fileIcon";
import { formatSize } from "./format";
import type { SortDir, SortKey } from "./sort";

const TILE_ICON = 28;

type Props = {
  entries: RemoteEntry[];
  checked: Set<string>;
  allChecked: boolean;
  someChecked: boolean;
  busy: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  onSortKeyChange: (key: SortKey) => void;
  onSortDirToggle: () => void;
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
  sortKey,
  sortDir,
  onSortKeyChange,
  onSortDirToggle,
  onToggleAll,
  onRowClick,
  onOpen,
  onContext,
  onTogglePath,
  onMarkLast,
  onDrop,
}: Props) {
  const dirLabel =
    sortKey === "size"
      ? sortDir === "asc"
        ? "Small to large"
        : "Large to small"
      : sortDir === "asc"
        ? "A to Z"
        : "Z to A";
  const dirShort =
    sortKey === "size" ? (sortDir === "asc" ? "0→9" : "9→0") : sortDir === "asc" ? "A–Z" : "Z–A";

  return (
    <div
      className="sftp-list sftp-list-icons"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onContextMenu={(e) => onContext(e, null)}
    >
      {busy && <div className="sftp-busy">Working…</div>}
      {entries.length > 0 && (
        <div className="sftp-icons-toolbar">
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

          <label className="sftp-sort-field">
            <span className="sftp-sort-caption">Sort</span>
            <select
              className="sftp-sort-select"
              value={sortKey}
              aria-label="Sort by"
              onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
            >
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </label>

          <button
            type="button"
            className="sftp-sort-dir"
            title={`${dirLabel} — click to reverse`}
            aria-label={`Sort ${dirLabel}`}
            onClick={onSortDirToggle}
          >
            {sortDir === "asc" ? (
              <ArrowUpwardIcon {...iconProps(iconSizeSm)} />
            ) : (
              <ArrowDownwardIcon {...iconProps(iconSizeSm)} />
            )}
            <span>{dirShort}</span>
          </button>

          <span className="sftp-icons-count muted" title="Items in this folder">
            {entries.length}
          </span>
        </div>
      )}
      {entries.length > 0 ? (
        <div className="sftp-icons-grid">
          {entries.map((e) => {
            const isChecked = checked.has(e.path);
            const tip = e.isDir ? e.name : `${e.name} · ${formatSize(e.size)}`;
            return (
              <div
                key={e.path}
                className={`sftp-tile ${isChecked ? "selected" : ""}`}
                title={tip}
                onClick={(ev) => onRowClick(ev, e)}
                onDoubleClick={() => void onOpen(e)}
                onContextMenu={(ev) => onContext(ev, e)}
              >
                <label className="sftp-tile-check" onClick={(ev) => ev.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      onTogglePath(e.path);
                      onMarkLast(e.path);
                    }}
                  />
                </label>
                <FileTypeIcon name={e.name} isDir={e.isDir} size={TILE_ICON} />
                <span className="sftp-tile-name">{e.name}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {!entries.length && !busy && (
        <p className="muted sftp-list-empty">Empty — drop files here to upload</p>
      )}
    </div>
  );
}
