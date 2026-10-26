import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import App from "./App";
import { applyTheme, readStoredTheme } from "./lib/theme";

// Block the default browser menu on chrome UI.
// Inputs/textareas keep native cut/copy/paste; panels open their own menus.
document.addEventListener("contextmenu", (e) => {
  const t = e.target as HTMLElement | null;
  if (t?.closest("input, textarea, select")) return;
  e.preventDefault();
});

applyTheme(readStoredTheme());

/** Minimal MUI theme so SvgIcon / Emotion have a provider (avoids blank white crash). */
const muiTheme = createTheme({
  typography: { fontFamily: "inherit" },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={muiTheme}>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
