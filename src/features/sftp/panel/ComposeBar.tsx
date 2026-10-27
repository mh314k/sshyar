import { useEffect, useState } from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import BuildIcon from "@mui/icons-material/Build";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import SubjectIcon from "@mui/icons-material/Subject";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { api } from "../../../lib/api";
import { appConfirm } from "../../../lib/dialogs";
import type { DockerComposeAction } from "../../../types";
import { DockerLogsModal } from "../../plugins/docker/DockerLogsModal";
import { useDockerJob } from "../../plugins/docker/dockerJob/DockerJobContext";
import { IconButton, iconProps, iconSizeSm } from "../../../components/IconButton";

interface Props {
  profileId: string;
  workdir: string;
  fileName: string;
  disabled?: boolean;
}

const ACTION_LABEL: Record<DockerComposeAction, string> = {
  up: "Compose up",
  down: "Compose down",
  restart: "Compose restart",
  recreate: "Compose recreate",
  build: "Compose build",
  pull: "Compose pull",
  ps: "Compose ps",
};

export function ComposeBar({ profileId, workdir, fileName, disabled }: Props) {
  const { runJob, job } = useDockerJob();
  const [output, setOutput] = useState("");
  const [showOut, setShowOut] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const busy = job?.status === "running";

  useEffect(() => {
    void api.dockerSessionEnsure(profileId).catch(() => undefined);
  }, [profileId]);

  async function run(action: DockerComposeAction) {
    if (action === "down") {
      const ok = await appConfirm({
        title: "Compose down",
        message: `Stop and remove containers for “${fileName}” in this folder?`,
        confirmLabel: "Down",
        danger: true,
      });
      if (!ok) return;
    }
    if (action === "recreate") {
      const ok = await appConfirm({
        title: "Compose recreate",
        message: `Force-recreate containers for “${fileName}” (up -d --force-recreate)?`,
        confirmLabel: "Recreate",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      const result = await runJob(
        {
          title: ACTION_LABEL[action],
          detail: fileName,
          runningMessage: `${ACTION_LABEL[action]} · ${fileName}`,
          successMessage: `${ACTION_LABEL[action]} finished`,
        },
        (jobId) => api.dockerComposeRun(profileId, workdir, fileName, action, jobId),
      );
      setOutput(result.output);
      if (action === "ps") setShowOut(true);
    } catch (e) {
      setOutput(String(e));
      setShowOut(true);
    }
  }

  const off = disabled || busy;
  const ip = iconProps(iconSizeSm);

  return (
    <div className="sftp-compose-bar">
      <div className="sftp-compose-head">
        <span className="sftp-compose-label" title={`${workdir}/${fileName}`}>
          Compose · <strong>{fileName}</strong>
        </span>
        <div className="sftp-compose-actions">
          <IconButton
            variant="soft"
            title="Up (-d)"
            label="Up"
            disabled={off}
            onClick={() => void run("up")}
            icon={<PlayArrowIcon {...ip} />}
          />
          <IconButton
            variant="soft"
            title="Down"
            label="Down"
            disabled={off}
            onClick={() => void run("down")}
            icon={<StopIcon {...ip} />}
          />
          <IconButton
            variant="soft"
            title="Restart"
            disabled={off}
            onClick={() => void run("restart")}
            icon={<RestartAltIcon {...ip} />}
          />
          <IconButton
            variant="soft"
            title="Recreate (up -d --force-recreate)"
            label="Recreate"
            disabled={off}
            onClick={() => void run("recreate")}
            icon={<AutorenewIcon {...ip} />}
          />
          <IconButton
            variant="soft"
            title="Build images"
            label="Build"
            disabled={off}
            onClick={() => void run("build")}
            icon={<BuildIcon {...ip} />}
          />
          <IconButton
            variant="soft"
            title="Pull images"
            disabled={off}
            onClick={() => void run("pull")}
            icon={<CloudDownloadIcon {...ip} />}
          />
          <IconButton
            variant="soft"
            title="Live logs (all services)"
            label="Logs"
            disabled={off}
            onClick={() => setLogsOpen(true)}
            icon={<SubjectIcon {...ip} />}
          />
          <IconButton
            variant="soft"
            title="Status (ps)"
            disabled={off}
            onClick={() => void run("ps")}
            icon={<ListAltIcon {...ip} />}
          />
          {output ? (
            <IconButton
              variant="icon"
              title={showOut ? "Hide output" : "Show output"}
              disabled={busy}
              onClick={() => setShowOut((v) => !v)}
              icon={
                showOut ? (
                  <ExpandLessIcon {...iconProps(16)} />
                ) : (
                  <ExpandMoreIcon {...iconProps(16)} />
                )
              }
            />
          ) : null}
        </div>
      </div>
      {showOut && output ? (
        <pre className="sftp-compose-output" tabIndex={0}>
          {output}
        </pre>
      ) : null}
      {logsOpen ? (
        <DockerLogsModal
          profileId={profileId}
          source={{ kind: "compose", workdir, fileName }}
          subtitle={fileName}
          onClose={() => setLogsOpen(false)}
        />
      ) : null}
    </div>
  );
}

/** Pick preferred compose filename from a directory listing (case-insensitive). */
export function findComposeFileName(names: string[]): string | null {
  const byLower = new Map(names.map((n) => [n.toLowerCase(), n]));
  for (const candidate of [
    "compose.yaml",
    "compose.yml",
    "docker-compose.yml",
    "docker-compose.yaml",
  ]) {
    const hit = byLower.get(candidate);
    if (hit) return hit;
  }
  return null;
}
