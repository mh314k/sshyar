use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use futures_util::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::error::{AppError, AppResult};

static DOWNLOAD_BUSY: AtomicBool = AtomicBool::new(false);

const ALLOWED_HOST_PREFIXES: &[&str] = &[
    "https://github.com/mh314k/sshyar/releases/",
    "https://objects.githubusercontent.com/",
    "https://release-assets.githubusercontent.com/",
];

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgressEvent {
    pub version: String,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub phase: String,
    pub path: Option<String>,
    pub message: Option<String>,
}

fn assert_allowed_url(url: &str) -> AppResult<()> {
    let ok = ALLOWED_HOST_PREFIXES
        .iter()
        .any(|p| url.starts_with(p));
    if !ok {
        return Err(AppError::msg(
            "Update download URL must be a GitHub release asset for this app",
        ));
    }
    Ok(())
}

fn file_name_from_url(url: &str) -> String {
    let clean = url.split('?').next().unwrap_or(url);
    clean
        .rsplit('/')
        .next()
        .filter(|s| !s.is_empty())
        .unwrap_or("sshyar-update.bin")
        .to_string()
}

fn updates_dir(version: &str) -> AppResult<PathBuf> {
    let base = dirs::cache_dir()
        .ok_or_else(|| AppError::msg("No cache directory"))?
        .join("sshyar")
        .join("updates")
        .join(version.trim_start_matches('v'));
    fs::create_dir_all(&base)?;
    Ok(base)
}

fn emit_progress(app: &AppHandle, ev: UpdateProgressEvent) {
    let _ = app.emit("app-update-progress", ev);
}

#[tauri::command]
pub async fn app_update_cached_path(version: String, url: String) -> AppResult<Option<String>> {
    assert_allowed_url(&url)?;
    let name = file_name_from_url(&url);
    let path = updates_dir(&version)?.join(&name);
    if path.is_file() {
        let meta = fs::metadata(&path)?;
        if meta.len() > 0 {
            return Ok(Some(path.to_string_lossy().into_owned()));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn app_update_download(
    app: AppHandle,
    version: String,
    url: String,
) -> AppResult<String> {
    assert_allowed_url(&url)?;
    if DOWNLOAD_BUSY.swap(true, Ordering::SeqCst) {
        return Err(AppError::msg("An update download is already in progress"));
    }

    let result = download_inner(&app, &version, &url).await;
    DOWNLOAD_BUSY.store(false, Ordering::SeqCst);

    match result {
        Ok(path) => {
            emit_progress(
                &app,
                UpdateProgressEvent {
                    version: version.clone(),
                    downloaded: 0,
                    total: None,
                    phase: "done".into(),
                    path: Some(path.clone()),
                    message: None,
                },
            );
            Ok(path)
        }
        Err(e) => {
            emit_progress(
                &app,
                UpdateProgressEvent {
                    version,
                    downloaded: 0,
                    total: None,
                    phase: "error".into(),
                    path: None,
                    message: Some(e.to_string()),
                },
            );
            Err(e)
        }
    }
}

async fn download_inner(app: &AppHandle, version: &str, url: &str) -> AppResult<String> {
    let name = file_name_from_url(url);
    let dest_dir = updates_dir(version)?;
    let dest = dest_dir.join(&name);
    let partial = dest_dir.join(format!("{name}.partial"));

    if dest.is_file() {
        if let Ok(meta) = fs::metadata(&dest) {
            if meta.len() > 0 {
                return Ok(dest.to_string_lossy().into_owned());
            }
        }
    }

    let _ = fs::remove_file(&partial);

    let client = reqwest::Client::builder()
        .user_agent(format!("SSHyar/{}", env!("CARGO_PKG_VERSION")))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| AppError::msg(format!("HTTP client: {e}")))?;

    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| AppError::msg(format!("Download request failed: {e}")))?;

    if !res.status().is_success() {
        return Err(AppError::msg(format!(
            "Download failed: HTTP {}",
            res.status()
        )));
    }

    let total = res.content_length();
    let mut stream = res.bytes_stream();
    let mut file = File::create(&partial)?;
    let mut downloaded: u64 = 0;
    let mut last_emit = 0u64;

    emit_progress(
        app,
        UpdateProgressEvent {
            version: version.to_string(),
            downloaded: 0,
            total,
            phase: "downloading".into(),
            path: None,
            message: None,
        },
    );

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::msg(format!("Download stream error: {e}")))?;
        file.write_all(&chunk)?;
        downloaded += chunk.len() as u64;

        // Throttle UI events (~every 256 KiB or on completion).
        if downloaded.saturating_sub(last_emit) >= 256 * 1024 || total == Some(downloaded) {
            last_emit = downloaded;
            emit_progress(
                app,
                UpdateProgressEvent {
                    version: version.to_string(),
                    downloaded,
                    total,
                    phase: "downloading".into(),
                    path: None,
                    message: None,
                },
            );
        }
    }

    file.flush()?;
    drop(file);

    if let Some(expected) = total {
        if downloaded != expected {
            let _ = fs::remove_file(&partial);
            return Err(AppError::msg(format!(
                "Download incomplete ({downloaded} of {expected} bytes)"
            )));
        }
    }
    if downloaded == 0 {
        let _ = fs::remove_file(&partial);
        return Err(AppError::msg("Download produced an empty file"));
    }

    let _ = fs::remove_file(&dest);
    fs::rename(&partial, &dest)?;
    Ok(dest.to_string_lossy().into_owned())
}

fn launch_installer(path: &Path) -> AppResult<()> {
    if !path.is_file() {
        return Err(AppError::msg("Installer file not found"));
    }

    #[cfg(windows)]
    {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if ext == "msi" {
            Command::new("msiexec")
                .arg("/i")
                .arg(path)
                .spawn()
                .map_err(|e| AppError::msg(format!("Failed to start MSI installer: {e}")))?;
        } else {
            Command::new(path)
                .spawn()
                .map_err(|e| AppError::msg(format!("Failed to start installer: {e}")))?;
        }
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if ext == "appimage" || path.to_string_lossy().contains(".AppImage") {
            let meta = fs::metadata(path)?;
            let mut perms = meta.permissions();
            perms.set_mode(perms.mode() | 0o111);
            fs::set_permissions(path, perms)?;
            Command::new(path)
                .spawn()
                .map_err(|e| AppError::msg(format!("Failed to start AppImage: {e}")))?;
            return Ok(());
        }
        // deb/rpm — hand off to the desktop opener
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| AppError::msg(format!("Failed to open installer: {e}")))?;
        return Ok(());
    }

    #[cfg(not(any(windows, target_os = "linux")))]
    {
        let _ = path;
        Err(AppError::msg("In-app install is only supported on Windows and Linux"))
    }
}

/// Launch the downloaded installer, then quit so the package can replace files.
#[tauri::command]
pub async fn app_update_install(app: AppHandle, path: String) -> AppResult<()> {
    let p = PathBuf::from(&path);
    launch_installer(&p)?;
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(900)).await;
        app.exit(0);
    });
    Ok(())
}
