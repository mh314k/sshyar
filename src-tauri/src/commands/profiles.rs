use tauri::State;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::profiles::{Profile, ProfileInput, Snippet};
use crate::ssh_cmd;
use crate::state::{find_profile, AppState};

#[tauri::command]
pub fn list_profiles(state: State<AppState>) -> AppResult<Vec<Profile>> {
    Ok(state.vault.lock().data()?.profiles.clone())
}

#[tauri::command]
pub fn upsert_profile(
    state: State<AppState>,
    id: Option<String>,
    input: ProfileInput,
) -> AppResult<Profile> {
    let mut v = state.vault.lock();
    let data = v.data_mut()?;
    let profile = if let Some(id) = id {
        let p = data
            .profiles
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::msg("Profile not found"))?;
        p.apply_input(input);
        p.clone()
    } else {
        let p = Profile::from_input(input);
        data.profiles.push(p.clone());
        p
    };
    v.save()?;
    Ok(profile)
}

#[tauri::command]
pub fn delete_profile(state: State<AppState>, id: String) -> AppResult<()> {
    let mut v = state.vault.lock();
    v.data_mut()?.profiles.retain(|p| p.id != id);
    v.save()
}

#[tauri::command]
pub fn duplicate_profile(state: State<AppState>, id: String) -> AppResult<Profile> {
    let mut v = state.vault.lock();
    let data = v.data_mut()?;
    let src = data
        .profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| AppError::msg("Profile not found"))?
        .clone();
    let mut copy = src;
    copy.id = Uuid::new_v4().to_string();
    copy.name = format!("{} (copy)", copy.name);
    data.profiles.push(copy.clone());
    v.save()?;
    Ok(copy)
}

#[tauri::command]
pub fn get_ssh_command(state: State<AppState>, id: String) -> AppResult<String> {
    let v = state.vault.lock();
    let p = find_profile(&v, &id)?;
    Ok(ssh_cmd::build_ssh_command_line(p))
}

#[tauri::command]
pub fn list_snippets(state: State<AppState>) -> AppResult<Vec<Snippet>> {
    Ok(state.vault.lock().data()?.snippets.clone())
}

#[tauri::command]
pub fn upsert_snippet(
    state: State<AppState>,
    id: Option<String>,
    name: String,
    command: String,
) -> AppResult<Snippet> {
    let mut v = state.vault.lock();
    let data = v.data_mut()?;
    let snip = if let Some(id) = id {
        let s = data
            .snippets
            .iter_mut()
            .find(|s| s.id == id)
            .ok_or_else(|| AppError::msg("Snippet not found"))?;
        s.name = name;
        s.command = command;
        s.clone()
    } else {
        let s = Snippet::new(name, command);
        data.snippets.push(s.clone());
        s
    };
    v.save()?;
    Ok(snip)
}

#[tauri::command]
pub fn delete_snippet(state: State<AppState>, id: String) -> AppResult<()> {
    let mut v = state.vault.lock();
    v.data_mut()?.snippets.retain(|s| s.id != id);
    v.save()
}
