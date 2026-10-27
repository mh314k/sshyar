import { useEffect } from "react";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import { api } from "../../lib/api";
import { CronPanel } from "../CronPanel";
import { DockerJobBar } from "../dockerJob/DockerJobBar";
import { DockerPanel } from "../DockerPanel";
import { IconButton, iconProps, iconSize } from "../IconButton";
import { MonitorPanel } from "../MonitorPanel";
import { NginxPanel } from "../NginxPanel";
import { SystemdPanel } from "../SystemdPanel";

export type PluginTab = "docker" | "nginx" | "systemd" | "cron" | "monitor";

export type PluginFlags = {
  docker: boolean;
  nginx: boolean;
  systemd: boolean;
  cron: boolean;
  monitor: boolean;
};

export function anyPluginEnabled(plugins: PluginFlags): boolean {
  return (
    plugins.docker ||
    plugins.nginx ||
    plugins.systemd ||
    plugins.cron ||
    plugins.monitor
  );
}

/** Same order as the activity bar: overview → OS → containers → web → schedules */
export function firstEnabledTab(plugins: PluginFlags): PluginTab | null {
  if (plugins.monitor) return "monitor";
  if (plugins.systemd) return "systemd";
  if (plugins.docker) return "docker";
  if (plugins.nginx) return "nginx";
  if (plugins.cron) return "cron";
  return null;
}

const TAB_LABEL: Record<PluginTab, string> = {
  docker: "Docker",
  nginx: "Nginx",
  systemd: "systemd",
  cron: "cron",
  monitor: "Monitor",
};

interface Props {
  profileId: string | null;
  ptyId: string | null;
  plugins: PluginFlags;
  activeTab: PluginTab;
  onToggle: () => void;
  onOpenComposeInSftp?: (path: string) => void;
}

export function RightPlugins({
  profileId,
  ptyId,
  plugins,
  activeTab,
  onToggle,
  onOpenComposeInSftp,
}: Props) {
  const needsRemoteSession = anyPluginEnabled(plugins);
  const tab = plugins[activeTab] ? activeTab : firstEnabledTab(plugins);

  useEffect(() => {
    if (!needsRemoteSession || !profileId) return;
    void api.dockerSessionEnsure(profileId).catch(() => undefined);
    return () => {
      void api.dockerSessionClose(profileId).catch(() => undefined);
    };
  }, [needsRemoteSession, profileId]);

  if (!needsRemoteSession || !tab) {
    return (
      <div className="right-plugins">
        <div className="plugin-header">
          <span className="plugin-header-title">Plugins</span>
          <IconButton
            variant="icon"
            className="sidebar-hide-btn"
            title="Hide panel"
            onClick={onToggle}
            icon={<ChevronRightOutlinedIcon {...iconProps(iconSize)} />}
          />
        </div>
        <div className="right-plugins-body">
          <p className="muted plugin-empty">No plugins enabled for this profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="right-plugins">
      <div className="plugin-header">
        <span className="plugin-header-title">{TAB_LABEL[tab]}</span>
        <IconButton
          variant="icon"
          className="sidebar-hide-btn"
          title="Hide panel"
          onClick={onToggle}
          icon={<ChevronRightOutlinedIcon {...iconProps(iconSize)} />}
        />
      </div>

      <div className="right-plugins-body">
        {tab === "docker" ? (
          <DockerPanel
            profileId={profileId}
            enabled={plugins.docker}
            onOpenComposeInSftp={onOpenComposeInSftp}
          />
        ) : null}
        {tab === "nginx" ? (
          <NginxPanel profileId={profileId} ptyId={ptyId} enabled={plugins.nginx} />
        ) : null}
        {tab === "systemd" ? (
          <SystemdPanel profileId={profileId} ptyId={ptyId} enabled={plugins.systemd} />
        ) : null}
        {tab === "cron" ? <CronPanel profileId={profileId} enabled={plugins.cron} /> : null}
        {tab === "monitor" ? (
          <MonitorPanel profileId={profileId} enabled={plugins.monitor} />
        ) : null}
      </div>

      {needsRemoteSession ? <DockerJobBar /> : null}
    </div>
  );
}
