import { useEffect, useState } from "react";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  APP_VERSION,
  GITHUB_RELEASES_URL,
  GITHUB_REPO,
  checkForAppUpdate,
  type UpdateInfo,
} from "../lib/version";
import { toastError } from "../lib/toast";
import { BrandLogo } from "./BrandLogo";
import { IconButton, iconSize, iconStroke } from "./IconButton";

interface Props {
  update: UpdateInfo | null;
  onUpdateChange: (info: UpdateInfo | null) => void;
}

export function AboutPopover({ update, onUpdateChange }: Props) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  async function runCheck() {
    setChecking(true);
    try {
      const info = await checkForAppUpdate();
      onUpdateChange(info);
      setChecked(true);
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

  return (
    <div className="about-panel">
      <div className="about-hero">
        <BrandLogo size={44} />
        <div>
          <div className="about-name">SSHyar</div>
          <div className="about-version">Version {APP_VERSION}</div>
        </div>
      </div>

      <p className="muted about-copy">
        A desktop SSH helper with embedded PowerShell (ConPTY), profile vault, SFTP browser,
        snippets, and key management — built for fast day-to-day server work on Windows.
      </p>

      <ul className="about-features muted">
        <li>Saved SSH profiles with encrypted vault</li>
        <li>Embedded terminal + external SSH launch</li>
        <li>Graphical SFTP and remote file editor</li>
        <li>Optional master password lock screen</li>
      </ul>

      {update ? (
        <div className="about-update">
          <div className="about-update-title">Update available</div>
          <p className="muted">
            You have <strong>v{update.current}</strong>. Latest release is{" "}
            <strong>v{update.latest}</strong>.
          </p>
          <div className="about-update-actions">
            {update.downloadUrl ? (
              <IconButton
                variant="primary"
                label="Download update"
                icon={<Download size={iconSize} strokeWidth={iconStroke} />}
                onClick={() => void open(update.downloadUrl!)}
              />
            ) : null}
            <IconButton
              variant="ghost"
              label="Open release"
              icon={<ExternalLink size={iconSize} strokeWidth={iconStroke} />}
              onClick={() => void open(update.htmlUrl)}
            />
          </div>
        </div>
      ) : checked ? (
        <p className="about-uptodate muted">You&apos;re on the latest release.</p>
      ) : null}

      <div className="about-footer">
        <IconButton
          variant="ghost"
          label={checking ? "Checking…" : "Check for updates"}
          icon={<RefreshCw size={iconSize} strokeWidth={iconStroke} />}
          disabled={checking}
          onClick={() => void runCheck()}
        />
        <IconButton
          variant="ghost"
          label="GitHub"
          icon={<ExternalLink size={iconSize} strokeWidth={iconStroke} />}
          onClick={() => void open(`https://github.com/${GITHUB_REPO}`)}
        />
        <IconButton
          variant="ghost"
          label="Releases"
          icon={<ExternalLink size={iconSize} strokeWidth={iconStroke} />}
          onClick={() => void open(GITHUB_RELEASES_URL)}
        />
      </div>
    </div>
  );
}
