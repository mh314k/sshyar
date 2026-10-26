import {
  ArrowUp,
  ClipboardPaste,
  Copy,
  Download,
  FolderPlus,
  Pencil,
  RefreshCw,
  Scissors,
  Trash2,
  Upload,
} from "lucide-react";
import { IconButton, iconStroke } from "../IconButton";
import type { ClipboardState } from "./types";
import type { RemoteEntry } from "../../types";

type Props = {
  sftpId: string | null;
  busy: boolean;
  hasSelection: boolean;
  hasFileSelection: boolean;
  single: RemoteEntry | null;
  clipboard: ClipboardState | null;
  onUp: () => void;
  onRefresh: () => void;
  onUpload: () => void;
  onDownload: () => void;
  onMkdir: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
};

export function SftpToolbar({
  sftpId,
  busy,
  hasSelection,
  hasFileSelection,
  single,
  clipboard,
  onUp,
  onRefresh,
  onUpload,
  onDownload,
  onMkdir,
  onRename,
  onDelete,
  onCopy,
  onCut,
  onPaste,
}: Props) {
  const navOff = !sftpId || busy;
  return (
    <div className="sftp-toolbar">
      <div className="sftp-toolbar-group" title="Navigate">
        <IconButton
          variant="soft"
          title="Up"
          disabled={navOff}
          onClick={onUp}
          icon={<ArrowUp size={14} strokeWidth={iconStroke} />}
        />
        <IconButton
          variant="soft"
          title="Refresh"
          disabled={navOff}
          onClick={onRefresh}
          icon={<RefreshCw size={14} strokeWidth={iconStroke} />}
        />
      </div>
      <span className="sftp-toolbar-divider" aria-hidden />
      <div className="sftp-toolbar-group" title="Transfer">
        <IconButton
          variant="soft"
          title="Upload"
          label="Upload"
          disabled={navOff}
          onClick={onUpload}
          icon={<Upload size={14} strokeWidth={iconStroke} />}
        />
        <IconButton
          variant="soft"
          title={hasFileSelection ? "Download selected" : "Select file(s) to download"}
          disabled={!hasFileSelection || busy}
          onClick={onDownload}
          icon={<Download size={14} strokeWidth={iconStroke} />}
        />
      </div>
      <span className="sftp-toolbar-divider" aria-hidden />
      <div className="sftp-toolbar-group" title="Edit">
        <IconButton
          variant="soft"
          title="New folder"
          disabled={navOff}
          onClick={onMkdir}
          icon={<FolderPlus size={14} strokeWidth={iconStroke} />}
        />
        <IconButton
          variant="soft"
          title="Rename"
          disabled={!single || busy}
          onClick={onRename}
          icon={<Pencil size={14} strokeWidth={iconStroke} />}
        />
        <IconButton
          variant="soft"
          title="Delete selected"
          disabled={!hasSelection || busy}
          onClick={onDelete}
          icon={<Trash2 size={14} strokeWidth={iconStroke} />}
        />
        <IconButton
          variant="soft"
          title="Copy selected"
          disabled={!hasSelection}
          onClick={onCopy}
          icon={<Copy size={14} strokeWidth={iconStroke} />}
        />
        <IconButton
          variant="soft"
          title="Cut selected"
          disabled={!hasSelection}
          onClick={onCut}
          icon={<Scissors size={14} strokeWidth={iconStroke} />}
        />
        <IconButton
          variant="soft"
          title="Paste"
          disabled={!clipboard || busy}
          onClick={onPaste}
          icon={<ClipboardPaste size={14} strokeWidth={iconStroke} />}
        />
      </div>
    </div>
  );
}
