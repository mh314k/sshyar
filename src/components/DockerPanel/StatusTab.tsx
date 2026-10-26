import { useCallback, useEffect, useState } from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import { api } from "../../lib/api";
import { appConfirm } from "../../lib/dialogs";
import { toast, toastError } from "../../lib/toast";
import type { DockerDfResult, DockerPrunePreview, DockerStatus } from "../../types";
import { useDockerJob } from "../dockerJob/DockerJobContext";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";

const PREVIEW_LIST_LIMIT = 50;

function formatPreviewLines(lines: string[], limit = PREVIEW_LIST_LIMIT): string[] {
  if (lines.length === 0) return ["  (none)"];
  if (lines.length <= limit) return lines.map((l) => `  ${l}`);
  return [
    ...lines.slice(0, limit).map((l) => `  ${l}`),
    `  … and ${lines.length - limit} more`,
  ];
}

function buildPruneConfirmMessage(
  unusedImages: boolean,
  unusedVolumes: boolean,
  preview: DockerPrunePreview,
): string {
  const parts: string[] = [
    "This permanently deletes the items below on the remote server.",
    "",
  ];

  if (unusedImages) {
    parts.push(`Images to delete (${preview.images.length}):`);
    parts.push(
      ...formatPreviewLines(
        preview.images.map((img) => {
          const size = img.size ? ` · ${img.size}` : "";
          return `${img.reference} (${img.id})${size}`;
        }),
      ),
    );
    parts.push("");
  }

  if (unusedVolumes) {
    parts.push(`Volumes to delete (${preview.volumes.length}):`);
    parts.push(
      ...formatPreviewLines(
        preview.volumes.map((v) => (v.driver ? `${v.name} · ${v.driver}` : v.name)),
      ),
    );
    parts.push("");
  }

  parts.push(
    "In-use images/volumes are kept. Type PRUNE to confirm.",
  );
  return parts.join("\n");
}

interface Props {
  profileId: string;
  status: DockerStatus | null;
  busy: boolean;
  error: string;
  onRefresh: () => void;
}

