# winget follow-up (after v1.0.0 is stable)

Submit a package to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) once the `v1.0.0` Windows MSI is published and checksums are known.

## Suggested identifiers

- PackageIdentifier: `mh314k.SSHyar` (or `SSHyar.SSHyar` if preferred)
- Publisher: match GitHub / LICENSE author field
- PackageUrl: `https://github.com/mh314k/sshyar`
- License: GPL-3.0-or-later
- InstallerType: `wix` (MSI) or `exe` if using the NSIS/setup artifact from Tauri

## Steps

1. Download the `v1.0.0` `.msi` from the GitHub Release.
2. Compute SHA256.
3. Create a manifest folder under `manifests/m/mh314k/SSHyar/1.0.0/` (letter path depends on identifier).
4. Open a PR to `winget-pkgs` with `defaultLocale` description matching the product README one-liner.
5. Optional listings: [AlternativeTo](https://alternativeto.net/), Softpedia — use the same pitch and screenshot set.

Do not submit until SmartScreen / download URL is stable (same asset URL as the Release).
