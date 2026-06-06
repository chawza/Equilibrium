use tauri::State;
use crate::emoji::DynEmojiSuggester;

/// Returns the best-matching emoji for a record label.
/// Falls back to "📝" if no confident match.
/// The backend is swappable — see `src-tauri/src/emoji/mod.rs`.
#[tauri::command]
#[specta::specta]
pub fn auto_suggest_emoji(
    label: String,
    suggester: State<'_, DynEmojiSuggester>,
) -> String {
    suggester.suggest(&label)
}
