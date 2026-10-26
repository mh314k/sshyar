# Graph Report - sshyar  (2026-10-26)

## Corpus Check
- 140 files · ~85,231 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 3, .xml 2, .icns 1)

## Summary
- 807 nodes · 1726 edges · 43 communities (33 shown, 10 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Material UI Icons
- Profile Sidebar UI
- App Brand Icons
- Profile Commands API
- SFTP Session Core
- SSH Session Russh
- Keys Auth Modules
- Vault Crypto Core
- CodeMirror Languages
- Release CI Pipeline
- Embedded PTY Shell
- Editor Lang Imports
- Package Metadata
- Context Menu React
- Profile Form UI
- App Shell Layout
- TypeScript Config
- Tauri App Config
- Profile Data Model
- SSH Command Builder
- Frontend Tauri API
- Dialog Host Flows
- About Version Check
- In-App Help System
- Session Tabs Hook
- Panel Layout State
- TS Node Config
- Frontend DevDeps
- Remote File Editor
- Terminal Pane Xterm
- Tauri Capabilities
- NPM Scripts
- Editor Language Map
- Vite Build Setup
- Popover Component
- Crate Root Name
- Tauri Logo Asset
- Vite Logo Asset
- Known Hosts File
- React Logo Asset

## God Nodes (most connected - your core abstractions)
1. `SSHyar Brand Icon (terminal prompt + padlock on teal)` - 54 edges
2. `AppState` - 45 edges
3. `SftpPanel()` - 45 edges
4. `toastError()` - 33 edges
5. `ProfileSidebar()` - 29 edges
6. `iconProps()` - 28 edges
7. `VaultState` - 24 edges
8. `SftpManager` - 21 edges
9. `toastSuccess()` - 21 edges
10. `react` - 20 edges

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
- **SSHyar core product features** — readme_terminal, readme_vault, readme_sftp, readme_profiles, readme_snippets [EXTRACTED 1.00]
- **Vault encrypted data and platform key files** — readme_vault_dat, readme_vault_key_dpapi, readme_vault_key_raw, readme_vault_meta_json [EXTRACTED 1.00]
- **Cross-platform release CI matrix** — github_workflows_release_publish_tauri, github_workflows_release_windows_latest, github_workflows_release_ubuntu_24_04 [EXTRACTED 1.00]
- **SSHyar multi-platform icon pack** — app_icons_icon_asset, app_icons_source_asset, public_app_icon_asset, public_favicon_asset, src_tauri_icons_128x128_asset, src_tauri_icons_128x128_2x_asset, src_tauri_icons_32x32_asset, src_tauri_icons_64x64_asset, src_tauri_icons_square107x107logo_asset, src_tauri_icons_square142x142logo_asset, src_tauri_icons_square150x150logo_asset, src_tauri_icons_square284x284logo_asset, src_tauri_icons_square30x30logo_asset, src_tauri_icons_square310x310logo_asset, src_tauri_icons_square44x44logo_asset, src_tauri_icons_square71x71logo_asset, src_tauri_icons_square89x89logo_asset, src_tauri_icons_storelogo_asset, src_tauri_icons_android_mipmap_hdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_hdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_hdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_mdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_mdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_mdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_round_asset, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_asset, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_foreground_asset, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_round_asset, src_tauri_icons_icon_asset, src_tauri_icons_ios_appicon_20x20_1x_asset, src_tauri_icons_ios_appicon_20x20_2x_1_asset, src_tauri_icons_ios_appicon_20x20_2x_asset, src_tauri_icons_ios_appicon_20x20_3x_asset, src_tauri_icons_ios_appicon_29x29_1x_asset [INFERRED 0.75]

## Communities (43 total, 10 thin omitted)

### Community 0 - "Material UI Icons"
Cohesion: 0.07
Nodes (53): @mui/icons-material, IconButton, Props, Variant, iconProps(), iconSize, iconSizeLg, iconSizeSm (+45 more)

### Community 1 - "Profile Sidebar UI"
Cohesion: 0.08
Nodes (53): AboutPopover(), open(), runCheck(), ProfileSidebar(), changeMaster(), copySsh(), genKey(), installKey() (+45 more)

### Community 2 - "App Brand Icons"
Cohesion: 0.04
Nodes (55): SSHyar application icon asset: icon.png, SSHyar application icon asset: source.jpg, SSHyar application icon asset: app-icon.png, SSHyar application icon asset: favicon.png, SSHyar application icon asset: 128x128@2x.png, SSHyar application icon asset: 128x128.png, SSHyar application icon asset: 32x32.png, SSHyar application icon asset: 64x64.png (+47 more)

### Community 3 - "Profile Commands API"
Cohesion: 0.11
Nodes (33): delete_profile(), delete_snippet(), duplicate_profile(), get_ssh_command(), list_profiles(), list_snippets(), upsert_profile(), upsert_snippet() (+25 more)

### Community 4 - "SFTP Session Core"
Cohesion: 0.10
Nodes (13): SftpConn, SftpManager, collect_copy_plan(), maybe_emit(), PROGRESS_EMIT_EVERY, remote_tree_size(), remove_dir_recursive(), stream_copy_remote() (+5 more)

### Community 5 - "SSH Session Russh"
Cohesion: 0.07
Nodes (22): accept_host_key(), check_fingerprint(), fingerprint_sha256(), host_port_key(), HostKeyInfo, known_hosts_path(), KnownHosts, load_known_hosts() (+14 more)

### Community 6 - "Keys Auth Modules"
Cohesion: 0.08
Nodes (20): accept_host_key(), generate_profile_key(), install_profile_key(), probe_host_key(), open_external_ssh(), open_external_unix(), open_external_windows(), pty_create() (+12 more)

### Community 7 - "Vault Crypto Core"
Cohesion: 0.09
Nodes (12): app_dir(), decrypt(), derive_key(), encrypt(), KEY_FILE, load_or_create_dpapi_key(), META_FILE, VAULT_FILE (+4 more)

### Community 8 - "CodeMirror Languages"
Cohesion: 0.06
Nodes (35): dependencies, cm6-graphql, @codemirror/lang-cpp, @codemirror/lang-css, @codemirror/lang-go, @codemirror/lang-html, @codemirror/lang-java, @codemirror/lang-javascript (+27 more)

### Community 9 - "Release CI Pipeline"
Cohesion: 0.10
Nodes (31): Linux .AppImage / .deb, Windows .msi / .exe installer, publish-tauri, tauri-apps/tauri-action, ubuntu-24.04, v* tag trigger, windows-latest, JetBrains Mono (+23 more)

### Community 10 - "Embedded PTY Shell"
Cohesion: 0.10
Nodes (7): build_shell_command(), PtyManager, PtySession, resolve_shell(), shell_basename(), shell_login_name(), supports_login_flag()

### Community 11 - "Editor Lang Imports"
Cohesion: 0.10
Nodes (20): cm6-graphql, @codemirror/lang-cpp, @codemirror/lang-css, @codemirror/lang-go, @codemirror/lang-html, @codemirror/lang-java, @codemirror/lang-javascript, @codemirror/lang-json (+12 more)

### Community 12 - "Package Metadata"
Cohesion: 0.10
Nodes (19): description, license, name, private, type, version, @emotion/react, @emotion/styled (+11 more)

### Community 13 - "Context Menu React"
Cohesion: 0.14
Nodes (14): react, react-dom, @tauri-apps/plugin-clipboard-manager, ContextMenu(), ContextMenuItem, Props, Props, Props (+6 more)

### Community 14 - "Profile Form UI"
Cohesion: 0.20
Nodes (12): empty, ProfileForm(), Props, SHELL_PRESETS, Panel, Props, ProfileList(), Props (+4 more)

### Community 15 - "App Shell Layout"
Cohesion: 0.22
Nodes (11): App(), BrandLogo(), Props, PanelLayout(), Props, UnlockGate(), applyTheme(), readStoredTheme() (+3 more)

### Community 16 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 17 - "Tauri App Config"
Cohesion: 0.11
Nodes (17): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+9 more)

