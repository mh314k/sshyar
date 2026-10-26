import { useEffect, useState } from "react";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import type { ThemeMode } from "../../lib/theme";
import { IconButton, iconProps, iconSize } from "../IconButton";
import { DockerPanel } from "../DockerPanel";
import { SftpPanel } from "../SftpPanel";

export type PluginTab = "sftp" | "docker";

interface Props {
  profileId: string | null;
  ptyId: string | null;
  dockerEnabled: boolean;
  onToggle: () => void;
  theme?: ThemeMode;
}

export function RightPlugins({
  profileId,
  ptyId,
  dockerEnabled,
  onToggle,
  theme = "dark",
}: Props) {
  const [tab, setTab] = useState<PluginTab>("sftp");

  useEffect(() => {
    if (!dockerEnabled && tab === "docker") setTab("sftp");
  }, [dockerEnabled, tab]);

  return (
    <div className="right-plugins">
      <div className="plugin-header">
        <div className="plugin-tabs" role="tablist" aria-label="Session plugins">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "sftp"}
            className={`plugin-tab ${tab === "sftp" ? "is-active" : ""}`}
            onClick={() => setTab("sftp")}
          >
            SFTP
          </button>
          {dockerEnabled ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "docker"}
              className={`plugin-tab ${tab === "docker" ? "is-active" : ""}`}
              onClick={() => setTab("docker")}
            >
              Docker
            </button>
          ) : null}
        </div>
        <IconButton
          variant="icon"
          title="Hide panel"
          onClick={onToggle}
          icon={<ViewSidebarOutlinedIcon {...iconProps(iconSize)} />}
        />
      </div>

      {tab === "sftp" ? (
        <SftpPanel
          profileId={profileId}
          ptyId={ptyId}
          open
          onToggle={onToggle}
          theme={theme}
          showChrome={false}
          dockerEnabled={dockerEnabled}
        />
      ) : (
        <DockerPanel profileId={profileId} enabled={dockerEnabled} />
      )}
    </div>
  );
}
