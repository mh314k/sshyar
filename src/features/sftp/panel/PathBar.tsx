import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useState } from "react";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { toastError, toastSuccess } from "../../../lib/toast";
import { IconButton, iconProps, iconSizeSm } from "../../../components/IconButton";

type Crumb = { label: string; path: string };

function crumbsFor(cwd: string): Crumb[] {
  const raw = cwd.replace(/\/+$/, "") || "/";
  if (raw === "/") return [{ label: "/", path: "/" }];
  const parts = raw.split("/").filter(Boolean);
  const out: Crumb[] = [{ label: "/", path: "/" }];
  let acc = "";
  for (const part of parts) {
    acc += `/${part}`;
    out.push({ label: part, path: acc });
  }
  return out;
}

type Props = {
  cwd: string;
  disabled?: boolean;
  onNavigate: (path: string) => void;
};

export function SftpPathBar({ cwd, disabled, onNavigate }: Props) {
  const [copied, setCopied] = useState(false);
  const crumbs = crumbsFor(cwd || "/");
  const ip = iconProps(iconSizeSm);

  async function copyPath() {
    if (!cwd) return;
    try {
      await writeText(cwd);
      setCopied(true);
      toastSuccess("Path copied");
      window.setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      toastError(e, "Copy path");
    }
  }

  return (
    <div className="sftp-path-bar">
      <nav className="sftp-breadcrumbs" aria-label="Remote path">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={c.path} className="sftp-crumb-wrap">
              {i > 0 && <span className="sftp-crumb-sep">/</span>}
              <button
                type="button"
                className={`sftp-crumb ${isLast ? "is-current" : ""}`}
                disabled={disabled || isLast}
                title={c.path}
                onClick={() => onNavigate(c.path)}
              >
                {c.label === "/" ? "root" : c.label}
              </button>
            </span>
          );
        })}
      </nav>
      <IconButton
        variant="icon"
        className="sftp-path-copy"
        title="Copy path"
        disabled={!cwd}
        onClick={() => void copyPath()}
        icon={copied ? <CheckIcon {...ip} /> : <ContentCopyIcon {...ip} />}
      />
    </div>
  );
}
