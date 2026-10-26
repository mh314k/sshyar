use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2, PasswordHash, PasswordVerifier,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use zeroize::Zeroize;

use crate::error::{AppError, AppResult};
use crate::profiles::{Profile, Snippet};

const VAULT_FILE: &str = "vault.dat";
const META_FILE: &str = "vault.meta.json";
const KEY_FILE: &str = "vault.key.dpapi";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VaultData {
    pub profiles: Vec<Profile>,
    pub snippets: Vec<Snippet>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct VaultMeta {
    mode: String,
    password_hash: Option<String>,
    kdf_salt: Option<String>,
    /// Public counts so the lock screen can show them without decrypting.
    #[serde(default)]
    profile_count: usize,
    #[serde(default)]
    snippet_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStatus {
    pub unlocked: bool,
    pub has_master_password: bool,
    pub profile_count: usize,
    pub snippet_count: usize,
}

pub struct VaultState {
    dir: PathBuf,
    key: Option<[u8; 32]>,
    data: VaultData,
    meta: VaultMeta,
    unlocked: bool,
}

impl VaultState {
    pub fn new() -> AppResult<Self> {
        let dir = app_dir()?;
        fs::create_dir_all(&dir)?;
        fs::create_dir_all(dir.join("keys"))?;

        let meta_path = dir.join(META_FILE);
        let meta = if meta_path.exists() {
            serde_json::from_str(&fs::read_to_string(&meta_path)?)?
        } else {
            let m = VaultMeta {
                mode: "dpapi".into(),
                password_hash: None,
                kdf_salt: None,
                profile_count: 0,
                snippet_count: 0,
            };
            fs::write(&meta_path, serde_json::to_string_pretty(&m)?)?;
            m
        };

        let mut state = Self {
            dir,
            key: None,
            data: VaultData::default(),
            meta,
            unlocked: false,
        };

        if state.meta.mode == "dpapi" {
            state.unlock_dpapi()?;
        }

        Ok(state)
    }

    pub fn status(&self) -> VaultStatus {
        // When locked, in-memory data is cleared — use meta counts written on last save.
        let (profile_count, snippet_count) = if self.unlocked {
            (self.data.profiles.len(), self.data.snippets.len())
        } else {
            (self.meta.profile_count, self.meta.snippet_count)
        };
        VaultStatus {
            unlocked: self.unlocked,
            has_master_password: self.meta.mode == "password",
            profile_count,
            snippet_count,
        }
    }

    pub fn data(&self) -> AppResult<&VaultData> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        Ok(&self.data)
    }

    pub fn data_mut(&mut self) -> AppResult<&mut VaultData> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        Ok(&mut self.data)
    }

    pub fn save(&mut self) -> AppResult<()> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        let key = self.key.ok_or_else(|| AppError::msg("Missing vault key"))?;
        self.meta.profile_count = self.data.profiles.len();
        self.meta.snippet_count = self.data.snippets.len();
        let plaintext = serde_json::to_vec(&self.data)?;
        let encrypted = encrypt(&key, &plaintext)?;
        fs::write(self.dir.join(VAULT_FILE), encrypted)?;
        fs::write(
            self.dir.join(META_FILE),
            serde_json::to_string_pretty(&self.meta)?,
        )?;
        Ok(())
    }

    fn unlock_with_key(&mut self, key: [u8; 32]) -> AppResult<()> {
        let path = self.dir.join(VAULT_FILE);
        if path.exists() {
            let blob = fs::read(&path)?;
            let plain = decrypt(&key, &blob)?;
            self.data = serde_json::from_slice(&plain).unwrap_or_default();
        } else {
            self.data = VaultData::default();
        }
        self.key = Some(key);
        self.unlocked = true;
        self.save()?;
        Ok(())
    }

    fn unlock_dpapi(&mut self) -> AppResult<()> {
        let key = load_or_create_dpapi_key(&self.dir)?;
        self.unlock_with_key(key)
    }

    pub fn unlock_password(&mut self, password: &str) -> AppResult<()> {
        if self.meta.mode != "password" {
            return Err(AppError::msg("Vault is not password-protected"));
        }
        self.verify_password(password)?;

        let salt_b64 = self
            .meta
            .kdf_salt
            .as_ref()
            .ok_or_else(|| AppError::msg("Missing KDF salt"))?;
        let salt = B64
            .decode(salt_b64)
            .map_err(|e| AppError::msg(e.to_string()))?;
        let key = derive_key(password, &salt)?;
        self.unlock_with_key(key)
    }

    pub fn set_master_password(&mut self, password: &str) -> AppResult<()> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        self.apply_master_password(password)
    }

    pub fn change_master_password(&mut self, current: &str, new_password: &str) -> AppResult<()> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        if self.meta.mode != "password" {
            return Err(AppError::msg("Vault is not password-protected"));
        }
        self.verify_password(current)?;
        self.apply_master_password(new_password)
    }

    fn apply_master_password(&mut self, password: &str) -> AppResult<()> {
        if password.is_empty() {
            return Err(AppError::msg("Master password cannot be empty"));
        }

        let mut salt = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut salt);
        let salt_string =
            SaltString::encode_b64(&salt).map_err(|e| AppError::msg(e.to_string()))?;
        let password_hash = Argon2::default()
            .hash_password(password.as_bytes(), &salt_string)
            .map_err(|e| AppError::msg(e.to_string()))?
            .to_string();

        let new_key = derive_key(password, &salt)?;
        self.key = Some(new_key);
        self.meta.mode = "password".into();
        self.meta.password_hash = Some(password_hash);
        self.meta.kdf_salt = Some(B64.encode(salt));
        self.save()?;
        let _ = fs::remove_file(self.dir.join(KEY_FILE));
        Ok(())
    }

    pub fn remove_master_password(&mut self, password: &str) -> AppResult<()> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        if self.meta.mode != "password" {
            return Err(AppError::msg("Vault is not password-protected"));
        }
        self.verify_password(password)?;
        let key = load_or_create_dpapi_key(&self.dir)?;
        self.key = Some(key);
        self.meta.mode = "dpapi".into();
        self.meta.password_hash = None;
        self.meta.kdf_salt = None;
        self.save()?;
        Ok(())
    }

    fn verify_password(&self, password: &str) -> AppResult<()> {
        let hash = self
            .meta
            .password_hash
            .as_ref()
            .ok_or_else(|| AppError::msg("Missing password hash"))?;
        let parsed = PasswordHash::new(hash)
            .map_err(|e| AppError::msg(format!("Invalid password hash: {e}")))?;
        Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .map_err(|_| AppError::msg("Incorrect master password"))?;
        Ok(())
    }

    pub fn lock(&mut self) {
        // Keep meta counts for the lock screen before wiping plaintext.
        self.meta.profile_count = self.data.profiles.len();
        self.meta.snippet_count = self.data.snippets.len();
        if let Ok(json) = serde_json::to_string_pretty(&self.meta) {
            let _ = fs::write(self.dir.join(META_FILE), json);
        }
        if let Some(mut k) = self.key.take() {
            k.zeroize();
        }
        self.data = VaultData::default();
        self.unlocked = false;
    }

    pub fn keys_dir(&self) -> PathBuf {
        self.dir.join("keys")
    }

    /// Portable encrypted backup (password-based; independent of DPAPI / machine key).
    pub fn export_backup(&self, password: &str) -> AppResult<Vec<u8>> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        if password.is_empty() {
            return Err(AppError::msg("Backup password cannot be empty"));
        }
        let mut salt = [0u8; 16];
        rand::thread_rng().fill_bytes(&mut salt);
        let key = derive_key(password, &salt)?;
        let plaintext = serde_json::to_vec(&self.data)?;
        let ciphertext = encrypt(&key, &plaintext)?;
        let envelope = VaultBackupEnvelope {
            format: BACKUP_FORMAT.into(),
            version: BACKUP_VERSION,
            created_at: chrono::Utc::now().to_rfc3339(),
            profile_count: self.data.profiles.len(),
            snippet_count: self.data.snippets.len(),
            kdf_salt: B64.encode(salt),
            ciphertext: B64.encode(ciphertext),
        };
        Ok(serde_json::to_vec_pretty(&envelope)?)
    }

    /// Import a portable backup. `replace` swaps vault contents; otherwise merges by id
    /// (incoming wins on id collision). Returns (profiles_added_or_updated, snippets_…).
    pub fn import_backup(
        &mut self,
        password: &str,
        blob: &[u8],
        replace: bool,
    ) -> AppResult<(usize, usize)> {
        if !self.unlocked {
            return Err(AppError::msg("Vault is locked"));
        }
        if password.is_empty() {
            return Err(AppError::msg("Backup password cannot be empty"));
        }
        let envelope: VaultBackupEnvelope = serde_json::from_slice(blob)
            .map_err(|_| AppError::msg("Invalid backup file (not a SSHyar vault backup)"))?;
        if envelope.format != BACKUP_FORMAT {
            return Err(AppError::msg(format!(
                "Unsupported backup format: {}",
                envelope.format
            )));
        }
        if envelope.version != BACKUP_VERSION {
            return Err(AppError::msg(format!(
                "Unsupported backup version: {}",
                envelope.version
            )));
        }
        let salt = B64
            .decode(envelope.kdf_salt.trim())
            .map_err(|_| AppError::msg("Corrupt backup (salt)"))?;
        let ciphertext = B64
            .decode(envelope.ciphertext.trim())
            .map_err(|_| AppError::msg("Corrupt backup (ciphertext)"))?;
        let key = derive_key(password, &salt)?;
        let plain = decrypt(&key, &ciphertext)?;
        let incoming: VaultData = serde_json::from_slice(&plain)
            .map_err(|_| AppError::msg("Corrupt backup (payload)"))?;

        let mut profiles_touched = 0usize;
        let mut snippets_touched = 0usize;

        if replace {
            profiles_touched = incoming.profiles.len();
            snippets_touched = incoming.snippets.len();
            self.data = incoming;
        } else {
            for p in incoming.profiles {
                if let Some(existing) = self.data.profiles.iter_mut().find(|x| x.id == p.id) {
                    *existing = p;
                } else {
                    self.data.profiles.push(p);
                }
                profiles_touched += 1;
            }
            for s in incoming.snippets {
                if let Some(existing) = self.data.snippets.iter_mut().find(|x| x.id == s.id) {
                    *existing = s;
                } else {
                    self.data.snippets.push(s);
                }
                snippets_touched += 1;
            }
        }
        self.save()?;
        Ok((profiles_touched, snippets_touched))
    }
}

