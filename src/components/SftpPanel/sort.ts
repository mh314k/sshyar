import type { RemoteEntry } from "../../types";

export type SortKey = "name" | "size";
export type SortDir = "asc" | "desc";

export function sortEntries(
  entries: RemoteEntry[],
  key: SortKey,
  dir: SortDir,
): RemoteEntry[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    if (key === "size") {
      const d = (a.size - b.size) * mul;
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
