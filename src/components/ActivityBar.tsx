import type { ReactNode } from "react";
import ComputerOutlinedIcon from "@mui/icons-material/ComputerOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ViewInArOutlinedIcon from "@mui/icons-material/ViewInArOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import type { ThemeMode } from "../lib/theme";
import type { PluginFlags, PluginTab } from "./RightPlugins";
import { iconProps } from "./icons";

interface Props {
  leftOpen: boolean;
  sftpOpen: boolean;
  rightOpen: boolean;
  plugins: PluginFlags;
  activePlugin: PluginTab | null;
  theme: ThemeMode;
  onToggleLeft: () => void;
  onToggleSftp: () => void;
  onSelectPlugin: (tab: PluginTab) => void;
  onToggleTheme: () => void;
  onHelp: () => void;
  onLock: () => void;
  /** Hide Lock when no master password is configured. */
  hasMasterPassword?: boolean;
}

function ActivityButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`activity-btn ${active ? "is-active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Host overview → OS services → containers → web → schedules */
const PLUGIN_ITEMS: {
  id: PluginTab;
  title: string;
  flag: keyof PluginFlags;
  Icon: typeof ViewInArOutlinedIcon;
}[] = [
  { id: "monitor", title: "Monitor", flag: "monitor", Icon: SpeedOutlinedIcon },
  { id: "systemd", title: "systemd", flag: "systemd", Icon: SettingsSuggestOutlinedIcon },
  { id: "docker", title: "Docker", flag: "docker", Icon: ViewInArOutlinedIcon },
  { id: "nginx", title: "Nginx", flag: "nginx", Icon: LanguageOutlinedIcon },
  { id: "cron", title: "cron", flag: "cron", Icon: ScheduleOutlinedIcon },
];

export function ActivityBar({
  leftOpen,
  sftpOpen,
  rightOpen,
  plugins,
  activePlugin,
  theme,
  onToggleLeft,
  onToggleSftp,
  onSelectPlugin,
  onToggleTheme,
  onHelp,
  onLock,
  hasMasterPassword = false,
}: Props) {
  const ic = iconProps(20);
  const enabledPlugins = PLUGIN_ITEMS.filter((p) => plugins[p.flag]);

  return (
    <nav className="activity-bar" aria-label="Activity bar">
      <div className="activity-bar-top">
        <ActivityButton title="Profiles" active={leftOpen} onClick={onToggleLeft}>
          <ComputerOutlinedIcon {...ic} />
        </ActivityButton>
        <ActivityButton title="SFTP" active={sftpOpen} onClick={onToggleSftp}>
          <FolderOutlinedIcon {...ic} />
        </ActivityButton>

        {enabledPlugins.length > 0 ? (
          <>
            <span className="activity-sep" aria-hidden />
            {enabledPlugins.map(({ id, title, Icon }) => (
              <ActivityButton
                key={id}
                title={title}
                active={rightOpen && activePlugin === id}
                onClick={() => onSelectPlugin(id)}
              >
                <Icon {...ic} />
              </ActivityButton>
            ))}
          </>
        ) : null}
      </div>
      <div className="activity-bar-bottom">
        <ActivityButton
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <LightModeOutlinedIcon {...ic} />
          ) : (
            <DarkModeOutlinedIcon {...ic} />
          )}
        </ActivityButton>
        <ActivityButton title="Help" onClick={onHelp}>
          <HelpOutlineOutlinedIcon {...ic} />
        </ActivityButton>
        {hasMasterPassword ? (
          <ActivityButton title="Lock vault" onClick={onLock}>
            <LockOutlinedIcon {...ic} />
          </ActivityButton>
        ) : null}
      </div>
    </nav>
  );
}
