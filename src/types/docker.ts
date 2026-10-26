export interface DockerStatus {
  installed: boolean;
  version: string | null;
  detail: string;
}

export interface DockerDfRow {
  typeName: string;
  totalCount: string;
  active: string;
  size: string;
  reclaimable: string;
}

export interface DockerDfResult {
  rows: DockerDfRow[];
  raw: string;
}

export interface DockerPruneImageItem {
  id: string;
  reference: string;
  size: string;
}

export interface DockerPruneVolumeItem {
  name: string;
  driver: string;
}

export interface DockerPrunePreview {
  images: DockerPruneImageItem[];
  volumes: DockerPruneVolumeItem[];
}

export interface DockerPruneResult {
  ok: boolean;
  output: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  composeProject: string | null;
  composeService: string | null;
  /** Compose project name, or `__standalone__`. */
  groupKey: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

export type DockerContainerAction = "start" | "stop" | "restart" | "remove";

export type DockerComposeAction =
  | "up"
  | "down"
  | "restart"
  | "recreate"
  | "build"
  | "pull"
  | "ps";

/** Source for the shared live logs popup. */
export type DockerLogsSource =
  | { kind: "container"; containerId: string }
  | { kind: "compose"; workdir: string; fileName: string };

export interface DockerComposeResult {
  ok: boolean;
  output: string;
}

export type DockerLogEventKind = "data" | "ended" | "error";

export interface DockerLogEvent {
  streamId: string;
  kind: DockerLogEventKind;
  text: string;
}

export const DOCKER_STANDALONE_GROUP = "__standalone__";

/** Preferred compose filenames (first match wins). */
export const COMPOSE_FILE_CANDIDATES = [
  "compose.yaml",
  "compose.yml",
  "docker-compose.yml",
  "docker-compose.yaml",
] as const;
