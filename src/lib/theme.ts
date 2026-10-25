export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "sshyar-theme";

export function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(current: ThemeMode): ThemeMode {
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export const terminalThemes = {
  dark: {
    background: "#0f1419",
    foreground: "#d6d3d1",
    cursor: "#e7e5e4",
    selectionBackground: "#44403c",
  },
  light: {
    background: "#f5f5f4",
    foreground: "#1c1917",
    cursor: "#292524",
    selectionBackground: "#d6d3d1",
  },
} as const;
