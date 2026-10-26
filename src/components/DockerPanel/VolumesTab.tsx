import { useCallback, useEffect, useState } from "react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../../lib/api";
import { appConfirm } from "../../lib/dialogs";
import { toastError, toastSuccess } from "../../lib/toast";
import type { DockerVolume } from "../../types";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";

interface Props {
  profileId: string;
  dockerInstalled: boolean | null;
}

export function VolumesTab({ profileId, dockerInstalled }: Props) {
  const [items, setItems] = useState<DockerVolume[]>([]);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (dockerInstalled === false) {
      setItems([]);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setItems(await api.dockerListVolumes(profileId));
    } catch (e) {
      setItems([]);
      setError(String(e));
      toastError(e, "Docker volumes");
    } finally {
      setBusy(false);
    }
  }, [profileId, dockerInstalled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function removeVolume(vol: DockerVolume) {
    const ok = await appConfirm({
      title: "Remove volume",
      message: `Remove volume “${vol.name}”? Data on this volume will be lost.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setActing(vol.name);
    try {
      await api.dockerVolumeRemove(profileId, vol.name);
      toastSuccess(`Removed ${vol.name}`);
      await refresh();
    } catch (e) {
      toastError(e, "Docker");
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
          Volumes{items.length ? ` (${items.length})` : ""}
        </span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy || !!acting}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>

      {busy && !items.length ? <p className="muted docker-empty">Loading…</p> : null}
      {error ? <p className="error docker-empty">{error}</p> : null}
      {!busy && !error && !items.length ? (
        <p className="muted docker-empty">No volumes.</p>
      ) : null}

      <ul className="docker-list">
        {items.map((vol) => {
          const rowBusy = acting === vol.name || busy;
          return (
            <li key={vol.name} className="docker-row">
              <div className="docker-row-main">
                <div className="docker-row-title">
                  <span className="docker-row-name" title={vol.name}>
                    {vol.name}
                  </span>
                </div>
                <div className="docker-row-meta muted">
                  <span>{vol.driver || "—"}</span>
                  {vol.mountpoint ? (
                    <span title={vol.mountpoint}>{vol.mountpoint}</span>
                  ) : null}
                </div>
              </div>
              <div className="docker-row-actions">
                <IconButton
                  variant="icon"
                  title="Remove"
                  disabled={rowBusy}
                  onClick={() => void removeVolume(vol)}
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
