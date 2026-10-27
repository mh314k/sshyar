import type { ReactNode } from "react";
import ComputerOutlinedIcon from "@mui/icons-material/ComputerOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import type { ThemeMode } from "../lib/theme";
import { iconProps } from "./icons";

interface Props {
  leftOpen: boolean;
  sftpOpen: boolean;
  rightOpen: boolean;
  rightAvailable: boolean;
  theme: ThemeMode;
  onToggleLeft: () => void;
  onToggleSftp: () => void;
  onToggleRight: () => void;
  onToggleTheme: () => void;
  onHelp: () => void;
  onLock: () => void;
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

export function ActivityBar({
  leftOpen,
  sftpOpen,
  rightOpen,
  rightAvailable,
  theme,
  onToggleLeft,
  onToggleSftp,
  onToggleRight,
  onToggleTheme,
  onHelp,
  onLock,
}: Props) {
  const ic = iconProps(20);
  return (
    <nav className="activity-bar" aria-label="Activity bar">
      <div className="activity-bar-top">
        <ActivityButton title="Profiles" active={leftOpen} onClick={onToggleLeft}>
          <ComputerOutlinedIcon {...ic} />
        </ActivityButton>
        <ActivityButton title="SFTP" active={sftpOpen} onClick={onToggleSftp}>
          <FolderOutlinedIcon {...ic} />
        </ActivityButton>
        <ActivityButton
          title="Plugins"
          active={rightOpen}
          disabled={!rightAvailable}
          onClick={onToggleRight}
        >
          <ExtensionOutlinedIcon {...ic} />
        </ActivityButton>
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
        <ActivityButton title="Lock vault" onClick={onLock}>
          <LockOutlinedIcon {...ic} />
        </ActivityButton>
      </div>
    </nav>
  );
}