const BACKUP_FORMAT: &str = "sshyar-vault-backup";
const BACKUP_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VaultBackupEnvelope {
    format: String,
    version: u32,
    created_at: String,
    #[serde(default)]
    profile_count: usize,
    #[serde(default)]
    snippet_count: usize,
    kdf_salt: String,
    ciphertext: String,
}

pub fn app_dir() -> AppResult<PathBuf> {
    let base = dirs::data_dir().ok_or_else(|| AppError::msg("Cannot resolve app data dir"))?;
    Ok(base.join("sshyar"))
}

fn derive_key(password: &str, salt: &[u8]) -> AppResult<[u8; 32]> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| AppError::msg(e.to_string()))?;
    Ok(key)
}

fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> AppResult<Vec<u8>> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let mut out = nonce_bytes.to_vec();
    let ct = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| AppError::msg(format!("Encrypt failed: {e}")))?;
    out.extend(ct);
    Ok(out)
}

fn decrypt(key: &[u8; 32], blob: &[u8]) -> AppResult<Vec<u8>> {
    if blob.len() < 13 {
        return Err(AppError::msg("Corrupt vault"));
    }
    let (nonce_bytes, ct) = blob.split_at(12);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ct)
        .map_err(|_| AppError::msg("Decrypt failed — wrong password or corrupt vault"))
}

