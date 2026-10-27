import type { SvgIconComponent } from "@mui/icons-material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import AudioFileOutlinedIcon from "@mui/icons-material/AudioFileOutlined";
import CodeOutlinedIcon from "@mui/icons-material/CodeOutlined";
import CssIcon from "@mui/icons-material/Css";
import DataObjectOutlinedIcon from "@mui/icons-material/DataObjectOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import HtmlIcon from "@mui/icons-material/Html";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import JavascriptOutlinedIcon from "@mui/icons-material/JavascriptOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";
import PhpIcon from "@mui/icons-material/Php";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import TerminalOutlinedIcon from "@mui/icons-material/TerminalOutlined";
import TextSnippetOutlinedIcon from "@mui/icons-material/TextSnippetOutlined";
import { iconProps, iconSizeSm } from "../../../components/icons";

type IconKind =
  | "folder"
  | "code"
  | "config"
  | "data"
  | "doc"
  | "media"
  | "archive"
  | "secret"
  | "package"
  | "default";

type IconSpec = { Icon: SvgIconComponent; kind: IconKind };

const BY_EXT: Record<string, IconSpec> = {
  js: { Icon: JavascriptOutlinedIcon, kind: "code" },
  mjs: { Icon: JavascriptOutlinedIcon, kind: "code" },
  cjs: { Icon: JavascriptOutlinedIcon, kind: "code" },
  jsx: { Icon: JavascriptOutlinedIcon, kind: "code" },
  ts: { Icon: CodeOutlinedIcon, kind: "code" },
  tsx: { Icon: CodeOutlinedIcon, kind: "code" },
  vue: { Icon: CodeOutlinedIcon, kind: "code" },
  svelte: { Icon: CodeOutlinedIcon, kind: "code" },
  html: { Icon: HtmlIcon, kind: "code" },
  htm: { Icon: HtmlIcon, kind: "code" },
  css: { Icon: CssIcon, kind: "code" },
  scss: { Icon: CssIcon, kind: "code" },
  sass: { Icon: CssIcon, kind: "code" },
  less: { Icon: CssIcon, kind: "code" },
  php: { Icon: PhpIcon, kind: "code" },
  py: { Icon: CodeOutlinedIcon, kind: "code" },
  rb: { Icon: CodeOutlinedIcon, kind: "code" },
  go: { Icon: CodeOutlinedIcon, kind: "code" },
  rs: { Icon: CodeOutlinedIcon, kind: "code" },
  java: { Icon: CodeOutlinedIcon, kind: "code" },
  kt: { Icon: CodeOutlinedIcon, kind: "code" },
  cs: { Icon: CodeOutlinedIcon, kind: "code" },
  c: { Icon: CodeOutlinedIcon, kind: "code" },
  h: { Icon: CodeOutlinedIcon, kind: "code" },
  cpp: { Icon: CodeOutlinedIcon, kind: "code" },
  hpp: { Icon: CodeOutlinedIcon, kind: "code" },
  swift: { Icon: CodeOutlinedIcon, kind: "code" },
  dart: { Icon: CodeOutlinedIcon, kind: "code" },
  lua: { Icon: CodeOutlinedIcon, kind: "code" },
  sol: { Icon: CodeOutlinedIcon, kind: "code" },
  graphql: { Icon: DataObjectOutlinedIcon, kind: "code" },
  gql: { Icon: DataObjectOutlinedIcon, kind: "code" },

  sh: { Icon: TerminalOutlinedIcon, kind: "code" },
  bash: { Icon: TerminalOutlinedIcon, kind: "code" },
  zsh: { Icon: TerminalOutlinedIcon, kind: "code" },
  fish: { Icon: TerminalOutlinedIcon, kind: "code" },
  ps1: { Icon: TerminalOutlinedIcon, kind: "code" },
  bat: { Icon: TerminalOutlinedIcon, kind: "code" },
  cmd: { Icon: TerminalOutlinedIcon, kind: "code" },

  json: { Icon: DataObjectOutlinedIcon, kind: "data" },
  jsonc: { Icon: DataObjectOutlinedIcon, kind: "data" },
  yaml: { Icon: SettingsOutlinedIcon, kind: "config" },
  yml: { Icon: SettingsOutlinedIcon, kind: "config" },
  toml: { Icon: SettingsOutlinedIcon, kind: "config" },
  ini: { Icon: SettingsOutlinedIcon, kind: "config" },
  conf: { Icon: SettingsOutlinedIcon, kind: "config" },
  cfg: { Icon: SettingsOutlinedIcon, kind: "config" },
  env: { Icon: SettingsOutlinedIcon, kind: "config" },
  xml: { Icon: CodeOutlinedIcon, kind: "data" },
  svg: { Icon: ImageOutlinedIcon, kind: "media" },
  csv: { Icon: TableChartOutlinedIcon, kind: "data" },
  tsv: { Icon: TableChartOutlinedIcon, kind: "data" },
  xls: { Icon: TableChartOutlinedIcon, kind: "data" },
  xlsx: { Icon: TableChartOutlinedIcon, kind: "data" },
  sql: { Icon: StorageOutlinedIcon, kind: "data" },
  db: { Icon: StorageOutlinedIcon, kind: "data" },
  sqlite: { Icon: StorageOutlinedIcon, kind: "data" },

  md: { Icon: DescriptionOutlinedIcon, kind: "doc" },
  mdx: { Icon: DescriptionOutlinedIcon, kind: "doc" },
  txt: { Icon: TextSnippetOutlinedIcon, kind: "doc" },
  log: { Icon: TextSnippetOutlinedIcon, kind: "doc" },
  pdf: { Icon: PictureAsPdfOutlinedIcon, kind: "doc" },
  doc: { Icon: DescriptionOutlinedIcon, kind: "doc" },
  docx: { Icon: DescriptionOutlinedIcon, kind: "doc" },

  png: { Icon: ImageOutlinedIcon, kind: "media" },
  jpg: { Icon: ImageOutlinedIcon, kind: "media" },
  jpeg: { Icon: ImageOutlinedIcon, kind: "media" },
  gif: { Icon: ImageOutlinedIcon, kind: "media" },
  webp: { Icon: ImageOutlinedIcon, kind: "media" },
  ico: { Icon: ImageOutlinedIcon, kind: "media" },
  mp3: { Icon: AudioFileOutlinedIcon, kind: "media" },
  wav: { Icon: AudioFileOutlinedIcon, kind: "media" },
  flac: { Icon: AudioFileOutlinedIcon, kind: "media" },
  mp4: { Icon: MovieOutlinedIcon, kind: "media" },
  mkv: { Icon: MovieOutlinedIcon, kind: "media" },
  webm: { Icon: MovieOutlinedIcon, kind: "media" },
  mov: { Icon: MovieOutlinedIcon, kind: "media" },

  zip: { Icon: FolderZipOutlinedIcon, kind: "archive" },
  gz: { Icon: ArchiveOutlinedIcon, kind: "archive" },
  tgz: { Icon: ArchiveOutlinedIcon, kind: "archive" },
  tar: { Icon: ArchiveOutlinedIcon, kind: "archive" },
  bz2: { Icon: ArchiveOutlinedIcon, kind: "archive" },
  xz: { Icon: ArchiveOutlinedIcon, kind: "archive" },
  "7z": { Icon: ArchiveOutlinedIcon, kind: "archive" },
  rar: { Icon: ArchiveOutlinedIcon, kind: "archive" },
  deb: { Icon: ArchiveOutlinedIcon, kind: "package" },
  rpm: { Icon: ArchiveOutlinedIcon, kind: "package" },
  apk: { Icon: ArchiveOutlinedIcon, kind: "package" },

  pem: { Icon: KeyOutlinedIcon, kind: "secret" },
  crt: { Icon: LockOutlinedIcon, kind: "secret" },
  key: { Icon: KeyOutlinedIcon, kind: "secret" },
  pub: { Icon: KeyOutlinedIcon, kind: "secret" },
  lock: { Icon: LockOutlinedIcon, kind: "package" },
};

