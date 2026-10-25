use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::error::{AppError, AppResult};
use crate::vault::app_dir;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct KnownHosts {
    /// key: "host:port" -> SHA256 hex fingerprint
    pub entries: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HostKeyInfo {
    pub host: String,
    pub port: u16,
    pub fingerprint: String,
    pub known: bool,
    pub mismatched: bool,
}

fn known_hosts_path() -> AppResult<PathBuf> {
    Ok(app_dir()?.join("known_hosts.json"))
}

pub fn load_known_hosts() -> AppResult<KnownHosts> {
    let path = known_hosts_path()?;
    if !path.exists() {
        return Ok(KnownHosts::default());
    }
    let s = fs::read_to_string(path)?;
    Ok(serde_json::from_str(&s).unwrap_or_default())
}

pub fn save_known_hosts(kh: &KnownHosts) -> AppResult<()> {
    let path = known_hosts_path()?;
    fs::write(path, serde_json::to_string_pretty(kh)?)?;
    Ok(())
}

pub fn host_port_key(host: &str, port: u16) -> String {
    format!("{host}:{port}")
}

pub fn fingerprint_sha256(key_blob: &[u8]) -> String {
    let hash = Sha256::digest(key_blob);
    format!("SHA256:{}", hex::encode(hash))
}

/// Accept-new on first see; error on mismatch.
pub fn check_fingerprint(host: &str, port: u16, fingerprint: &str) -> AppResult<()> {
    let mut kh = load_known_hosts()?;
    let key = host_port_key(host, port);
    match kh.entries.get(&key) {
        None => {
            kh.entries.insert(key, fingerprint.to_string());
            save_known_hosts(&kh)?;
            Ok(())
        }
        Some(existing) if existing == fingerprint => Ok(()),
        Some(_) => Err(AppError::msg(format!(
            "Host key mismatch for {host}:{port}. Got {fingerprint}"
        ))),
    }
}

pub fn accept_host_key(host: &str, port: u16, fingerprint: &str) -> AppResult<()> {
    let mut kh = load_known_hosts()?;
    kh.entries
        .insert(host_port_key(host, port), fingerprint.to_string());
    save_known_hosts(&kh)
}

pub fn probe_status(host: &str, port: u16, fingerprint: &str) -> HostKeyInfo {
    let kh = load_known_hosts().unwrap_or_default();
    let key = host_port_key(host, port);
    let (known, mismatched) = match kh.entries.get(&key) {
        Some(existing) if existing == fingerprint => (true, false),
        Some(_) => (true, true),
        None => (false, false),
    };
    HostKeyInfo {
        host: host.to_string(),
        port,
        fingerprint: fingerprint.to_string(),
        known,
        mismatched,
    }
}
