export function formatSize(n: number) {
  if (!n || n < 0) return "0 B";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function pct(sent: number, total: number) {
  if (!total || total <= 0) return sent > 0 ? 100 : 0;
  return Math.min(100, Math.round((sent / total) * 100));
}

export function joinRemote(cwd: string, name: string) {
  return `${cwd.replace(/\/$/, "")}/${name}`;
}

export function parentPath(path: string) {
  return path.replace(/\/+$/, "").split("/").slice(0, -1).join("/") || "/";
}
