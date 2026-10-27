import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import type { UpdateDownloadState } from "../../hooks/useAppUpdate";
import type { UpdateInfo } from "../../lib/version";
import { iconProps } from "../../components/IconButton";

interface Props {
  info: UpdateInfo;
  download: UpdateDownloadState;
  onDownload: () => void;
  onInstall: () => void;
  onClose: () => void;
  onDontShowAgain: () => void;
}

function statusText(info: UpdateInfo, download: UpdateDownloadState): string {
  switch (download.phase) {
    case "downloading":
      return download.percent != null
        ? `Downloading v${info.latest}… ${download.percent}%`
        : `Downloading v${info.latest}…`;
    case "ready":
      return `v${info.latest} downloaded — click Update to run the installer`;
    case "installing":
      return "Starting installer… SSHyar will close";
    case "error":
      return download.error || "Download failed";
    default:
      return `v${info.latest} is available — download the installer in-app`;
  }
}

export function UpdateNotifier({
  info,
  download,
  onDownload,
  onInstall,
  onClose,
  onDontShowAgain,
}: Props) {
  const busy = download.phase === "downloading" || download.phase === "installing";
  const canDownload =
    Boolean(info.downloadUrl) &&
    (download.phase === "idle" || download.phase === "error");
  const canInstall = download.phase === "ready" && Boolean(download.path);

  return (
    <div className="update-notifier" role="status" aria-live="polite">
      <div className="update-notifier-body">
        <div className="update-notifier-title">Update available</div>
        <div className="update-notifier-message">{statusText(info, download)}</div>
        {download.phase === "downloading" ? (
          <div
            className="update-notifier-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={download.percent ?? undefined}
          >
            <div
              className="update-notifier-progress-bar"
              style={{
                width: download.percent != null ? `${download.percent}%` : "30%",
                opacity: download.percent != null ? 1 : 0.55,
              }}
            />
          </div>
        ) : null}
        <div className="update-notifier-actions">
          {canDownload ? (
            <button type="button" className="update-notifier-btn primary" onClick={onDownload} disabled={busy}>
              <DownloadIcon {...iconProps(14)} />
              Download
            </button>
          ) : null}
          {canInstall ? (
            <button type="button" className="update-notifier-btn primary" onClick={onInstall} disabled={busy}>
              <SystemUpdateAltIcon {...iconProps(14)} />
              Update
            </button>
          ) : null}
          <button
            type="button"
            className="update-notifier-btn"
            onClick={onDontShowAgain}
            disabled={busy}
          >
            Don&apos;t show again
          </button>
        </div>
      </div>
      <button
        type="button"
        className="update-notifier-close"
        title="Close"
        aria-label="Close"
        onClick={onClose}
        disabled={download.phase === "installing"}
      >
        <CloseIcon {...iconProps(14)} />
      </button>
    </div>
  );
}