#[cfg(windows)]
fn load_or_create_dpapi_key(dir: &Path) -> AppResult<[u8; 32]> {
    use windows::Win32::Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
    };

    let path = dir.join(KEY_FILE);
    if path.exists() {
        let mut protected = fs::read(&path)?;
        let mut in_blob = CRYPT_INTEGER_BLOB {
            cbData: protected.len() as u32,
            pbData: protected.as_mut_ptr(),
        };
        let mut out_blob = CRYPT_INTEGER_BLOB::default();
        unsafe {
            CryptUnprotectData(
                &mut in_blob,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut out_blob,
            )
            .map_err(|e| AppError::msg(format!("DPAPI unprotect failed: {e}")))?;

            let slice = std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize);
            if slice.len() != 32 {
                let _ = windows::Win32::Foundation::LocalFree(
                    windows::Win32::Foundation::HLOCAL(out_blob.pbData as _),
                );
                return Err(AppError::msg("Invalid DPAPI key length"));
            }
            let mut key = [0u8; 32];
            key.copy_from_slice(slice);
            let _ = windows::Win32::Foundation::LocalFree(windows::Win32::Foundation::HLOCAL(
                out_blob.pbData as _,
            ));
            return Ok(key);
        }
    }

    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    let mut key_copy = key;
    let mut in_blob = CRYPT_INTEGER_BLOB {
        cbData: 32,
        pbData: key_copy.as_mut_ptr(),
    };
    let mut out_blob = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptProtectData(
            &mut in_blob,
            windows::core::w!("sshyar-vault-key"),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut out_blob,
        )
        .map_err(|e| AppError::msg(format!("DPAPI protect failed: {e}")))?;
        let slice = std::slice::from_raw_parts(out_blob.pbData, out_blob.cbData as usize);
        fs::write(&path, slice)?;
        let _ = windows::Win32::Foundation::LocalFree(windows::Win32::Foundation::HLOCAL(
            out_blob.pbData as _,
        ));
    }
    Ok(key)
}

#[cfg(not(windows))]
fn load_or_create_dpapi_key(dir: &Path) -> AppResult<[u8; 32]> {
    use std::fs::OpenOptions;
    use std::io::Write;
    #[cfg(unix)]
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

    let path = dir.join("vault.key.raw");
    if path.exists() {
        #[cfg(unix)]
        {
            let _ = fs::set_permissions(&path, fs::Permissions::from_mode(0o600));
        }
        let bytes = fs::read(&path)?;
        if bytes.len() != 32 {
            return Err(AppError::msg("Invalid key file"));
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&bytes);
        return Ok(key);
    }
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);

    let mut opts = OpenOptions::new();
    opts.write(true).create_new(true);
    #[cfg(unix)]
    {
        opts.mode(0o600);
    }
    let mut file = opts
        .open(&path)
        .map_err(|e| AppError::msg(format!("Create vault key: {e}")))?;
    file.write_all(&key)
        .map_err(|e| AppError::msg(format!("Write vault key: {e}")))?;
    Ok(key)
}
