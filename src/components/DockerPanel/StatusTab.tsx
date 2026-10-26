import RefreshIcon from "@mui/icons-material/Refresh";
import type { DockerStatus } from "../../types";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";

interface Props {
  status: DockerStatus | null;
  busy: boolean;
  error: string;
  onRefresh: () => void;
}

export function StatusTab({ status, busy, error, onRefresh }: Props) {
  return (
    <div className="docker-tab-body">
      <div className="docker-toolbar">
        <span className="docker-toolbar-label">Server status</span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy}
          onClick={onRefresh}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>

      {busy && !status ? <p className="muted docker-empty">Checking Docker…</p> : null}
      {error ? <p className="error docker-empty">{error}</p> : null}

      {status ? (
        <div className="docker-status-card">
          <div className="docker-status-row">
            <span className="docker-status-key">Installed</span>
            <span className={`docker-status-badge ${status.installed ? "is-ok" : "is-missing"}`}>
              {status.installed ? "Yes" : "No"}
            </span>
          </div>
          <div className="docker-status-row">
            <span className="docker-status-key">Version</span>
            <span className="docker-status-value">
              {status.installed ? status.version || "—" : "—"}
            </span>
          </div>
          {status.detail ? (
            <p className="docker-status-detail muted" title={status.detail}>
              {status.detail}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
