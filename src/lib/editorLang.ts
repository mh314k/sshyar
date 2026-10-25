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
import { powerShell } from "@codemirror/legacy-modes/mode/powershell";
import { diff } from "@codemirror/legacy-modes/mode/diff";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { perl } from "@codemirror/legacy-modes/mode/perl";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { cmake } from "@codemirror/legacy-modes/mode/cmake";
import { groovy } from "@codemirror/legacy-modes/mode/groovy";
import { protobuf } from "@codemirror/legacy-modes/mode/protobuf";
import { http } from "@codemirror/legacy-modes/mode/http";
import { puppet } from "@codemirror/legacy-modes/mode/puppet";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { julia } from "@codemirror/legacy-modes/mode/julia";
import { r } from "@codemirror/legacy-modes/mode/r";
import { erlang } from "@codemirror/legacy-modes/mode/erlang";
import { haskell } from "@codemirror/legacy-modes/mode/haskell";
import { fortran } from "@codemirror/legacy-modes/mode/fortran";
import { coffeeScript } from "@codemirror/legacy-modes/mode/coffeescript";
import { crystal } from "@codemirror/legacy-modes/mode/crystal";
import { elm } from "@codemirror/legacy-modes/mode/elm";
import { tcl } from "@codemirror/legacy-modes/mode/tcl";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { sass } from "@codemirror/legacy-modes/mode/sass";
import { vb } from "@codemirror/legacy-modes/mode/vb";
import { vbScript } from "@codemirror/legacy-modes/mode/vbscript";
import { wast } from "@codemirror/legacy-modes/mode/wast";
import { xQuery } from "@codemirror/legacy-modes/mode/xquery";
import {
  kotlin,
  dart,
  csharp,
  scala,
  objectiveC,
  objectiveCpp,
} from "@codemirror/legacy-modes/mode/clike";
import { solidity } from "@replit/codemirror-lang-solidity";
import { graphqlLanguageSupport } from "cm6-graphql";
import { isAnsiblePath, logMode, sshConfigMode } from "./editorCustomModes";

function fileName(path: string): string {
  return (path.split(/[/\\]/).pop() || path).toLowerCase();
}

function extOf(path: string): string {
  const base = fileName(path);
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "dockerfile";
  if (base === "makefile" || base === "gnumakefile" || base.endsWith(".mk")) return "makefile";
  if (base === "cmakelists.txt") return "cmake";
  if (base === "gemfile" || base === "rakefile" || base === "brewfile") return "ruby";
  if (base === "vagrantfile") return "ruby";
  if (base === "procfile") return "shell";
  if (
    base === "sshd_config" ||
    base === "ssh_config" ||
    base === "authorized_keys" ||
    base === "known_hosts" ||
    base === "config" && path.replace(/\\/g, "/").includes("/.ssh/")
  ) {
    return "sshconfig";
  }
  if (base === "hosts" || base === "hostname") return "hosts";
  if (base === "nginx.conf" || base.endsWith(".nginx")) return "nginx";
  if (base.endsWith(".service") || base.endsWith(".socket") || base.endsWith(".timer")) {
    return "systemd";
  }
  if (base === "ansible.cfg") return "ansiblecfg";
  if (isAnsiblePath(path) && (base.endsWith(".yml") || base.endsWith(".yaml"))) return "ansible";
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1) : "";
}

function stream(name: string, mode: Parameters<typeof StreamLanguage.define>[0]) {
  return { name, extension: StreamLanguage.define(mode) as Extension };
}

