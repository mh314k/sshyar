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
  /** Remote shell name/path: bash, zsh, fish, sh, or custom. Empty = server default. */
  remoteShell: string;
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
  remoteShell: string;
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
