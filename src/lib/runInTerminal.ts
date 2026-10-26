import { api } from "./api";
import { toastError, toastSuccess } from "./toast";

/** Inject a command into the active SSH terminal so the user can enter sudo interactively. */
export async function runInTerminal(
  ptyId: string | null | undefined,
  command: string,
  title: string,
): Promise<boolean> {
  if (!ptyId) {
    toastError("Open a terminal tab for this profile first", title);
    return false;
  }
  try {
    await api.ptyInject(ptyId, command);
    toastSuccess("Sent to terminal — enter sudo password if asked", title);
    return true;
  } catch (e) {
    toastError(e, title);
    return false;
  }
}
