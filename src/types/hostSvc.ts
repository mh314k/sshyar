export interface HostSvcCmdResult {
  ok: boolean;
  output: string;
}

export interface NginxStatus {
  installed: boolean;
  version: string | null;
  active: string | null;
  detail: string;
}

export interface NginxSite {
  name: string;
  path: string;
}

export interface SystemdUnit {
  name: string;
  load: string;
  active: string;
  sub: string;
  description: string;
}

export type SystemdUnitAction = "start" | "stop" | "restart" | "status";

export interface CronStatus {
  hasCrontab: boolean;
  detail: string;
}

export interface CronUserTable {
  raw: string;
  empty: boolean;
}

export interface CronSystemFile {
  name: string;
  path: string;
}
