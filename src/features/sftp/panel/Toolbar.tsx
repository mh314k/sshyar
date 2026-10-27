import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LinkIcon from "@mui/icons-material/Link";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadIcon from "@mui/icons-material/Upload";
import type { RemoteEntry } from "../../../types";
import { IconButton, iconProps, iconSizeSm } from "../../../components/IconButton";
import type { ClipboardState } from "./types";

type Props = {
  sftpId: string | null;
  busy: boolean;
  hasSelection: boolean;
  hasFileSelection: boolean;
  single: RemoteEntry | null;
  clipboard: ClipboardState | null;
  followShell: boolean;
  followDisabled: boolean;
  followTitle?: string;
  onFollowShellChange: (on: boolean) => void;
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
  followShell,
  followDisabled,
  followTitle = "When checked, SFTP tracks the remote shell cwd (after SSH is connected)",
  onFollowShellChange,
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
  const ip = iconProps(iconSizeSm);
  return (
    <div className="sftp-toolbar">
      <label
        className={`follow-shell follow-shell-inline ${followShell ? "is-on" : ""}`}
        title={followTitle}
      >
        <input
          type="checkbox"
          checked={followShell}
          disabled={followDisabled}
          onChange={(e) => onFollowShellChange(e.target.checked)}
        />
        <LinkIcon {...ip} />
        <span>Follow</span>
      </label>
      <span className="sftp-toolbar-divider" aria-hidden />
      <div className="sftp-toolbar-group" title="Navigate">
        <IconButton
          variant="icon"
          title="Up"
          disabled={navOff}
          onClick={onUp}
          icon={<ArrowUpwardIcon {...ip} />}
        />
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={navOff}
          onClick={onRefresh}
          icon={<RefreshIcon {...ip} />}
        />
      </div>
      <span className="sftp-toolbar-divider" aria-hidden />
      <div className="sftp-toolbar-group" title="Transfer">
        <IconButton
          variant="icon"
          title="Upload"
          disabled={navOff}
          onClick={onUpload}
          icon={<UploadIcon {...ip} />}
        />
        <IconButton
          variant="icon"
          title={hasFileSelection ? "Download selected" : "Select file(s) to download"}
          disabled={!hasFileSelection || busy}
          onClick={onDownload}
          icon={<DownloadIcon {...ip} />}
        />
      </div>
      <span className="sftp-toolbar-divider" aria-hidden />
      <div className="sftp-toolbar-group" title="Edit">
        <IconButton
          variant="icon"
          title="New folder"
          disabled={navOff}
          onClick={onMkdir}
          icon={<CreateNewFolderOutlinedIcon {...ip} />}
        />
        <IconButton
          variant="icon"
          title="Rename"
          disabled={!single || busy}
          onClick={onRename}
          icon={<EditOutlinedIcon {...ip} />}
        />
        <IconButton
          variant="icon"
          title="Delete selected"
          disabled={!hasSelection || busy}
          onClick={onDelete}
          icon={<DeleteOutlinedIcon {...ip} />}
        />
        <IconButton
          variant="icon"
          title="Copy selected"
          disabled={!hasSelection}
          onClick={onCopy}
          icon={<ContentCopyIcon {...ip} />}
        />
        <IconButton
          variant="icon"
          title="Cut selected"
          disabled={!hasSelection}
          onClick={onCut}
          icon={<ContentCutIcon {...ip} />}
        />
        <IconButton
          variant="icon"
          title="Paste"
          disabled={!clipboard || busy}
          onClick={onPaste}
          icon={<ContentPasteIcon {...ip} />}
        />
      </div>
    </div>
  );
}
