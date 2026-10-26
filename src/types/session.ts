export type SessionStatus = "local" | "connecting" | "connected" | "disconnected";

export interface SessionTab {
  id: string;
  title: string;
  profileId?: string;
  ptyId?: string;
  status: SessionStatus;
}
