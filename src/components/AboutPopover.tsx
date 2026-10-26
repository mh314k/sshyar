import { useEffect, useState } from "react";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import { IconButton, iconProps, iconSize } from "./IconButton";

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
          <div className="about-version">License GPL-3.0-or-later</div>
        </div>
      </div>

      <p className="muted about-copy">
        A desktop SSH helper with an embedded terminal, profile vault, SFTP browser,
        snippets, and key management — for Windows and Linux.
        Free software under the GNU General Public License v3 or later.
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
                icon={<DownloadIcon {...iconProps(iconSize)} />}
                onClick={() => void open(update.downloadUrl!)}
              />
            ) : null}
            <IconButton
              variant="ghost"
              label="Open release"
              icon={<OpenInNewIcon {...iconProps(iconSize)} />}
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
          icon={<RefreshIcon {...iconProps(iconSize)} />}
          disabled={checking}
          onClick={() => void runCheck()}
        />
        <IconButton
          variant="ghost"
          label="GitHub"
          icon={<OpenInNewIcon {...iconProps(iconSize)} />}
          onClick={() => void open(`https://github.com/${GITHUB_REPO}`)}
        />
        <IconButton
          variant="ghost"
          label="Releases"
          icon={<OpenInNewIcon {...iconProps(iconSize)} />}
          onClick={() => void open(GITHUB_RELEASES_URL)}
        />
        <IconButton
          variant="ghost"
          label="GPL-3.0"
          icon={<OpenInNewIcon {...iconProps(iconSize)} />}
          onClick={() => void open("https://www.gnu.org/licenses/gpl-3.0.html")}
        />
      </div>
    </div>
  );
}
