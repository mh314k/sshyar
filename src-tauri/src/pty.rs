use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::error::{AppError, AppResult};

pub struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

pub struct PtyManager {
    sessions: Mutex<HashMap<String, PtySession>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn create(
        &self,
        app: AppHandle,
        cols: u16,
        rows: u16,
        initial_command: Option<String>,
    ) -> AppResult<String> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::msg(format!("openpty failed: {e}")))?;

        let shell = resolve_shell();
        let mut cmd = CommandBuilder::new(&shell);
        cmd.arg("-NoLogo");
        cmd.arg("-NoExit");
        // Run SSH as the shell startup command — more reliable than typing into PSReadLine.
        if let Some(ref ssh_cmd) = initial_command {
            cmd.arg("-Command");
            cmd.arg(ssh_cmd);
        }

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| AppError::msg(format!("spawn shell failed: {e}")))?;
        // Drop slave so child owns the console end
        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| AppError::msg(format!("clone reader: {e}")))?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AppError::msg(format!("take writer: {e}")))?;

        let id = Uuid::new_v4().to_string();
        let event_name = format!("pty-output-{id}");
        let exit_event = format!("pty-exit-{id}");

        let app_clone = app.clone();
        let id_clone = id.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_clone.emit(&event_name, data);
                    }
                    Err(_) => break,
                }
            }
            let _ = app_clone.emit(&exit_event, id_clone);
        });

        let session = PtySession {
            master: pair.master,
            writer,
            child,
        };

        self.sessions.lock().insert(id.clone(), session);
        Ok(id)
    }

    pub fn write(&self, id: &str, data: &str) -> AppResult<()> {
        let mut sessions = self.sessions.lock();
        let session = sessions
            .get_mut(id)
            .ok_or_else(|| AppError::msg("Session not found"))?;
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| AppError::msg(e.to_string()))?;
        session
            .writer
            .flush()
            .map_err(|e| AppError::msg(e.to_string()))?;
        Ok(())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> AppResult<()> {
        let sessions = self.sessions.lock();
        let session = sessions
            .get(id)
            .ok_or_else(|| AppError::msg("Session not found"))?;
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::msg(format!("resize: {e}")))?;
        Ok(())
    }

    pub fn kill(&self, id: &str) -> AppResult<()> {
        let mut sessions = self.sessions.lock();
        if let Some(mut session) = sessions.remove(id) {
            let _ = session.child.kill();
            let _ = session.child.wait();
        }
        Ok(())
    }
}

fn resolve_shell() -> String {
    if let Ok(p) = which::which("pwsh") {
        return p.to_string_lossy().to_string();
    }
    if let Ok(p) = which::which("powershell") {
        return p.to_string_lossy().to_string();
    }
    // Fallback typical Windows path
    r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe".into()
}

pub type SharedPty = Arc<PtyManager>;
