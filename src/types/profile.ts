export type AuthMethod = "Password" | "Key";

/** Local TCP forward: ssh -L localPort:remoteHost:remotePort */
export interface PortForward {
  localPort: number;
  remoteHost: string;
  remotePort: number;
}

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
  /** When true, the Docker management plugin is available for this profile's sessions. */
  dockerManagement: boolean;
  nginxManagement: boolean;
  systemdManagement: boolean;
  cronManagement: boolean;
  /** Local port forwards opened with the SSH session. */
  portForwards: PortForward[];
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
  dockerManagement: boolean;
  nginxManagement: boolean;
  systemdManagement: boolean;
  cronManagement: boolean;
  portForwards: PortForward[];
}

export interface Snippet {
  id: string;
  name: string;
  command: string;
  profileId?: string | null;
}
