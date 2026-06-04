/// Application error type.
///
/// Implements `serde::Serialize` so errors can cross the Tauri IPC boundary
/// and be caught as typed errors in TypeScript.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    #[allow(dead_code)]
    Generic(String),
}

/// The error must be Serialize to cross the Tauri IPC boundary.
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

/// Convenience alias for command return types.
pub type Result<T> = std::result::Result<T, AppError>;
