use parking_lot::Mutex;
use std::sync::Arc;

use crate::docker_logs::{DockerLogManager, SharedDockerLogs};
use crate::docker_session::{DockerSessionManager, SharedDockerSessions};
use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::pty::{PtyManager, SharedPty};
use crate::sftp::{SftpManager, SharedSftp};
use crate::vault::VaultState;

pub struct AppState {
    pub vault: Mutex<VaultState>,
    pub pty: SharedPty,
    pub sftp: SharedSftp,
    pub docker_logs: SharedDockerLogs,
    pub docker_sessions: SharedDockerSessions,
}

impl AppState {
    pub fn new(vault: VaultState) -> Self {
        Self {
            vault: Mutex::new(vault),
            pty: Arc::new(PtyManager::new()),
            sftp: Arc::new(SftpManager::new()),
            docker_logs: Arc::new(DockerLogManager::new()),
            docker_sessions: Arc::new(DockerSessionManager::new()),
        }
    }
}

pub fn find_profile_mut<'a>(
    vault: &'a mut VaultState,
    id: &str,
) -> AppResult<&'a mut Profile> {
    vault
        .data_mut()?
        .profiles
        .iter_mut()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::msg("Profile not found"))
}

pub fn find_profile<'a>(vault: &'a VaultState, id: &str) -> AppResult<&'a Profile> {
    vault
        .data()?
        .profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::msg("Profile not found"))
}
