const STORAGE_KEY = "sshyar.session.v1";

export type SavedSessionTab = {
  /** Null = local terminal tab. */
  profileId: string | null;
  title: string;
};

export type SessionSnapshot = {
  tabs: SavedSessionTab[];
  activeProfileId: string | null;
  savedAt: number;
};

export function readSessionSnapshot(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (!parsed || !Array.isArray(parsed.tabs)) return null;
    return {
      tabs: parsed.tabs
        .filter((t) => t && typeof t.title === "string")
        .map((t) => ({
          profileId: t.profileId ?? null,
          title: t.title,
        })),
      activeProfileId: parsed.activeProfileId ?? null,
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeSessionSnapshot(snapshot: SessionSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSessionSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Keep only tabs whose profile still exists (locals always kept). */
export function filterRestorableTabs(
  snapshot: SessionSnapshot,
  profileIds: Set<string>,
): SavedSessionTab[] {
  return snapshot.tabs.filter((t) => !t.profileId || profileIds.has(t.profileId));
}
