import type { RemoteEntry } from "../../types";

export type SortKey = "name" | "size";
export type SortDir = "asc" | "desc";

export function sortEntries(
  entries: RemoteEntry[],
  key: SortKey,
  dir: SortDir,
): RemoteEntry[] {
  const mul = dir === "asc" ? 1 : -1;
  const safe = entries.filter((e) => e && typeof e.name === "string" && typeof e.path === "string");
  return [...safe].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    if (key === "size") {
      const d = ((a.size || 0) - (b.size || 0)) * mul;
      if (d !== 0) return d;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * mul;
  });
}

export function nextSort(current: SortKey, dir: SortDir, clicked: SortKey): {
  key: SortKey;
  dir: SortDir;
} {
  if (current === clicked) {
    return { key: clicked, dir: dir === "asc" ? "desc" : "asc" };
  }
  return { key: clicked, dir: "asc" };
}
