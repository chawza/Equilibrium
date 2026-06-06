pub mod catalog;
pub mod dictionaries;
pub mod strsim_backend;

use std::sync::Arc;

/// Swappable emoji suggestion backend.
/// All implementations reduce to: label → emoji glyph.
///
/// To add a new backend (e.g. MLX local inference):
///   1. Create `src-tauri/src/emoji/mlx_backend.rs` implementing this trait.
///   2. Change the `Arc::new(StrsimSuggester::new())` line in `lib.rs` setup.
///   Frontend and IPC command remain unchanged.
pub trait EmojiSuggester: Send + Sync {
    /// Returns the best-matching emoji for a record label.
    /// Falls back to "📝" if no confident match.
    fn suggest(&self, label: &str) -> String;

    /// Backend identifier for logging/debugging.
    #[allow(dead_code)]
    fn backend_name(&self) -> &'static str;
}

/// Type-erased, reference-counted suggester — managed as Tauri app state.
pub type DynEmojiSuggester = Arc<dyn EmojiSuggester>;
