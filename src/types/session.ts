export type SessionStatus = "local" | "connecting" | "connected" | "disconnected";

export interface SessionTab {
  id: string;
  title: string;
  profileId?: string;
  /** e.g. user@host:port — shown in tab tooltip */
  hostLabel?: string;
  ptyId?: string;
  status: SessionStatus;
}
