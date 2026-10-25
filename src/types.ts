export type AuthMethod = "Password" | "Key";

export interface Profile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  password?: string | null;
  privateKeyPath?: string | null;
  group: string;
  tags: string[];
  postConnectCommand: string;
  keepaliveInterval: number;
  keepaliveCountMax: number;
  notes: string;
}

export interface ProfileInput {
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethod;
  password?: string | null;
  privateKeyPath?: string | null;
  group: string;
  tags: string[];
  postConnectCommand: string;
  keepaliveInterval: number;
  keepaliveCountMax: number;
  notes: string;
}

export interface Snippet {
  id: string;
  name: string;
  command: string;
  profileId?: string | null;
}

export interface VaultStatus {
  unlocked: boolean;
  hasMasterPassword: boolean;
  profileCount: number;
  snippetCount: number;
}

export interface RemoteEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  mtime?: number | null;
}

export type SessionStatus = "local" | "connecting" | "connected" | "disconnected";

export interface SessionTab {
  id: string;
  title: string;
  profileId?: string;
  ptyId?: string;
  status: SessionStatus;
}
