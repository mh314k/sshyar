/** Keep in sync with package.json, src-tauri/tauri.conf.json, and Cargo.toml. */
export const APP_VERSION = "0.3.0";

export const GITHUB_REPO = "mh314k/sshyar";
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export type UpdateInfo = {
  latest: string;
  current: string;
  htmlUrl: string;
  downloadUrl: string | null;
};

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

function pickWindowsDownload(assets: { name: string; browser_download_url: string }[]): string | null {
  const prefer = [/\.msi$/i, /x64-setup\.exe$/i, /setup\.exe$/i, /\.exe$/i];
  for (const re of prefer) {
    const hit = assets.find((a) => re.test(a.name) && !/autobuild|pdb/i.test(a.name));
    if (hit) return hit.browser_download_url;
  }
  return assets[0]?.browser_download_url ?? null;
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
    assets?: { name: string; browser_download_url: string }[];
  };
  if (data.draft || data.prerelease) return null;
  const latest = (data.tag_name ?? "").replace(/^v/i, "");
  if (!latest) return null;
  if (compareSemver(APP_VERSION, latest) >= 0) return null;
  return {
    latest,
    current: APP_VERSION,
    htmlUrl: data.html_url || `${GITHUB_RELEASES_URL}/tag/v${latest}`,
    downloadUrl: pickWindowsDownload(data.assets ?? []),
  };
}
