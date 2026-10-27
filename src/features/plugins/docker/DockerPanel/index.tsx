import { useCallback, useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { toastError } from "../../../../lib/toast";
import type { DockerStatus } from "../../../../types";
import { DockerLogsModal } from "../DockerLogsModal";
import { ContainersTab } from "./ContainersTab";
import { ImagesTab } from "./ImagesTab";
import { NetworksTab } from "./NetworksTab";
import { StatusTab } from "./StatusTab";
import { VolumesTab } from "./VolumesTab";

type DockerTab = "status" | "containers" | "images" | "volumes" | "networks";

interface Props {
  profileId: string | null;
  enabled: boolean;
  /** Jump to a Compose project directory in the SFTP plugin. */
  onOpenComposeInSftp?: (path: string) => void;
}

const TABS: { id: DockerTab; label: string }[] = [
  { id: "status", label: "Status" },
  { id: "containers", label: "Containers" },
  { id: "images", label: "Images" },
  { id: "volumes", label: "Volumes" },
  { id: "networks", label: "Networks" },
];

export function DockerPanel({ profileId, enabled, onOpenComposeInSftp }: Props) {
  const [tab, setTab] = useState<DockerTab>("status");
  const [status, setStatus] = useState<DockerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [logsTarget, setLogsTarget] = useState<{ id: string; name: string } | null>(
    null,
  );

  const probe = useCallback(async () => {
    if (!profileId || !enabled) {
      setStatus(null);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setStatus(await api.dockerProbe(profileId));
    } catch (e) {
      setStatus(null);
      setError(String(e));
      toastError(e, "Docker");
    } finally {
      setBusy(false);
    }
  }, [profileId, enabled]);

  useEffect(() => {
    void probe();
  }, [probe]);

  useEffect(() => {
    if (!enabled || !profileId) return;
    void api.dockerSessionEnsure(profileId).catch(() => undefined);
  }, [enabled, profileId]);

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
        <p className="muted docker-empty">
          Connect a profile session to manage Docker on the server.
        </p>
      </div>
    );
  }

  const installed = status ? status.installed : null;

  return (
    <div className="docker-panel">
      <div className="docker-subtabs" role="tablist" aria-label="Docker sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`docker-subtab ${tab === t.id ? "is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "status" ? (
        <StatusTab
          profileId={profileId}
          status={status}
          busy={busy}
          error={error}
          onRefresh={() => void probe()}
        />
      ) : null}
      {tab === "containers" ? (
        <ContainersTab
          profileId={profileId}
          dockerInstalled={installed}
          onOpenLogs={(c) => setLogsTarget({ id: c.id, name: c.name })}
          onOpenComposeInSftp={onOpenComposeInSftp}
        />
      ) : null}
      {tab === "images" ? (
        <ImagesTab profileId={profileId} dockerInstalled={installed} />
      ) : null}
      {tab === "volumes" ? (
        <VolumesTab profileId={profileId} dockerInstalled={installed} />
      ) : null}
      {tab === "networks" ? (
        <NetworksTab profileId={profileId} dockerInstalled={installed} />
      ) : null}

      {logsTarget ? (
        <DockerLogsModal
          profileId={profileId}
          source={{ kind: "container", containerId: logsTarget.id }}
          subtitle={logsTarget.name}
          onClose={() => setLogsTarget(null)}
        />
      ) : null}
    </div>
  );
}
