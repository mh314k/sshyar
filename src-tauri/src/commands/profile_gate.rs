use tauri::State;

use crate::error::{AppError, AppResult};
use crate::profiles::Profile;
use crate::state::{find_profile, AppState};

/// Load a profile clone when the matching session-plugin flag is enabled.
pub fn load_flagged_profile(
    state: &State<'_, AppState>,
    profile_id: &str,
    enabled: impl Fn(&Profile) -> bool,
    label: &str,
) -> AppResult<Profile> {
    let v = state.vault.lock();
    let profile = find_profile(&v, profile_id)?.clone();
    if !enabled(&profile) {
        return Err(AppError::msg(format!(
            "{label} management is not enabled for this profile"
        )));
    }
    Ok(profile)
}