### Community 18 - "Profile Data Model"
Cohesion: 0.18
Nodes (7): AuthMethod, Key, Password, default_remote_shell(), Profile, ProfileInput, Snippet

### Community 19 - "SSH Command Builder"
Cohesion: 0.29
Nodes (11): build_remote_command(), build_ssh_args(), build_ssh_command_line(), embed_connect_command(), empty_shell_uses_server_default(), posix_quote(), post_connect_avoids_shell_var_and_quotes(), powershell_quote() (+3 more)

### Community 20 - "Frontend Tauri API"
Cohesion: 0.30
Nodes (7): @tauri-apps/api, profilesApi, snippetsApi, keysApi, ptyApi, sftpApi, vaultApi

### Community 21 - "Dialog Host Flows"
Cohesion: 0.21
Nodes (11): advance(), ConfirmReq, DialogHost(), finishConfirm(), finishPassword(), finishPrompt(), PasswordPromptReq, PasswordPromptResult (+3 more)

### Community 22 - "About Version Check"
Cohesion: 0.33
Nodes (8): Props, APP_VERSION, compareSemver(), GITHUB_LATEST_API, GITHUB_RELEASES_URL, GITHUB_REPO, normalizeVersion(), UpdateInfo

### Community 23 - "In-App Help System"
Cohesion: 0.27
Nodes (6): HelpModal(), Props, filterHelpSections(), HELP_SECTIONS, HelpBlock, HelpSection

