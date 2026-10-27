import { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  APP_VERSION,
  GITHUB_RELEASES_URL,
  GITHUB_REPO,
  checkForAppUpdate,
  type UpdateInfo,
} from "../../lib/version";
import { toastError } from "../../lib/toast";
import type { UpdateDownloadState } from "../../hooks/useAppUpdate";
import { BrandLogo } from "./BrandLogo";
import { IconButton, iconProps, iconSize } from "../../components/IconButton";

interface Props {
  update: UpdateInfo | null;
  onUpdateChange: (info: UpdateInfo | null) => void;
  download: UpdateDownloadState;
  onDownload: () => void;
  onInstall: () => void;
}

function hostLabel(): string {
  const p = (navigator.platform || "").toLowerCase();
  const ua = (navigator.userAgent || "").toLowerCase();
  if (p.includes("win") || ua.includes("windows")) return "Windows";
  if (p.includes("linux") || ua.includes("linux")) return "Linux";
  return "Desktop";
}

export function AboutPopover({ update, onUpdateChange, download, onDownload, onInstall }: Props) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const platform = hostLabel();

  async function runCheck() {
    setChecking(true);
    try {
      const info = await checkForAppUpdate();
      onUpdateChange(info);
    } catch (e) {
      toastError(e, "Update check");
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function open(url: string) {
    try {
      await openUrl(url);
    } catch (e) {
      toastError(e, "Open link");
    }
  }

  const busy = download.phase === "downloading" || download.phase === "installing";
  const canDownload =
    Boolean(update?.downloadUrl) && (download.phase === "idle" || download.phase === "error");
  const canInstall = download.phase === "ready" && Boolean(download.path);

  return (
    <div className="about-panel">
      <header className="about-hero">
        <BrandLogo size={44} />
        <div className="about-hero-text">
          <h1 className="about-name">SSHyar</h1>
          <p className="about-tagline">
            SSH, SFTP, and server tools in one window — no agents on the host.
          </p>
        </div>
      </header>

      <div className="about-meta" role="list">
        <div className="about-meta-item" role="listitem">
          <span className="about-meta-label">Version</span>
          <span className="about-meta-value">v{APP_VERSION}</span>
        </div>
        <div className="about-meta-item" role="listitem">
          <span className="about-meta-label">Platform</span>
          <span className="about-meta-value">{platform}</span>
        </div>
        <div className="about-meta-item" role="listitem">
          <span className="about-meta-label">License</span>
          <span className="about-meta-value">GPL-3.0+</span>
        </div>
      </div>

      {update ? (
        <section className="about-update" aria-live="polite">
          <div className="about-update-kicker">Update available</div>
          <p className="about-update-body">
            <span className="about-ver">v{update.current}</span>
            <span className="about-update-arrow" aria-hidden>
              →
            </span>
            <span className="about-ver is-latest">v{update.latest}</span>
          </p>
          <p className="muted about-update-hint">
            {!update.downloadUrl
              ? `No ${platform} installer in this release — open the page to pick an asset.`
              : download.phase === "downloading"
                ? download.percent != null
                  ? `Downloading… ${download.percent}%`
                  : "Downloading installer…"
                : download.phase === "ready"
                  ? "Installer ready — Update launches it and closes SSHyar."
                  : download.phase === "installing"
                    ? "Starting installer…"
                    : download.phase === "error"
                      ? download.error || "Download failed — try again."
                      : `SSHyar downloads the ${platform} installer, then Update runs it.`}
          </p>
          {download.phase === "downloading" ? (
            <div className="about-update-progress" role="progressbar">
              <div
                className="about-update-progress-bar"
                style={{
                  width: download.percent != null ? `${download.percent}%` : "30%",
                  opacity: download.percent != null ? 1 : 0.55,
                }}
              />
            </div>
          ) : null}
          <div className="about-update-actions">
            {canDownload ? (
              <IconButton
                variant="primary"
                label={`Download for ${platform}`}
                icon={<DownloadIcon {...iconProps(iconSize)} />}
                disabled={busy}
                onClick={onDownload}
              />
            ) : null}
            {canInstall ? (
              <IconButton
                variant="primary"
                label="Update"
                icon={<SystemUpdateAltIcon {...iconProps(iconSize)} />}
                disabled={busy}
                onClick={onInstall}
              />
            ) : null}
            <IconButton
              variant="soft"
              label="Release notes"
              icon={<OpenInNewIcon {...iconProps(iconSize)} />}
              onClick={() => void open(update.htmlUrl)}
            />
          </div>
        </section>
      ) : (
        <div className="about-status" aria-live="polite">
          <span className="about-status-text muted">
            {checking
              ? "Checking for updates…"
              : checked
                ? "You're on the latest release."
                : "Updates not checked yet."}
          </span>
          <button
            type="button"
            className="about-check-btn"
            disabled={checking}
            onClick={() => void runCheck()}
          >
            <RefreshIcon {...iconProps(14)} />
            {checking ? "Checking…" : "Check again"}
          </button>
        </div>
      )}

      <footer className="about-footer">
        <button type="button" className="about-link" onClick={() => void open(`https://github.com/${GITHUB_REPO}`)}>
          GitHub
        </button>
        <span className="about-link-sep" aria-hidden>
          ·
        </span>
        <button type="button" className="about-link" onClick={() => void open(GITHUB_RELEASES_URL)}>
          Releases
        </button>
        <span className="about-link-sep" aria-hidden>
          ·
        </span>
        <button
          type="button"
          className="about-link"
          onClick={() => void open("https://www.gnu.org/licenses/gpl-3.0.html")}
        >
          GPL-3.0
        </button>
      </footer>
    </div>
  );
}
