import { invoke } from "@tauri-apps/api/core";

export type AppUpdateProgressEvent = {
  version: string;
  downloaded: number;
  total: number | null;
  phase: "downloading" | "done" | "error" | string;
  path: string | null;
  message: string | null;
};

export const appUpdateApi = {
  download: (version: string, url: string) =>
    invoke<string>("app_update_download", { version, url }),
  cachedPath: (version: string, url: string) =>
    invoke<string | null>("app_update_cached_path", { version, url }),
  install: (path: string) => invoke<void>("app_update_install", { path }),
};
