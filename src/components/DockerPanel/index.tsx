import { useCallback, useEffect, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../../lib/api";
import { toastError } from "../../lib/toast";
import type { DockerStatus } from "../../types";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";

interface Props {
  profileId: string | null;
  enabled: boolean;
}

export function DockerPanel({ profileId, enabled }: Props) {
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const probe = useCallback(async () => {
    if (!profileId || !enabled) {
      setStatus(null);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.dockerProbe(profileId);
      setStatus(result);
    } catch (e) {
      setStatus(null);
      const msg = String(e);
      setError(msg);
      toastError(e, "Docker");
    } finally {
      setBusy(false);
    }
  }, [profileId, enabled]);

  useEffect(() => {
    void probe();
  }, [probe]);

  if (!enabled) {
    return (
      <div className="docker-panel">
        <p className="muted docker-empty">
          Enable Docker management on this profile to use the Docker plugin.
        </p>
      </div>
    );
  }

  if (!profileId) {
    return (
      <div className="docker-panel">
        <p className="muted docker-empty">Connect a profile session to probe Docker on the server.</p>
      </div>
    );
  }

  return (
    <div className="docker-panel">
      <div className="docker-toolbar">
        <span className="docker-toolbar-label">Server status</span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy}
          onClick={() => void probe()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>

      {busy && !status ? <p className="muted docker-empty">Checking Docker…</p> : null}

      {error ? <p className="error docker-empty">{error}</p> : null}

      {status ? (
        <div className="docker-status-card">
          <div className="docker-status-row">
            <span className="docker-status-key">Installed</span>
            <span
              className={`docker-status-badge ${status.installed ? "is-ok" : "is-missing"}`}
            >
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
