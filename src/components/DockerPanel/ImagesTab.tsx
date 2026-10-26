import { useCallback, useEffect, useState } from "react";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "../../lib/api";
import { appConfirm } from "../../lib/dialogs";
import { toastError, toastSuccess } from "../../lib/toast";
import type { DockerImage } from "../../types";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";

interface Props {
  profileId: string;
  dockerInstalled: boolean | null;
}

export function ImagesTab({ profileId, dockerInstalled }: Props) {
  const [items, setItems] = useState<DockerImage[]>([]);
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

  async function removeImage(img: DockerImage) {
    const label =
      img.repository && img.repository !== "<none>"
        ? `${img.repository}:${img.tag || "latest"}`
        : img.id.slice(0, 12);
    const ok = await appConfirm({
      title: "Remove image",
      message: `Remove image “${label}”?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setActing(img.id);
    try {
      await api.dockerImageRemove(profileId, img.id);
      toastSuccess(`Removed ${label}`);
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
          Images{items.length ? ` (${items.length})` : ""}
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
        <p className="muted docker-empty">No images.</p>
      ) : null}

      <ul className="docker-list">
        {items.map((img) => {
          const title =
            img.repository && img.repository !== "<none>"
              ? `${img.repository}:${img.tag || "latest"}`
              : img.id.slice(0, 12);
          const rowBusy = acting === img.id || busy;
          return (
            <li key={img.id} className="docker-row">
              <div className="docker-row-main">
                <div className="docker-row-title">
                  <span className="docker-row-name" title={title}>
                    {title}
                  </span>
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
