import { getCurrentWindow } from "@tauri-apps/api/window";
import { WindowControls } from "./WindowControls";

/** Minimal frameless title strip for unlock / loading screens. */
export function AppTitleChrome() {
  return (
    <div className="app-title-chrome">
      <div
        className="menu-bar-drag"
        data-tauri-drag-region
        onDoubleClick={() => {
          void getCurrentWindow()
            .toggleMaximize()
            .catch(() => undefined);
        }}
      />
      <WindowControls />
    </div>
  );
}
