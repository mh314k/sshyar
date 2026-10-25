import type { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { sql } from "@codemirror/lang-sql";
import { php } from "@codemirror/lang-php";
import { rust } from "@codemirror/lang-rust";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { go } from "@codemirror/lang-go";
import { StreamLanguage } from "@codemirror/language";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { properties } from "@codemirror/legacy-modes/mode/properties";
import { toml } from "@codemirror/legacy-modes/mode/toml";
import { nginx } from "@codemirror/legacy-modes/mode/nginx";

function extOf(path: string): string {
  const base = path.split(/[/\\]/).pop() || path;
  const lower = base.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "dockerfile";
  if (lower === "makefile" || lower === "gnumakefile") return "makefile";
  if (lower === "cmakelists.txt") return "cmake";
  const i = lower.lastIndexOf(".");
  return i >= 0 ? lower.slice(i + 1) : "";
}

/** Map filename / path → CodeMirror language extension (or null). */
export function languageForPath(path: string): { name: string; extension: Extension } | null {
  const ext = extOf(path);
  const base = (path.split(/[/\\]/).pop() || "").toLowerCase();

  switch (ext) {
    case "js":
    case "mjs":
    case "cjs":
      return { name: "JavaScript", extension: javascript() };
    case "jsx":
      return { name: "JSX", extension: javascript({ jsx: true }) };
    case "ts":
    case "mts":
    case "cts":
      return { name: "TypeScript", extension: javascript({ typescript: true }) };
    case "tsx":
      return { name: "TSX", extension: javascript({ typescript: true, jsx: true }) };
    case "json":
    case "jsonc":
      return { name: "JSON", extension: json() };
    case "html":
    case "htm":
    case "svelte":
    case "vue":
      return { name: "HTML", extension: html() };
    case "css":
    case "scss":
    case "less":
      return { name: "CSS", extension: css() };
    case "py":
    case "pyw":
      return { name: "Python", extension: python() };
    case "md":
    case "mdx":
    case "markdown":
      return { name: "Markdown", extension: markdown() };
    case "xml":
    case "svg":
    case "xsl":
    case "plist":
      return { name: "XML", extension: xml() };
    case "yml":
    case "yaml":
      return { name: "YAML", extension: yaml() };
    case "sql":
      return { name: "SQL", extension: sql() };
    case "php":
      return { name: "PHP", extension: php() };
    case "rs":
      return { name: "Rust", extension: rust() };
    case "c":
    case "h":
    case "cc":
    case "cpp":
    case "cxx":
    case "hpp":
    case "hxx":
      return { name: "C/C++", extension: cpp() };
    case "java":
      return { name: "Java", extension: java() };
    case "go":
      return { name: "Go", extension: go() };
    case "sh":
    case "bash":
    case "zsh":
    case "ksh":
    case "bashrc":
    case "zshrc":
    case "profile":
      return { name: "Shell", extension: StreamLanguage.define(shell) };
    case "dockerfile":
      return { name: "Dockerfile", extension: StreamLanguage.define(dockerFile) };
    case "toml":
      return { name: "TOML", extension: StreamLanguage.define(toml) };
    case "ini":
    case "conf":
    case "cfg":
    case "env":
    case "properties":
      return { name: "Config", extension: StreamLanguage.define(properties) };
    case "nginx":
      return { name: "Nginx", extension: StreamLanguage.define(nginx) };
    default:
      break;
  }

  if (base === "dockerfile") {
    return { name: "Dockerfile", extension: StreamLanguage.define(dockerFile) };
  }
  if (base.endsWith(".service") || base.endsWith(".conf")) {
    return { name: "Config", extension: StreamLanguage.define(properties) };
  }

  return null;
}
