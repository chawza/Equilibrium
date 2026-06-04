mod commands;
mod db;
mod error;
mod models;

use tauri::Manager;
use tauri_specta::{collect_commands, Builder};

pub fn run() {
    // Build the tauri-specta command registry.
    // This drives both the TypeScript binding export AND the invoke_handler.
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![commands::ping::ping]);

    // In debug builds, export the TypeScript bindings to src/lib/bindings.ts.
    // This file is committed so the frontend always has types, even before first run.
    #[cfg(debug_assertions)]
    builder
        .export(
            specta_typescript::Typescript::default(),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export TypeScript bindings");

    tauri::Builder::default()
        .invoke_handler(builder.invoke_handler())
        .setup(|app| {
            // Locate the app data directory (e.g. ~/Library/Application Support/com.nabeel.equilibrium)
            let db_path = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory")
                .join("equilibrium.db");

            // Open / create the SQLite database and run schema migrations
            let conn = db::init(&db_path).expect("failed to initialise database");
            app.manage(db::DbState(std::sync::Mutex::new(conn)));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Equilibrium");
}
