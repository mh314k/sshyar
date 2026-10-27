use crate::state::AppState;

/// Tear down all remote/local sessions before locking the vault.
pub async fn session_shutdown(state: &AppState) {
    state.docker_logs.stop_all().await;
    state.remote_exec.close_all().await;
    state.sftp.close_all().await;
    state.pty.kill_all();
}
