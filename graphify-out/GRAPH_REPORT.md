# Graph Report - sshyar  (2026-10-26)

## Corpus Check
- 166 files · ~105,321 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .xml 2, .icns 1)

## Summary
- 1100 nodes · 2773 edges · 50 communities (40 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 91 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tauri command modules
- Rust SSH session core
- Docker backend commands
- SFTP file icons
- App icon assets
- Frontend API clients
- PTY session runtime
- Vault crypto & state
- Russh SSH client
- Host service backend
- CodeMirror languages
- Cron panel UI
- SSH key management
- App shell layout
- Docker containers UI
- Remote file editor
- Profile form UI
- Editor lang packages
- Xterm terminal UI
- Docker status prune
- Release CI workflow
- TypeScript config
- Package metadata
- Docker job context
- Profile sidebar actions
- Profile data model
- Tauri app config
- Docker logs modal
- SSH command builder
- About & version check
- Nginx & host UI
- In-app Help
- Panel layout state
- TS node config
- Dev dependencies
- Profile form logic
- Popover component
- Capability permissions
- NPM scripts
- Dialog host flow
- Editor language detect
- Vite build config
- Desktop notifications
- Root package node
- Tauri logo asset
- Vite logo asset
- React logo asset

## God Nodes (most connected - your core abstractions)
1. `AppState` - 82 edges
2. `toastError()` - 62 edges
3. `SSHyar Brand Icon (terminal prompt + padlock on teal)` - 54 edges
4. `iconProps()` - 52 edges
5. `SftpPanel()` - 47 edges
6. `IconButton` - 41 edges
7. `react` - 34 edges
8. `ProfileSidebar()` - 31 edges
9. `appConfirm()` - 30 edges
10. `toastSuccess()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `SSHyar application icon asset: app-icon.png` --references--> `SSHyar Brand Icon (terminal prompt + padlock on teal)`  [INFERRED]
  public/app-icon.png → app-icons/icon.png
- `SSHyar application icon asset: favicon.png` --references--> `SSHyar Brand Icon (terminal prompt + padlock on teal)`  [INFERRED]
  public/favicon.png → app-icons/icon.png
- `SSHyar application icon asset: 128x128@2x.png` --references--> `SSHyar Brand Icon (terminal prompt + padlock on teal)`  [INFERRED]
  src-tauri/icons/128x128@2x.png → app-icons/icon.png
- `SSHyar application icon asset: 128x128.png` --references--> `SSHyar Brand Icon (terminal prompt + padlock on teal)`  [INFERRED]
  src-tauri/icons/128x128.png → app-icons/icon.png
- `SSHyar application icon asset: 32x32.png` --references--> `SSHyar Brand Icon (terminal prompt + padlock on teal)`  [INFERRED]
  src-tauri/icons/32x32.png → app-icons/icon.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-platform release CI matrix** — github_workflows_release_publish_tauri, github_workflows_release_windows_latest, github_workflows_release_ubuntu_24_04 [EXTRACTED 1.00]
- **SSHyar multi-platform icon pack** — app_icons_icon_asset, app_icons_source_asset, public_app_icon_asset, public_favicon_asset, src_tauri_icons_128x128_asset, src_tauri_icons_128x128_2x_asset, src_tauri_icons_32x32_asset, src_tauri_icons_64x64_asset, src_tauri_icons_square107x107logo_asset, src_tauri_icons_square142x142logo_asset, src_tauri_icons_square150x150logo_asset, src_tauri_icons_square284x284logo_asset, src_tauri_icons_square30x30logo_asset, src_tauri_icons_square310x310logo_asset, src_tauri_icons_square44x44logo_asset, src_tauri_icons_square71x71logo_asset, src_tauri_icons_square89x89logo_asset, src_tauri_icons_storelogo_asset, src_tauri_icons_android_mipmap_hdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_hdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_hdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_mdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_mdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_mdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_round_asset, src_tauri_icons_icon_asset, src_tauri_icons_ios_appicon_20x20_1x_asset, src_tauri_icons_ios_appicon_20x20_2x_1_asset, src_tauri_icons_ios_appicon_20x20_2x_asset, src_tauri_icons_ios_appicon_20x20_3x_asset, src_tauri_icons_ios_appicon_29x29_1x_asset [INFERRED 0.75]
- **Host service session plugins** — readme_docker_plugin, readme_nginx_systemd_cron, readme_session_plugins [INFERRED 0.75]

## Communities (50 total, 10 thin omitted)

### Community 0 - "Tauri command modules"
Cohesion: 0.06
Nodes (52): delete_profile(), delete_snippet(), duplicate_profile(), get_ssh_command(), list_profiles(), list_snippets(), upsert_profile(), upsert_snippet() (+44 more)

### Community 1 - "Rust SSH session core"
Cohesion: 0.07
Nodes (18): SftpConn, SftpManager, collect_copy_plan(), maybe_emit(), PROGRESS_EMIT_EVERY, remote_tree_size(), remove_dir_recursive(), stream_copy_remote() (+10 more)

### Community 2 - "Docker backend commands"
Cohesion: 0.10
Nodes (55): collect_used_image_keys(), combined_output(), compose_working_dir_from_labels(), DfJsonLine, docker_cli(), docker_compose_logs_start(), docker_compose_run(), docker_container_action() (+47 more)

### Community 3 - "SFTP file icons"
Cohesion: 0.07
Nodes (49): BY_EXT, BY_NAME, extensionOf(), FileTypeIcon(), FOLDER_HINTS, IconKind, IconSpec, resolveSpec() (+41 more)

### Community 4 - "App icon assets"
Cohesion: 0.04
Nodes (55): SSHyar application icon asset: icon.png, SSHyar application icon asset: source.jpg, SSHyar application icon asset: app-icon.png, SSHyar application icon asset: favicon.png, SSHyar application icon asset: 128x128@2x.png, SSHyar application icon asset: 128x128.png, SSHyar application icon asset: 32x32.png, SSHyar application icon asset: 64x64.png (+47 more)

### Community 5 - "Frontend API clients"
Cohesion: 0.08
Nodes (42): @tauri-apps/api, Props, Props, Props, Props, dockerApi, hostSvcApi, sftpApi (+34 more)

### Community 6 - "PTY session runtime"
Cohesion: 0.07
Nodes (15): ActiveStream, DockerLogEvent, DockerLogManager, emit(), run_logs_loop(), shell_quote_id(), start_stream(), start_stream_cmd() (+7 more)

### Community 7 - "Vault crypto & state"
Cohesion: 0.09
Nodes (15): app_dir(), BACKUP_FORMAT, BACKUP_VERSION, decrypt(), derive_key(), encrypt(), KEY_FILE, load_or_create_dpapi_key() (+7 more)

### Community 8 - "Russh SSH client"
Cohesion: 0.12
Nodes (11): DockerJobChunkEvent, DockerSessionManager, fingerprint(), open_channel_exec(), read_exec_result(), SessionEntry, ClientHandler, connect_handle() (+3 more)

### Community 9 - "Host service backend"
Cohesion: 0.17
Nodes (31): cmd_result(), combined_output(), CRON_PATH_PREFIXES, cron_probe(), cron_read_system_file(), cron_system_list(), cron_user_list(), CronStatus (+23 more)

### Community 10 - "CodeMirror languages"
Cohesion: 0.06
Nodes (36): dependencies, cm6-graphql, @codemirror/lang-cpp, @codemirror/lang-css, @codemirror/lang-go, @codemirror/lang-html, @codemirror/lang-java, @codemirror/lang-javascript (+28 more)

### Community 11 - "Cron panel UI"
Cohesion: 0.14
Nodes (24): cronDirLabel(), CronPanel(), openFile(), CronTab, Props, DockerJobBar(), IconButton, Props (+16 more)

### Community 12 - "SSH key management"
Cohesion: 0.11
Nodes (18): accept_host_key(), generate_profile_key(), install_profile_key(), probe_host_key(), accept_host_key(), check_fingerprint(), fingerprint_sha256(), host_port_key() (+10 more)

### Community 13 - "App shell layout"
Cohesion: 0.13
Nodes (22): App(), BrandLogo(), Props, PanelLayout(), Props, UnlockGate(), hostLabelFor(), Options (+14 more)

### Community 14 - "Docker containers UI"
Cohesion: 0.15
Nodes (25): useDockerJob(), ContainersTab(), runAction(), groupLabel(), groupWorkingDir(), isRunning(), matchesQuery(), StateFilter (+17 more)

### Community 15 - "Remote file editor"
Cohesion: 0.12
Nodes (19): @codemirror/theme-one-dark, @uiw/react-codemirror, FileEditorMode, Props, RemoteFileEditor(), onKey(), requestClose(), save() (+11 more)

### Community 16 - "Profile form UI"
Cohesion: 0.14
Nodes (17): @tauri-apps/plugin-dialog, empty, FORWARD_PRESETS, Props, SHELL_PRESETS, Panel, Props, ProfileList() (+9 more)

### Community 17 - "Editor lang packages"
Cohesion: 0.11
Nodes (18): cm6-graphql, @codemirror/lang-cpp, @codemirror/lang-css, @codemirror/lang-go, @codemirror/lang-html, @codemirror/lang-javascript, @codemirror/lang-json, @codemirror/lang-php (+10 more)

### Community 18 - "Xterm terminal UI"
Cohesion: 0.13
Nodes (15): @tauri-apps/plugin-clipboard-manager, @xterm/addon-fit, @xterm/addon-web-links, @xterm/xterm, ContextMenu(), ContextMenuItem, Props, buildSftpMenuItems() (+7 more)

### Community 19 - "Docker status prune"
Cohesion: 0.17
Nodes (17): buildPruneConfirmMessage(), formatPreviewLines(), StatusTab(), runPrune(), connect(), Crumb, crumbsFor(), Props (+9 more)

### Community 20 - "Release CI workflow"
Cohesion: 0.11
Nodes (17): Linux .AppImage / .deb, Windows .msi / .exe installer, publish-tauri, tauri-apps/tauri-action, ubuntu-24.04, v* tag trigger, windows-latest, JetBrains Mono (+9 more)

### Community 21 - "TypeScript config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 22 - "Package metadata"
Cohesion: 0.11
Nodes (17): description, license, name, private, type, version, @codemirror/lang-java, @codemirror/lang-markdown (+9 more)

### Community 23 - "Docker job context"
Cohesion: 0.14
Nodes (14): react, Ctx, DockerJob, DockerJobCtx, DockerJobProvider(), DockerJobStatus, JobChunkEvent, RunOpts (+6 more)

### Community 24 - "Profile sidebar actions"
Cohesion: 0.24
Nodes (16): ProfileSidebar(), changeMaster(), copySsh(), exportBackup(), genKey(), importBackup(), installKey(), lockVault() (+8 more)

### Community 25 - "Profile data model"
Cohesion: 0.20
Nodes (10): AuthMethod, Key, Password, default_forward_host(), default_remote_shell(), PortForward, Profile, ProfileInput (+2 more)

### Community 26 - "Tauri app config"
Cohesion: 0.11
Nodes (17): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+9 more)

### Community 27 - "Docker logs modal"
Cohesion: 0.17
Nodes (9): @mui/icons-material, react-dom, DockerLogsModal(), sourceKey(), TAIL_OPTIONS, Props, ACTION_LABEL, findComposeFileName() (+1 more)

### Community 28 - "SSH command builder"
Cohesion: 0.27
Nodes (12): build_remote_command(), build_ssh_args(), build_ssh_command_line(), embed_connect_command(), empty_shell_uses_server_default(), local_port_forwards_emit_dash_l(), posix_quote(), post_connect_avoids_shell_var_and_quotes() (+4 more)

### Community 29 - "About & version check"
Cohesion: 0.21
Nodes (12): AboutPopover(), open(), runCheck(), Props, checkForAppUpdate(), compareSemver(), GITHUB_LATEST_API, GITHUB_RELEASES_URL (+4 more)

### Community 30 - "Nginx & host UI"
Cohesion: 0.27
Nodes (9): NginxPanel(), runReload(), runTest(), Props, act(), api, keysApi, ptyApi (+1 more)

### Community 31 - "In-app Help"
Cohesion: 0.25
Nodes (5): HelpModal(), filterHelpSections(), HELP_SECTIONS, HelpBlock, HelpSection

### Community 32 - "Panel layout state"
Cohesion: 0.32
Nodes (7): DEFAULTS, DragSide, LayoutState, loadLayout(), Props, saveLayout(), usePanelLayout()

### Community 33 - "TS node config"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 34 - "Dev dependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @tauri-apps/cli, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react

### Community 37 - "Capability permissions"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 38 - "NPM scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, tauri

### Community 39 - "Dialog host flow"
Cohesion: 0.60
Nodes (5): advance(), DialogHost(), finishConfirm(), finishPassword(), finishPrompt()

### Community 40 - "Editor language detect"
Cohesion: 0.60
Nodes (5): isAnsiblePath(), extOf(), fileName(), languageForPath(), stream()

### Community 42 - "Desktop notifications"
Cohesion: 0.67
Nodes (3): @tauri-apps/plugin-notification, desktopNotify(), ensurePermission()

## Knowledge Gaps
- **78 isolated node(s):** `@emotion/react`, `@emotion/styled`, `@tauri-apps/plugin-shell`, `@tauri-apps/cli`, `@types/react` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 352 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `Tauri command modules` to `Host service backend`, `Docker backend commands`, `SSH key management`, `Vault crypto & state`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 52 inferred relationships involving `SSHyar Brand Icon (terminal prompt + padlock on teal)` (e.g. with `SSHyar application icon asset: icon.png` and `SSHyar application icon asset: source.jpg`) actually correct?**
  _`SSHyar Brand Icon (terminal prompt + padlock on teal)` has 52 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@emotion/react`, `@emotion/styled`, `@tauri-apps/plugin-shell` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tauri command modules` be split into smaller, more focused modules?**
  _Cohesion score 0.055661729574773056 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `CodeMirror languages` to `Package metadata`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Rust SSH session core` be split into smaller, more focused modules?**
  _Cohesion score 0.073224043715847 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Docker job context` to `Panel layout state`, `Popover component`, `Cron panel UI`, `App shell layout`, `Docker containers UI`, `Remote file editor`, `Profile form UI`, `Xterm terminal UI`, `Docker status prune`, `Package metadata`, `Docker logs modal`, `Nginx & host UI`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._