const BY_NAME: Record<string, IconSpec> = {
  dockerfile: { Icon: SettingsOutlinedIcon, kind: "config" },
  "docker-compose.yml": { Icon: SettingsOutlinedIcon, kind: "config" },
  "docker-compose.yaml": { Icon: SettingsOutlinedIcon, kind: "config" },
  makefile: { Icon: SettingsOutlinedIcon, kind: "config" },
  license: { Icon: DescriptionOutlinedIcon, kind: "doc" },
  "license.md": { Icon: DescriptionOutlinedIcon, kind: "doc" },
  readme: { Icon: DescriptionOutlinedIcon, kind: "doc" },
  "readme.md": { Icon: DescriptionOutlinedIcon, kind: "doc" },
  "package.json": { Icon: DataObjectOutlinedIcon, kind: "package" },
  "package-lock.json": { Icon: LockOutlinedIcon, kind: "package" },
  "pnpm-lock.yaml": { Icon: LockOutlinedIcon, kind: "package" },
  "yarn.lock": { Icon: LockOutlinedIcon, kind: "package" },
  "cargo.toml": { Icon: SettingsOutlinedIcon, kind: "package" },
  "tsconfig.json": { Icon: SettingsOutlinedIcon, kind: "config" },
  ".gitignore": { Icon: FolderSpecialOutlinedIcon, kind: "config" },
  ".env": { Icon: SettingsOutlinedIcon, kind: "secret" },
  ".env.local": { Icon: SettingsOutlinedIcon, kind: "secret" },
  ".bashrc": { Icon: TerminalOutlinedIcon, kind: "config" },
  ".zshrc": { Icon: TerminalOutlinedIcon, kind: "config" },
  ".bash_history": { Icon: TerminalOutlinedIcon, kind: "doc" },
};

