use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

use crate::error::{AppError, AppResult};
use crate::profiles::{AuthMethod, Profile};
use crate::ssh_session;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyPairPaths {
    pub private_key_path: String,
    pub public_key_path: String,
}

pub fn generate_key(
    keys_dir: &PathBuf,
    profile_id: &str,
    passphrase: &str,
) -> AppResult<KeyPairPaths> {
    fs::create_dir_all(keys_dir)?;
    let private = keys_dir.join(format!("{profile_id}_id_ed25519"));
    let public = keys_dir.join(format!("{profile_id}_id_ed25519.pub"));

    if private.exists() {
        let _ = fs::remove_file(&private);
    }
    if public.exists() {
        let _ = fs::remove_file(&public);
    }

    let ssh_keygen = which::which("ssh-keygen")
        .map_err(|_| AppError::msg("ssh-keygen not found. Install OpenSSH Client."))?;

    let status = Command::new(ssh_keygen)
        .args([
            "-t",
            "ed25519",
            "-f",
            private.to_str().unwrap(),
            "-N",
            passphrase,
            "-C",
            &format!("sshyar-{profile_id}"),
        ])
        .status()
        .map_err(|e| AppError::msg(format!("ssh-keygen failed: {e}")))?;

    if !status.success() {
        return Err(AppError::msg("ssh-keygen exited with error"));
    }

    Ok(KeyPairPaths {
        private_key_path: private.to_string_lossy().to_string(),
        public_key_path: public.to_string_lossy().to_string(),
    })
}

pub async fn install_public_key(profile: &Profile, public_key_path: &str) -> AppResult<()> {
    let pub_key = fs::read_to_string(public_key_path)
        .map_err(|e| AppError::msg(format!("Read public key: {e}")))?;
    let pub_key = pub_key.trim();
    if pub_key.is_empty() {
        return Err(AppError::msg("Public key is empty"));
    }
    ssh_session::install_authorized_key(profile, pub_key).await
}

pub fn apply_generated_key_to_profile(profile: &mut Profile, paths: &KeyPairPaths) {
    profile.private_key_path = Some(paths.private_key_path.clone());
    profile.auth_method = AuthMethod::Key;
}
