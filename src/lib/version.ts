/** Keep in sync with package.json, src-tauri/tauri.conf.json, and Cargo.toml. */
export const APP_VERSION = "1.0.0";

export const GITHUB_REPO = "mh314k/sshyar";
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export type UpdateInfo = {
  latest: string;
  current: string;
  htmlUrl: string;
  downloadUrl: string | null;
};

/** localStorage key: muted toast for a specific latest release tag (without forcing badge off). */
const UPDATE_TOAST_MUTED_KEY = "sshyar.updateToast.mutedVersion";

/** True when the user chose “Don’t show again” for this exact latest version. */
export function isUpdateToastMuted(latestVersion: string): boolean {
  const latest = latestVersion.replace(/^v/i, "").trim();
  if (!latest) return false;
  try {
    return (localStorage.getItem(UPDATE_TOAST_MUTED_KEY) ?? "").replace(/^v/i, "") === latest;
  } catch {
    return false;
  }
}

/** Persist “Don’t show again” for this latest version; a newer release will toast again. */
export function muteUpdateToast(latestVersion: string): void {
  const latest = latestVersion.replace(/^v/i, "").trim();
  if (!latest) return;
  try {
    localStorage.setItem(UPDATE_TOAST_MUTED_KEY, latest);
  } catch {
    /* private mode / quota — ignore; Close still works for this session */
  }
}

type ReleaseAsset = { name: string; browser_download_url: string };

function normalizeVersion(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .filter(Boolean)
    .map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isFinite(n) ? n : 0;
    });
}

/** Negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: string, b: string): number {
  const aa = normalizeVersion(a);
  const bb = normalizeVersion(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i++) {
    const d = (aa[i] ?? 0) - (bb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function detectHostOs(): "windows" | "linux" | "other" {
  const p = (navigator.platform || "").toLowerCase();
  const ua = (navigator.userAgent || "").toLowerCase();
  if (p.includes("win") || ua.includes("windows")) return "windows";
  if (p.includes("linux") || ua.includes("linux")) return "linux";
  return "other";
}

function pickByPatterns(assets: ReleaseAsset[], patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const hit = assets.find((a) => re.test(a.name) && !/autobuild|pdb|\.sig$/i.test(a.name));
    if (hit) return hit.browser_download_url;
  }
  return null;
}

/** Prefer the installer matching this OS (Windows MSI/EXE, Linux AppImage/deb). */
export function pickDownloadForOs(
  assets: ReleaseAsset[],
  os: "windows" | "linux" | "other" = detectHostOs(),
): string | null {
  if (os === "windows") {
    return (
      pickByPatterns(assets, [/\.msi$/i, /x64-setup\.exe$/i, /setup\.exe$/i, /\.exe$/i]) ??
      null
    );
  }
  if (os === "linux") {
    return (
      pickByPatterns(assets, [/\.AppImage$/i, /\.deb$/i, /\.rpm$/i, /\.tar\.gz$/i]) ?? null
    );
  }
  return null;
}

/** Returns update info when a newer GitHub release exists; otherwise null. */
export async function checkForAppUpdate(): Promise<UpdateInfo | null> {
  const res = await fetch(GITHUB_LATEST_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    if (res.status === 404) return null; // no releases yet
    throw new Error(`GitHub API ${res.status}`);
  }
  const data = (await res.json()) as {
    tag_name?: string;
    html_url?: string;
    prerelease?: boolean;
    draft?: boolean;
    assets?: ReleaseAsset[];
  };
  if (data.draft || data.prerelease) return null;
  const latest = (data.tag_name ?? "").replace(/^v/i, "");
  if (!latest) return null;
  if (compareSemver(APP_VERSION, latest) >= 0) return null;
  const assets = data.assets ?? [];
  return {
    latest,
    current: APP_VERSION,
    htmlUrl: data.html_url || `${GITHUB_RELEASES_URL}/tag/v${latest}`,
    downloadUrl: pickDownloadForOs(assets),
  };
}
