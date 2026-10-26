import { invoke } from "@tauri-apps/api/core";
import type {
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
};
