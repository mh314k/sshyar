import { invoke } from "@tauri-apps/api/core";
import type {
  CronStatus,
  CronSystemFile,
  CronUserTable,
  HostSvcCmdResult,
  NginxSite,
  NginxStatus,
  SystemdUnit,
  SystemdUnitAction,
} from "../../types/hostSvc";

export const hostSvcApi = {
  nginxProbe: (profileId: string) => invoke<NginxStatus>("nginx_probe", { profileId }),
  nginxTest: (profileId: string, jobId?: string | null) =>
    invoke<HostSvcCmdResult>("nginx_test", { profileId, jobId: jobId ?? null }),
  nginxReload: (profileId: string, jobId?: string | null) =>
    invoke<HostSvcCmdResult>("nginx_reload", { profileId, jobId: jobId ?? null }),
  nginxListSites: (profileId: string) =>
    invoke<NginxSite[]>("nginx_list_sites", { profileId }),

  systemdListUnits: (profileId: string) =>
    invoke<SystemdUnit[]>("systemd_list_units", { profileId }),
  systemdUnitAction: (
    profileId: string,
    unit: string,
    action: SystemdUnitAction,
    jobId?: string | null,
  ) =>
    invoke<HostSvcCmdResult>("systemd_unit_action", {
      profileId,
      unit,
      action,
      jobId: jobId ?? null,
    }),

  cronProbe: (profileId: string) => invoke<CronStatus>("cron_probe", { profileId }),
  cronUserList: (profileId: string) => invoke<CronUserTable>("cron_user_list", { profileId }),
  cronSystemList: (profileId: string) =>
    invoke<CronSystemFile[]>("cron_system_list", { profileId }),
  cronReadSystemFile: (profileId: string, path: string) =>
    invoke<HostSvcCmdResult>("cron_read_system_file", { profileId, path }),
};
