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

export interface MonitorDisk {
  mount: string;
  filesystem: string;
  totalBytes: number;
  usedBytes: number;
  availBytes: number;
  usedPct: number;
}

export interface MonitorSnapshot {
  cpuPct: number;
  cpuCount: number;
  load1: number;
  load5: number;
  load15: number;
  memTotalBytes: number;
  memUsedBytes: number;
  memAvailBytes: number;
  memUsedPct: number;
  swapTotalBytes: number;
  swapUsedBytes: number;
  swapUsedPct: number;
  uptimeSecs: number;
  disks: MonitorDisk[];
  collectedAtMs: number;
}
