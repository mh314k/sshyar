import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

let permissionChecked = false;
let allowed = false;

async function ensurePermission(): Promise<boolean> {
  if (permissionChecked) return allowed;
  permissionChecked = true;
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const perm = await requestPermission();
      granted = perm === "granted";
    }
    allowed = granted;
  } catch {
    allowed = false;
  }
  return allowed;
}

/** Best-effort OS notification (no-op if denied / unavailable). */
export async function desktopNotify(title: string, body: string): Promise<void> {
  try {
    if (!(await ensurePermission())) return;
    sendNotification({ title, body });
  } catch {
    /* ignore */
  }
}
