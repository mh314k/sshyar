import { useCallback, useEffect, useMemo, useState } from "react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../../../../lib/api";
import { appConfirm } from "../../../../lib/dialogs";
import { toastError } from "../../../../lib/toast";
import type { DockerVolume } from "../../../../types";
import { useDockerJob } from "../dockerJob/DockerJobContext";
import { IconButton, iconProps, iconSizeSm } from "../../../../components/IconButton";
import { DockerFilter } from "./DockerFilter";

interface Props {
  profileId: string;
  dockerInstalled: boolean | null;
}

export function VolumesTab({ profileId, dockerInstalled }: Props) {
  const { runJob, job } = useDockerJob();
  const [items, setItems] = useState<DockerVolume[]>([]);
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((vol) => {
      const hay = [vol.name, vol.driver, vol.mountpoint].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  async function removeVolume(vol: DockerVolume) {
    const ok = await appConfirm({
      title: "Remove volume",
      message: `Remove volume “${vol.name}”? Data on this volume will be lost.`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setActing(vol.name);
    try {
      await runJob(
        {
          title: "Remove volume",
          detail: vol.name,
          runningMessage: `Removing volume · ${vol.name}`,
          successMessage: `Removed ${vol.name}`,
        },
        (_jobId) => api.dockerVolumeRemove(profileId, vol.name),
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
          Volumes
          {items.length
            ? ` (${filtered.length}${filtered.length !== items.length ? `/${items.length}` : ""})`
            : ""}
        </span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy || !!acting || jobRunning}
          onClick={() => void refresh()}
          icon={<RefreshIcon {...iconProps(iconSizeSm)} />}
        />
      </div>

      <DockerFilter
        value={query}
        onChange={setQuery}
        placeholder="Filter name, driver, mount…"
      />

      {busy && !items.length ? <p className="muted docker-empty">Loading…</p> : null}
      {error ? <p className="error docker-empty">{error}</p> : null}
      {!busy && !error && !items.length ? (
        <p className="muted docker-empty">No volumes.</p>
      ) : null}
      {!busy && !error && items.length > 0 && filtered.length === 0 ? (
        <p className="muted docker-empty">No volumes match this filter.</p>
      ) : null}

      <ul className="docker-list">
        {filtered.map((vol) => {
          const rowBusy = acting === vol.name || busy || jobRunning;
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
