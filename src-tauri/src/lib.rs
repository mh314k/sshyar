mod commands;
mod error;
mod host_key;
mod keys;
mod profiles;
mod pty;
mod sftp;
mod ssh_cmd;
mod ssh_session;
mod state;
mod vault;

use commands::*;
use state::AppState;
use vault::VaultState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let vault = VaultState::new().expect("Failed to init vault");
    let state = AppState::new(vault);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            vault_status,
            vault_unlock,
            vault_lock,
            vault_set_master_password,
            vault_change_master_password,
            vault_remove_master_password,
            list_profiles,
            upsert_profile,
            delete_profile,
            duplicate_profile,
            get_ssh_command,
            list_snippets,
            upsert_snippet,
            delete_snippet,
            pty_create,
            pty_write,
            pty_resize,
            pty_kill,
            pty_inject,
            open_external_ssh,
            generate_profile_key,
            install_profile_key,
            probe_host_key,
            accept_host_key,
            sftp_open,
            sftp_close,
            sftp_list,
            sftp_cwd,
            sftp_mkdir,
            sftp_rename,
            sftp_remove,
            sftp_remove_batch,
            sftp_upload,
            sftp_upload_batch,
            sftp_download,
            sftp_copy_remote,
            sftp_copy_batch,
            sftp_move_batch,
            sftp_read_text,
            sftp_write_text,
            docker_probe,
            docker_list_containers,
            docker_container_action,
            docker_list_images,
            docker_image_remove,
            docker_list_volumes,
            docker_volume_remove,
            docker_list_networks,
            docker_network_remove,
            docker_compose_run,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