### Community 24 - "Session Tabs Hook"
Cohesion: 0.28
Nodes (6): hostLabelFor(), Options, useAppSessions(), api, SessionStatus, SessionTab

### Community 25 - "Panel Layout State"
Cohesion: 0.32
Nodes (7): DEFAULTS, DragSide, LayoutState, loadLayout(), Props, saveLayout(), usePanelLayout()

### Community 26 - "TS Node Config"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 27 - "Frontend DevDeps"
Cohesion: 0.29
Nodes (7): devDependencies, @tauri-apps/cli, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react

### Community 28 - "Remote File Editor"
Cohesion: 0.33
Nodes (4): @codemirror/theme-one-dark, @uiw/react-codemirror, FileEditorMode, Props

### Community 29 - "Terminal Pane Xterm"
Cohesion: 0.47
Nodes (5): TerminalPane(), focusTerminal(), onMenuAction(), pasteClipboard(), toPtyText()

### Community 30 - "Tauri Capabilities"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 31 - "NPM Scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, tauri

### Community 32 - "Editor Language Map"
Cohesion: 0.60
Nodes (5): isAnsiblePath(), extOf(), fileName(), languageForPath(), stream()

## Ambiguous Edges - Review These
- `Terminal` → `JetBrains Mono`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to

## Knowledge Gaps
- **80 isolated node(s):** `@emotion/react`, `@emotion/styled`, `@tauri-apps/plugin-shell`, `@tauri-apps/cli`, `@types/react` (+75 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 292 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `CodeMirror Languages` to `Package Metadata`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 52 inferred relationships involving `SSHyar Brand Icon (terminal prompt + padlock on teal)` (e.g. with `SSHyar application icon asset: icon.png` and `SSHyar application icon asset: source.jpg`) actually correct?**
  _`SSHyar Brand Icon (terminal prompt + padlock on teal)` has 52 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@emotion/react`, `@emotion/styled`, `@tauri-apps/plugin-shell` to the rest of the system?**
  _80 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Material UI Icons` be split into smaller, more focused modules?**
  _Cohesion score 0.0676056338028169 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Context Menu React` to `Material UI Icons`, `Package Metadata`, `Profile Form UI`, `App Shell Layout`, `Dialog Host Flows`, `About Version Check`, `In-App Help System`, `Session Tabs Hook`, `Panel Layout State`, `Remote File Editor`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `Profile Sidebar UI` be split into smaller, more focused modules?**
  _Cohesion score 0.08469449485783424 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Terminal` and `JetBrains Mono`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._