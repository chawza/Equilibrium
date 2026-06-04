/// Ping command — proves the tauri-specta IPC pipeline end-to-end.
///
/// Call from the frontend via:
///   import { commands } from '$lib/ipc';
///   const pong = await commands.ping(); // → "pong"
#[tauri::command]
#[specta::specta]
pub async fn ping() -> String {
    "pong".to_string()
}
