import { joinRemote } from "./format";
import type { UploadPlanItem } from "./types";

/** Build upload plan roots from absolute local paths (dirs expand on the backend). */
export function pathsToUploadItems(paths: string[], cwd: string): UploadPlanItem[] {
  const items: UploadPlanItem[] = [];
  for (const localPath of paths) {
    const trimmed = localPath.trim();
    if (!trimmed) continue;
    const name = trimmed.replace(/\\/g, "/").split("/").filter(Boolean).pop();
    if (!name) continue;
    items.push({
      localPath: trimmed,
      remotePath: joinRemote(cwd, name),
      name,
    });
  }
  return items;
}

/**
 * Collect upload items from an HTML drop, preserving folder relative paths when
 * `webkitGetAsEntry` is available. Falls back to File.path list (dirs recurse in Rust).
 */
export async function collectHtmlDropItems(
  dataTransfer: DataTransfer,
  cwd: string,
): Promise<UploadPlanItem[]> {
  const items = dataTransfer.items;
  if (items?.length) {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (entries.length) {
      const out: UploadPlanItem[] = [];
      for (const entry of entries) {
        await walkEntry(entry, entry.name, cwd, out);
      }
      if (out.length) return out;
    }
  }

  const paths: string[] = [];
  for (const file of Array.from(dataTransfer.files ?? [])) {
    const p = (file as File & { path?: string }).path;
    if (p) paths.push(p);
  }
  return pathsToUploadItems(paths, cwd);
}

async function walkEntry(
  entry: FileSystemEntry,
  relativePath: string,
  cwd: string,
  out: UploadPlanItem[],
): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    const localPath = (file as File & { path?: string }).path;
    if (!localPath) return;
    out.push({
      localPath,
      remotePath: joinRemote(cwd, relativePath.replace(/\\/g, "/")),
      name: relativePath.replace(/\\/g, "/"),
      sizeHint: file.size,
    });
    return;
  }

  if (!entry.isDirectory) return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const children = await readAllEntries(reader);
  // Empty directory: synthesize a marker by uploading nothing for files —
  // backend mkdir happens only when a directory root path is passed. Create an
  // empty remote dir via a dedicated root item when we know the absolute path.
  if (!children.length) {
    const probe = await directoryLocalPath(entry);
    if (probe) {
      out.push({
        localPath: probe,
        remotePath: joinRemote(cwd, relativePath.replace(/\\/g, "/")),
        name: relativePath.replace(/\\/g, "/"),
        sizeHint: 0,
      });
    }
    return;
  }

  for (const child of children) {
    const childRel = `${relativePath}/${child.name}`;
    await walkEntry(child, childRel, cwd, out);
  }
}

/** Best-effort absolute path for a directory entry (Tauri may expose it). */
async function directoryLocalPath(entry: FileSystemDirectoryEntry): Promise<string | null> {
  // Not standard — some embeds put path on the entry.
  const anyEntry = entry as FileSystemDirectoryEntry & { path?: string };
  if (anyEntry.path) return anyEntry.path;
  return null;
}

function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntry[] = [];
    const pump = () => {
      reader.readEntries((batch) => {
        if (!batch.length) {
          resolve(all);
          return;
        }
        all.push(...batch);
        pump();
      }, reject);
    };
    pump();
  });
}
