use tauri::{AppHandle, Emitter};

use super::types::TransferProgressEvent;

pub struct TransferProgressCtx {
    app: AppHandle,
    transfer_id: String,
    sftp_id: String,
    file_name: String,
    file_index: u32,
    file_count: u32,
    bytes_total: u64,
    overall_total: u64,
    overall_base: u64,
}

impl TransferProgressCtx {
    pub fn new(
        app: &AppHandle,
        transfer_id: &str,
        sftp_id: &str,
        file_name: String,
        file_index: u32,
        file_count: u32,
        bytes_total: u64,
        overall_total: u64,
        overall_base: u64,
    ) -> Self {
        Self {
            app: app.clone(),
            transfer_id: transfer_id.to_string(),
            sftp_id: sftp_id.to_string(),
            file_name,
            file_index,
            file_count,
            bytes_total,
            overall_total,
            overall_base,
        }
    }

    pub fn emit(&self, bytes_sent: u64) {
        let _ = self.app.emit(
            "sftp-transfer-progress",
            TransferProgressEvent {
                transfer_id: self.transfer_id.clone(),
                sftp_id: self.sftp_id.clone(),
                file_name: self.file_name.clone(),
                file_index: self.file_index,
                file_count: self.file_count,
                bytes_sent,
                bytes_total: self.bytes_total,
                overall_sent: self.overall_base + bytes_sent,
                overall_total: self.overall_total,
            },
        );
    }

    pub fn finish(&self) {
        self.emit(self.bytes_total);
    }
}