/** Map filename / path → CodeMirror language extension (or null). */
export function languageForPath(path: string): { name: string; extension: Extension } | null {
  const ext = extOf(path);
  const base = fileName(path);

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
    case "webmanifest":
      return { name: "JSON", extension: json() };
    case "html":
    case "htm":
    case "svelte":
    case "vue":
    case "handlebars":
    case "hbs":
    case "ejs":
      return { name: "HTML", extension: html() };
    case "css":
    case "less":
      return { name: "CSS", extension: css() };
    case "scss":
    case "sass":
      return stream("Sass", sass);
    case "py":
    case "pyw":
    case "pyi":
      return { name: "Python", extension: python() };
    case "md":
    case "mdx":
    case "markdown":
      return { name: "Markdown", extension: markdown() };
    case "xml":
    case "svg":
    case "xsl":
    case "xslt":
    case "plist":
    case "csproj":
    case "fsproj":
    case "vbproj":
      return { name: "XML", extension: xml() };
    case "yml":
    case "yaml":
      return { name: "YAML", extension: yaml() };
    case "ansible":
      return { name: "Ansible", extension: yaml() };
    case "ansiblecfg":
      return stream("Ansible", properties);
    case "sql":
      return { name: "SQL", extension: sql() };
    case "php":
    case "phtml":
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
    case "hh":
    case "ino":
      return { name: "C/C++", extension: cpp() };
    case "java":
      return { name: "Java", extension: java() };
    case "go":
      return { name: "Go", extension: go() };
    case "sh":
    case "bash":
    case "zsh":
    case "ksh":
    case "fish":
    case "bashrc":
    case "zshrc":
    case "profile":
    case "bash_profile":
    case "zshenv":
      return stream("Shell", shell);
    case "ps1":
    case "psm1":
    case "psd1":
      return stream("PowerShell", powerShell);
    case "dockerfile":
      return stream("Dockerfile", dockerFile);
    case "toml":
      return stream("TOML", toml);
    case "ini":
    case "conf":
    case "cfg":
    case "env":
    case "properties":
    case "editorconfig":
    case "gitconfig":
    case "npmrc":
    case "systemd":
    case "hosts":
      return stream("Config", properties);
    case "sshconfig":
      return stream("SSH Config", sshConfigMode);
    case "nginx":
      return stream("Nginx", nginx);
    case "log":
    case "out":
      return stream("Log", logMode);
    case "kt":
    case "kts":
      return stream("Kotlin", kotlin);
    case "dart":
      return stream("Dart", dart);
    case "cs":
    case "csx":
      return stream("C#", csharp);
    case "scala":
    case "sc":
      return stream("Scala", scala);
    case "m":
    case "mm":
      return stream("Objective-C", base.endsWith(".mm") ? objectiveCpp : objectiveC);
    case "sol":
      return { name: "Solidity", extension: solidity };
    case "graphql":
    case "gql":
      return { name: "GraphQL", extension: graphqlLanguageSupport() };
    case "diff":
    case "patch":
      return stream("Diff", diff);
    case "lua":
      return stream("Lua", lua);
    case "pl":
    case "pm":
    case "t":
      return stream("Perl", perl);
    case "rb":
    case "rake":
    case "gemspec":
    case "ruby":
      return stream("Ruby", ruby);
    case "cmake":
      return stream("CMake", cmake);
    case "makefile":
    case "mk":
      // No dedicated Makefile mode in package — shell highlighting is closest.
      return stream("Makefile", shell);
    case "groovy":
    case "gradle":
      return stream("Groovy", groovy);
    case "proto":
      return stream("Protobuf", protobuf);
    case "http":
    case "rest":
      return stream("HTTP", http);
    case "pp":
      return stream("Puppet", puppet);
    case "swift":
      return stream("Swift", swift);
    case "jl":
      return stream("Julia", julia);
    case "r":
    case "rmd":
      return stream("R", r);
    case "erl":
    case "hrl":
      return stream("Erlang", erlang);
    case "hs":
    case "lhs":
      return stream("Haskell", haskell);
    case "f":
    case "for":
    case "f90":
    case "f95":
      return stream("Fortran", fortran);
    case "coffee":
      return stream("CoffeeScript", coffeeScript);
    case "cr":
      return stream("Crystal", crystal);
    case "elm":
      return stream("Elm", elm);
    case "tcl":
      return stream("Tcl", tcl);
    case "tex":
    case "latex":
    case "ltx":
    case "sty":
      return stream("TeX", stex);
    case "vb":
      return stream("VB", vb);
    case "vbs":
      return stream("VBScript", vbScript);
    case "wat":
    case "wast":
      return stream("WebAssembly", wast);
    case "xq":
    case "xquery":
      return stream("XQuery", xQuery);
    case "gitignore":
    case "dockerignore":
    case "eslintignore":
    case "prettierignore":
      return stream("Ignore", properties);
    default:
      break;
  }

  if (base === "dockerfile") return stream("Dockerfile", dockerFile);
  if (base === "makefile" || base === "gnumakefile") return stream("Makefile", shell);
  if (base === "cmakelists.txt") return stream("CMake", cmake);
  if (base === ".gitignore" || base === ".dockerignore") return stream("Ignore", properties);
  if (base === ".env" || base.startsWith(".env.")) return stream("Config", properties);
  if (base.endsWith(".log") || /(?:access|error|auth|syslog|messages)/.test(base)) {
    return stream("Log", logMode);
  }
  if (isAnsiblePath(path)) return { name: "Ansible", extension: yaml() };

  return null;
}
