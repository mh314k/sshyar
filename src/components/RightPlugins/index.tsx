import { useEffect, useState } from "react";
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

function firstEnabledTab(plugins: PluginFlags): PluginTab | null {
  if (plugins.docker) return "docker";
  if (plugins.nginx) return "nginx";
  if (plugins.systemd) return "systemd";
  if (plugins.cron) return "cron";
  if (plugins.monitor) return "monitor";
  return null;
}

interface Props {
  profileId: string | null;
  ptyId: string | null;
  plugins: PluginFlags;
  onToggle: () => void;
  onOpenComposeInSftp?: (path: string) => void;
}

export function RightPlugins({
  profileId,
  ptyId,
  plugins,
  onToggle,
  onOpenComposeInSftp,
}: Props) {
  const [tab, setTab] = useState<PluginTab>(() => firstEnabledTab(plugins) ?? "docker");

  const needsRemoteSession = anyPluginEnabled(plugins);

  useEffect(() => {
    const first = firstEnabledTab(plugins);
    if (!first) return;
    if (tab === "docker" && !plugins.docker) setTab(first);
    else if (tab === "nginx" && !plugins.nginx) setTab(first);
    else if (tab === "systemd" && !plugins.systemd) setTab(first);
    else if (tab === "cron" && !plugins.cron) setTab(first);
    else if (tab === "monitor" && !plugins.monitor) setTab(first);
  }, [plugins, tab]);

  useEffect(() => {
    if (!needsRemoteSession || !profileId) return;
    void api.dockerSessionEnsure(profileId).catch(() => undefined);
    return () => {
      void api.dockerSessionClose(profileId).catch(() => undefined);
    };
  }, [needsRemoteSession, profileId]);

  if (!needsRemoteSession) {
    return (
      <div className="right-plugins">
        <div className="plugin-header">
          <div className="plugin-tabs" role="tablist" aria-label="Session plugins" />
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
        <div className="plugin-tabs" role="tablist" aria-label="Session plugins">
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
          {plugins.monitor ? (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "monitor"}
              className={`plugin-tab ${tab === "monitor" ? "is-active" : ""}`}
              onClick={() => setTab("monitor")}
            >
              Monitor
            </button>
          ) : null}
        </div>
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
