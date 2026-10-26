import { invoke } from "@tauri-apps/api/core";
import type {
  DockerComposeAction,
  DockerComposeResult,
  DockerContainer,
  DockerContainerAction,
  DockerImage,
  DockerNetwork,
  DockerStatus,
  DockerVolume,
} from "../../types";

export const dockerApi = {
  probe: (profileId: string) => invoke<DockerStatus>("docker_probe", { profileId }),
  listContainers: (profileId: string) =>
    invoke<DockerContainer[]>("docker_list_containers", { profileId }),
  containerAction: (profileId: string, id: string, action: DockerContainerAction) =>
    invoke<void>("docker_container_action", { profileId, id, action }),
  listImages: (profileId: string) => invoke<DockerImage[]>("docker_list_images", { profileId }),
  imageRemove: (profileId: string, id: string) =>
    invoke<void>("docker_image_remove", { profileId, id }),
  listVolumes: (profileId: string) => invoke<DockerVolume[]>("docker_list_volumes", { profileId }),
  volumeRemove: (profileId: string, name: string) =>
    invoke<void>("docker_volume_remove", { profileId, name }),
  listNetworks: (profileId: string) =>
    invoke<DockerNetwork[]>("docker_list_networks", { profileId }),
  networkRemove: (profileId: string, idOrName: string) =>
    invoke<void>("docker_network_remove", { profileId, idOrName }),
  composeRun: (
    profileId: string,
    workdir: string,
    fileName: string,
    action: DockerComposeAction,
  ) =>
    invoke<DockerComposeResult>("docker_compose_run", {
      profileId,
      workdir,
      fileName,
      action,
    }),
  logsStart: (profileId: string, containerId: string, tail?: number) =>
    invoke<string>("docker_logs_start", {
      profileId,
      containerId,
      tail: tail ?? null,
    }),
  logsStop: (streamId: string) => invoke<void>("docker_logs_stop", { streamId }),
};
