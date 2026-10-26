import { useEffect, useState } from "react";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import { api } from "../../lib/api";
import type { ThemeMode } from "../../lib/theme";
import { CronPanel } from "../CronPanel";
import { DockerJobBar } from "../dockerJob/DockerJobBar";
import { DockerJobProvider } from "../dockerJob/DockerJobContext";
import { DockerPanel } from "../DockerPanel";
import { IconButton, iconProps, iconSize } from "../IconButton";
import { NginxPanel } from "../NginxPanel";
import { SftpPanel } from "../SftpPanel";
import { SystemdPanel } from "../SystemdPanel";

export type PluginTab = "sftp" | "docker" | "nginx" | "systemd" | "cron";

export type PluginFlags = {
  docker: boolean;
  nginx: boolean;
  systemd: boolean;
  cron: boolean;
};

interface Props {
  profileId: string | null;
  ptyId: string | null;
  plugins: PluginFlags;
  onToggle: () => void;
  theme?: ThemeMode;
}

export function RightPlugins({
  profileId,
  ptyId,
  plugins,
  onToggle,
  theme = "dark",
}: Props) {
  const [tab, setTab] = useState<PluginTab>("sftp");
  const [sftpJumpPath, setSftpJumpPath] = useState<string | null>(null);

  const needsRemoteSession =
    plugins.docker || plugins.nginx || plugins.systemd || plugins.cron;

  useEffect(() => {
    if (tab === "docker" && !plugins.docker) setTab("sftp");
    else if (tab === "nginx" && !plugins.nginx) setTab("sftp");
    else if (tab === "systemd" && !plugins.systemd) setTab("sftp");
    else if (tab === "cron" && !plugins.cron) setTab("sftp");
  }, [plugins, tab]);

  function openComposeInSftp(path: string) {
    const normalized = path.trim().replace(/\/+$/, "") || "/";
    setSftpJumpPath(normalized);
    setTab("sftp");
  }

  useEffect(() => {
    if (!needsRemoteSession || !profileId) return;
    void api.dockerSessionEnsure(profileId).catch(() => undefined);
    return () => {
      void api.dockerSessionClose(profileId).catch(() => undefined);
    };
  }, [needsRemoteSession, profileId]);

  return (
    <DockerJobProvider>
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
            {plugins.docker ? (
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
            {plugins.nginx ? (
              <button
                type="button"
                role="tab"
                aria-selected={tab === "nginx"}
                className={`plugin-tab ${tab === "nginx" ? "is-active" : ""}`}
                onClick={() => setTab("nginx")}
              >
                Nginx
              </button>
            ) : null}
            {plugins.systemd ? (
              <button
                type="button"
                role="tab"
                aria-selected={tab === "systemd"}
                className={`plugin-tab ${tab === "systemd" ? "is-active" : ""}`}
                onClick={() => setTab("systemd")}
              >
                systemd
              </button>
            ) : null}
            {plugins.cron ? (
              <button
                type="button"
                role="tab"
                aria-selected={tab === "cron"}
                className={`plugin-tab ${tab === "cron" ? "is-active" : ""}`}
                onClick={() => setTab("cron")}
              >
                cron
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

        <div className="right-plugins-body">
          {tab === "sftp" ? (
            <SftpPanel
              profileId={profileId}
              ptyId={ptyId}
              open
              onToggle={onToggle}
              theme={theme}
              showChrome={false}
              dockerEnabled={plugins.docker}
              jumpPath={sftpJumpPath}
              onJumpPathConsumed={() => setSftpJumpPath(null)}
            />
          ) : null}
          {tab === "docker" ? (
            <DockerPanel
              profileId={profileId}
              enabled={plugins.docker}
              onOpenComposeInSftp={openComposeInSftp}
            />
          ) : null}
          {tab === "nginx" ? (
            <NginxPanel profileId={profileId} ptyId={ptyId} enabled={plugins.nginx} />
          ) : null}
          {tab === "systemd" ? (
            <SystemdPanel profileId={profileId} ptyId={ptyId} enabled={plugins.systemd} />
          ) : null}
          {tab === "cron" ? <CronPanel profileId={profileId} enabled={plugins.cron} /> : null}
        </div>

        {needsRemoteSession ? <DockerJobBar /> : null}
      </div>
    </DockerJobProvider>
  );
}
