import { useCallback, useEffect, useState } from "react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../../lib/api";
import { appConfirm } from "../../lib/dialogs";
import { toastError } from "../../lib/toast";
import type { DockerNetwork } from "../../types";
import { useDockerJob } from "../dockerJob/DockerJobContext";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";

interface Props {
  profileId: string;
  dockerInstalled: boolean | null;
}

const BUILTIN = new Set(["bridge", "host", "none"]);

export function NetworksTab({ profileId, dockerInstalled }: Props) {
  const { runJob, job } = useDockerJob();
  const [items, setItems] = useState<DockerNetwork[]>([]);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const jobRunning = job?.status === "running";

  const refresh = useCallback(async () => {
    if (dockerInstalled === false) {
      setItems([]);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setItems(await api.dockerListNetworks(profileId));
    } catch (e) {
      setItems([]);
      setError(String(e));
      toastError(e, "Docker networks");
    } finally {
      setBusy(false);
    }
  }, [profileId, dockerInstalled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function removeNetwork(net: DockerNetwork) {
    const ok = await appConfirm({
      title: "Remove network",
      message: `Remove network “${net.name}”?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setActing(net.id);
    try {
      await runJob(
        {
          title: "Remove network",
          detail: net.name,
          runningMessage: `Removing network · ${net.name}`,
          successMessage: `Removed ${net.name}`,
        },
        () => api.dockerNetworkRemove(profileId, net.name),
      );
      await refresh();
    } catch {
      /* handled by runJob */
    } finally {
      setActing(null);
    }
  }

  if (dockerInstalled === false) {
    return (
      <p className="muted docker-empty">Docker is not installed on this server.</p>
    );
  }

  return (
    <div className="docker-tab-body">
      <div className="docker-toolbar">
        <span className="docker-toolbar-label">
          Networks{items.length ? ` (${items.length})` : ""}
        </span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy || !!acting || jobRunning}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>

      {busy && !items.length ? <p className="muted docker-empty">Loading…</p> : null}
      {error ? <p className="error docker-empty">{error}</p> : null}
      {!busy && !error && !items.length ? (
        <p className="muted docker-empty">No networks.</p>
      ) : null}

      <ul className="docker-list">
        {items.map((net) => {
          const builtin = BUILTIN.has(net.name.toLowerCase());
          const rowBusy = acting === net.id || busy || jobRunning;
          return (
            <li key={net.id} className="docker-row">
              <div className="docker-row-main">
                <div className="docker-row-title">
                  <span className="docker-row-name" title={net.name}>
                    {net.name}
                  </span>
                  {builtin ? (
                    <span className="docker-status-badge is-missing">built-in</span>
                  ) : null}
                </div>
                <div className="docker-row-meta muted">
                  <span>{net.driver || "—"}</span>
                  <span>{net.scope || "—"}</span>
                  <span title={net.id}>{net.id.slice(0, 12)}</span>
                </div>
              </div>
              <div className="docker-row-actions">
                <IconButton
                  variant="icon"
                  title={builtin ? "Built-in network" : "Remove"}
                  disabled={rowBusy || builtin}
                  onClick={() => void removeNetwork(net)}
                  icon={<DeleteOutlinedIcon {...iconProps(iconSizeSm)} />}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