export function StatusTab({ profileId, status, busy, error, onRefresh }: Props) {
  const { runJob, job } = useDockerJob();
  const [df, setDf] = useState<DockerDfResult | null>(null);
  const [dfBusy, setDfBusy] = useState(false);
  const [dfError, setDfError] = useState("");
  const [unusedImages, setUnusedImages] = useState(false);
  const [unusedVolumes, setUnusedVolumes] = useState(false);
  const [lastPruneOut, setLastPruneOut] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);

  const jobBusy = job?.status === "running";
  const installed = !!status?.installed;

  const loadDf = useCallback(async () => {
    if (!installed) {
      setDf(null);
      setDfError("");
      return;
    }
    setDfBusy(true);
    setDfError("");
    try {
      setDf(await api.dockerSystemDf(profileId));
    } catch (e) {
      setDf(null);
      setDfError(String(e));
      toastError(e, "Docker disk");
    } finally {
      setDfBusy(false);
    }
  }, [profileId, installed]);

  useEffect(() => {
    void loadDf();
  }, [loadDf]);

  async function refreshAll() {
    onRefresh();
    await loadDf();
  }

  async function runPrune() {
    if (!unusedImages && !unusedVolumes || previewBusy || jobBusy) return;

    setPreviewBusy(true);
    setLastPruneOut("");
    toast("Listing items that would be deleted…", {
      kind: "info",
      title: "Prune preview",
      durationMs: 4000,
    });

    let preview: DockerPrunePreview;
    try {
      preview = await api.dockerPrunePreview(profileId, unusedImages, unusedVolumes);
    } catch (e) {
      setPreviewBusy(false);
      toastError(e, "Prune preview");
      setLastPruneOut(String(e));
      return;
    }
    setPreviewBusy(false);

    const imageCount = unusedImages ? preview.images.length : 0;
    const volumeCount = unusedVolumes ? preview.volumes.length : 0;
    if (imageCount + volumeCount === 0) {
      const msg = "Nothing to prune for the selected targets.";
      setLastPruneOut(msg);
      toast(msg, { kind: "info", title: "Docker prune", durationMs: 3500 });
      return;
    }

    const ok = await appConfirm({
      title: `Delete ${imageCount + volumeCount} unused item(s)?`,
      message: buildPruneConfirmMessage(unusedImages, unusedVolumes, preview),
      confirmLabel: "Prune",
      danger: true,
      confirmText: "PRUNE",
      confirmTextPlaceholder: "Type PRUNE",
    });
    if (!ok) return;

    try {
      const result = await runJob(
        {
          title: "Docker prune",
          detail: [
            unusedImages ? `${imageCount} images` : null,
            unusedVolumes ? `${volumeCount} volumes` : null,
          ]
            .filter(Boolean)
            .join(" + "),
          runningMessage: "Pruning unused Docker data…",
          successMessage: "Prune finished",
        },
        (jobId) => api.dockerPrune(profileId, unusedImages, unusedVolumes, jobId),
      );
      const out = result.output.trim() || "Prune completed (Docker returned no details).";
      setLastPruneOut(out);
      await loadDf();
    } catch (e) {
      setLastPruneOut(String(e));
      toastError(e, "Docker prune");
    }
  }

  const canPrune =
    installed &&
    (unusedImages || unusedVolumes) &&
    !busy &&
    !jobBusy &&
    !dfBusy &&
    !previewBusy;

  return (
    <div className="docker-tab-body">
      <div className="docker-toolbar">
        <span className="docker-toolbar-label">Server status</span>
        <IconButton
          variant="icon"
          title="Refresh"
          disabled={busy || dfBusy || jobBusy}
          onClick={() => void refreshAll()}
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

      {installed ? (
        <div className="docker-status-card docker-df-card">
          <div className="docker-status-row">
            <span className="docker-toolbar-label">Disk usage</span>
            {dfBusy ? <span className="muted docker-df-hint">Loading…</span> : null}
          </div>
          {dfError ? <p className="error docker-df-hint">{dfError}</p> : null}
          {df && df.rows.length > 0 ? (
            <div className="docker-df-table-wrap">
              <table className="docker-df-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Active</th>
                    <th>Size</th>
                    <th>Reclaimable</th>
                  </tr>
                </thead>
                <tbody>
                  {df.rows.map((row) => (
                    <tr key={row.typeName}>
                      <td>{row.typeName}</td>
                      <td>{row.totalCount}</td>
                      <td>{row.active}</td>
                      <td>{row.size}</td>
                      <td>{row.reclaimable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : df && !dfBusy ? (
            <pre className="docker-df-raw" tabIndex={0}>
              {df.raw || "No disk usage data."}
            </pre>
          ) : null}

          <div className="docker-prune">
            <p className="docker-prune-title">Safe prune</p>
            <p className="muted docker-df-hint">
              Only unused images/volumes. Does not wipe build cache, networks, or in-use data.
            </p>
            <label className="docker-prune-check">
              <input
                type="checkbox"
                checked={unusedImages}
                disabled={jobBusy}
                onChange={(e) => setUnusedImages(e.target.checked)}
              />
              <span>Unused images</span>
              <code className="docker-prune-cmd">image prune -a</code>
            </label>
            <label className="docker-prune-check">
              <input
                type="checkbox"
                checked={unusedVolumes}
                disabled={jobBusy}
                onChange={(e) => setUnusedVolumes(e.target.checked)}
              />
              <span>Unused volumes</span>
              <code className="docker-prune-cmd">volume prune</code>
            </label>
            <div className="docker-prune-actions">
              <IconButton
                variant="soft"
                title="Prune selected (requires typing PRUNE)"
                label={previewBusy ? "Listing…" : jobBusy ? "Pruning…" : "Prune selected"}
                disabled={!canPrune}
                onClick={() => void runPrune()}
                icon={<DeleteSweepIcon {...iconProps(iconSizeSm)} />}
              />
            </div>
            {previewBusy ? (
              <p className="muted docker-df-hint">Fetching delete list from the server…</p>
            ) : null}
            {lastPruneOut ? (
              <pre className="docker-df-raw docker-prune-out" tabIndex={0}>
                {lastPruneOut}
              </pre>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