const FOLDER_HINTS: Record<string, IconSpec> = {
  ".git": { Icon: FolderSpecialOutlinedIcon, kind: "folder" },
  ".ssh": { Icon: KeyOutlinedIcon, kind: "secret" },
  node_modules: { Icon: FolderSpecialOutlinedIcon, kind: "package" },
  dist: { Icon: FolderSpecialOutlinedIcon, kind: "folder" },
  build: { Icon: FolderSpecialOutlinedIcon, kind: "folder" },
  src: { Icon: FolderOutlinedIcon, kind: "folder" },
  public: { Icon: FolderOutlinedIcon, kind: "folder" },
  assets: { Icon: ImageOutlinedIcon, kind: "folder" },
  docs: { Icon: DescriptionOutlinedIcon, kind: "folder" },
};

function extensionOf(name: string): string {
  const base = name.split("/").pop() ?? name;
  const i = base.lastIndexOf(".");
  if (i <= 0) return "";
  return base.slice(i + 1).toLowerCase();
}

function resolveSpec(name: string, isDir: boolean): IconSpec {
  const base = (name.split("/").pop() ?? name).toLowerCase();
  if (isDir) {
    return FOLDER_HINTS[base] ?? { Icon: FolderOutlinedIcon, kind: "folder" };
  }
  if (BY_NAME[base]) return BY_NAME[base];
  const ext = extensionOf(name);
  if (ext && BY_EXT[ext]) return BY_EXT[ext];
  if (base.endsWith(".tar.gz") || base.endsWith(".tar.bz2") || base.endsWith(".tar.xz")) {
    return { Icon: ArchiveOutlinedIcon, kind: "archive" };
  }
  return { Icon: InsertDriveFileOutlinedIcon, kind: "default" };
}

export function FileTypeIcon({
  name,
  isDir,
  size = iconSizeSm,
}: {
  name: string;
  isDir: boolean;
  size?: number;
}) {
  const { Icon, kind } = resolveSpec(name, isDir);
  return (
    <span className={`sftp-icon sftp-icon-${kind}`} aria-hidden>
      <Icon {...iconProps(size)} />
    </span>
  );
}
