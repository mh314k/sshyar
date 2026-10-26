export interface DockerStatus {
  installed: boolean;
  version: string | null;
  detail: string;
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

export const DOCKER_STANDALONE_GROUP = "__standalone__";
