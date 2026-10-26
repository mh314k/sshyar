import { invoke } from "@tauri-apps/api/core";
import type { DockerStatus } from "../../types";

export const dockerApi = {
  probe: (profileId: string) => invoke<DockerStatus>("docker_probe", { profileId }),
};
