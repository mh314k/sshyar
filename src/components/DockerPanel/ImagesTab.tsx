import { useCallback, useEffect, useMemo, useState } from "react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../../lib/api";
import { appConfirm } from "../../lib/dialogs";
import { toastError } from "../../lib/toast";
import type { DockerImage } from "../../types";
import { useDockerJob } from "../dockerJob/DockerJobContext";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";
import { DockerFilter } from "./DockerFilter";

interface Props {
  profileId: string;
  dockerInstalled: boolean | null;
}

function imageTitle(img: DockerImage) {
  return img.repository && img.repository !== "<none>"
    ? `${img.repository}:${img.tag || "latest"}`
    : img.id.slice(0, 12);
}

export function ImagesTab({ profileId, dockerInstalled }: Props) {
  const { runJob, job } = useDockerJob();
  const [items, setItems] = useState<DockerImage[]>([]);
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
      setItems(await api.dockerListImages(profileId));
    } catch (e) {
      setItems([]);
      setError(String(e));
      toastError(e, "Docker images");
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
    return items.filter((img) => {
      const hay = [imageTitle(img), img.id, img.repository, img.tag, img.size, img.created]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  async function removeImage(img: DockerImage) {
    const label = imageTitle(img);
    const ok = await appConfirm({
      title: "Remove image",
      message: `Remove image “${label}”?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setActing(img.id);
    try {
      await runJob(
        {
          title: "Remove image",
          detail: label,
          runningMessage: `Removing image · ${label}`,
          successMessage: `Removed ${label}`,
        },
        (_jobId) => api.dockerImageRemove(profileId, img.id),
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
          Images
          {items.length
            ? ` (${filtered.length}${filtered.length !== items.length ? `/${items.length}` : ""})`
            : ""}
          {items.some((i) => i.unused)
            ? ` · ${items.filter((i) => i.unused).length} unused`
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
        placeholder="Filter repository, tag, id…"
      />

      {busy && !items.length ? <p className="muted docker-empty">Loading…</p> : null}
      {error ? <p className="error docker-empty">{error}</p> : null}
      {!busy && !error && !items.length ? (
        <p className="muted docker-empty">No images.</p>
      ) : null}
      {!busy && !error && items.length > 0 && filtered.length === 0 ? (
        <p className="muted docker-empty">No images match this filter.</p>
      ) : null}

      <ul className="docker-list">
        {filtered.map((img) => {
          const title = imageTitle(img);
          const rowBusy = acting === img.id || busy || jobRunning;
          return (
            <li key={img.id} className="docker-row">
              <div className="docker-row-main">
                <div className="docker-row-title">
                  <span className="docker-row-name" title={title}>
                    {title}
                  </span>
                  {img.unused ? (
                    <span className="docker-state-badge is-unused" title="Not used by any container">
                      unused
                    </span>
                  ) : null}
                </div>
                <div className="docker-row-meta muted">
                  <span>{img.size || "—"}</span>
                  {img.created ? <span>{img.created}</span> : null}
                  <span title={img.id}>{img.id.slice(0, 12)}</span>
                </div>
              </div>
              <div className="docker-row-actions">
                <IconButton
                  variant="icon"
                  title="Remove"
                  disabled={rowBusy}
                  onClick={() => void removeImage(img)}
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
