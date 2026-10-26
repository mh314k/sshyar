import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CreateNewFolderOutlinedIcon from "@mui/icons-material/CreateNewFolderOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadIcon from "@mui/icons-material/Upload";
import type { RemoteEntry } from "../../types";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";
import type { ClipboardState } from "./types";

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
  const ip = iconProps(iconSizeSm);
  return (
    <div className="sftp-toolbar">
      <div className="sftp-toolbar-group" title="Navigate">
        <IconButton
          variant="soft"
          title="Up"
          disabled={navOff}
          onClick={onUp}
          icon={<ArrowUpwardIcon {...ip} />}
        />
        <IconButton
          variant="soft"
          title="Refresh"
          disabled={navOff}
          onClick={onRefresh}
          icon={<RefreshIcon {...ip} />}
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
          icon={<UploadIcon {...ip} />}
        />
        <IconButton
          variant="soft"
          title={hasFileSelection ? "Download selected" : "Select file(s) to download"}
          disabled={!hasFileSelection || busy}
          onClick={onDownload}
          icon={<DownloadIcon {...ip} />}
        />
      </div>
      <span className="sftp-toolbar-divider" aria-hidden />
      <div className="sftp-toolbar-group" title="Edit">
        <IconButton
          variant="soft"
          title="New folder"
          disabled={navOff}
          onClick={onMkdir}
          icon={<CreateNewFolderOutlinedIcon {...ip} />}
        />
        <IconButton
          variant="soft"
          title="Rename"
          disabled={!single || busy}
          onClick={onRename}
          icon={<EditOutlinedIcon {...ip} />}
        />
        <IconButton
          variant="soft"
          title="Delete selected"
          disabled={!hasSelection || busy}
          onClick={onDelete}
          icon={<DeleteOutlinedIcon {...ip} />}
        />
        <IconButton
          variant="soft"
          title="Copy selected"
          disabled={!hasSelection}
          onClick={onCopy}
          icon={<ContentCopyIcon {...ip} />}
        />
        <IconButton
          variant="soft"
          title="Cut selected"
          disabled={!hasSelection}
          onClick={onCut}
          icon={<ContentCutIcon {...ip} />}
        />
        <IconButton
          variant="soft"
          title="Paste"
          disabled={!clipboard || busy}
          onClick={onPaste}
          icon={<ContentPasteIcon {...ip} />}
        />
      </div>
    </div>
  );
}
