import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuBarAction =
  | "new-terminal"
  | "lock"
  | "toggle-sidebar"
  | "toggle-sftp"
  | "toggle-plugins"
  | "switch-layout"
  | "toggle-theme"
  | "help"
  | "about";

type MenuId = "file" | "view" | "help";

type MenuItem =
  | { kind: "item"; id: MenuBarAction; label: string; disabled?: boolean }
  | { kind: "sep" };

interface Props {
  onAction: (action: MenuBarAction) => void;
  pluginsAvailable: boolean;
  layoutModeLabel: string;
  themeLabel: string;
  /** App mark — shown at the start of the menubar (VS Code–style). */
  brand?: ReactNode;
}

const MENUS: { id: MenuId; label: string; items: (ctx: Props) => MenuItem[] }[] = [
  {
    id: "file",
    label: "File",
    items: () => [
      { kind: "item", id: "new-terminal", label: "New Terminal" },
      { kind: "sep" },
      { kind: "item", id: "lock", label: "Lock Vault" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: (ctx) => [
      { kind: "item", id: "toggle-sidebar", label: "Toggle Profiles Sidebar" },
      { kind: "item", id: "toggle-sftp", label: "Toggle SFTP Panel" },
      {
        kind: "item",
        id: "toggle-plugins",
        label: "Toggle Plugins",
        disabled: !ctx.pluginsAvailable,
      },
      { kind: "sep" },
      { kind: "item", id: "switch-layout", label: `Layout: ${ctx.layoutModeLabel}` },
      { kind: "item", id: "toggle-theme", label: ctx.themeLabel },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: () => [
      { kind: "item", id: "help", label: "Help" },
      { kind: "item", id: "about", label: "About" },
    ],
  },
];

export function MenuBar({
  onAction,
  pluginsAvailable,
  layoutModeLabel,
  themeLabel,
  brand,
}: Props) {
  const [open, setOpen] = useState<MenuId | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const ctx = { onAction, pluginsAvailable, layoutModeLabel, themeLabel };

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu-bar" ref={rootRef} role="menubar">
      {brand ? (
        <button
          type="button"
          className="menu-bar-brand"
          title="About SSHyar"
          onClick={() => onAction("about")}
        >
          {brand}
        </button>
      ) : null}
      <div className="menu-bar-menus">
        {MENUS.map((menu) => (
          <div key={menu.id} className="menu-bar-item">
            <button
              type="button"
              className={`menu-bar-trigger ${open === menu.id ? "is-open" : ""}`}
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={open === menu.id}
              onClick={() => setOpen((cur) => (cur === menu.id ? null : menu.id))}
              onMouseEnter={() => {
                if (open) setOpen(menu.id);
              }}
            >
              {menu.label}
            </button>
            {open === menu.id ? (
              <div className="menu-bar-dropdown" role="menu">
                {menu.items(ctx).map((item, i) =>
                  item.kind === "sep" ? (
                    <div key={`sep-${i}`} className="menu-bar-sep" />
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className="menu-bar-option"
                      disabled={item.disabled}
                      onClick={() => {
                        setOpen(null);
                        onAction(item.id);
                      }}
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
