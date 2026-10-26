import CloseIcon from "@mui/icons-material/Close";
import { IconButton, iconProps, iconSizeSm } from "../IconButton";
import { useDockerJob } from "./DockerJobContext";

export function DockerJobBar() {
  const { job, clearJob } = useDockerJob();
  if (!job) return null;

  return (
    <div className={`docker-job-bar status-${job.status}`} role="status" aria-live="polite">
      <div className="docker-job-head">
        <div className="docker-job-text">
          <span className="docker-job-title">{job.title}</span>
          <span className="docker-job-detail muted" title={job.detail}>
            {job.status === "running" ? `${job.detail}…` : job.detail}
          </span>
        </div>
        {job.status !== "running" ? (
          <IconButton
            variant="icon"
            title="Dismiss"
            onClick={clearJob}
            icon={<CloseIcon {...iconProps(iconSizeSm)} />}
          />
        ) : null}
      </div>
      <div className="docker-job-track">
        <div
          className={`docker-job-fill ${job.status === "running" ? "is-indeterminate" : "is-full"}`}
        />
      </div>
    </div>
  );
}
