mod commands;
pub mod db;
mod emoji;
mod error;
mod models;

use std::sync::Arc;
use tauri::Manager;
use tauri_specta::{collect_commands, Builder};
use emoji::strsim_backend::StrsimSuggester;
use emoji::DynEmojiSuggester;

pub fn run() {
    // Build the tauri-specta command registry.
    // This drives both the TypeScript binding export AND the invoke_handler.
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            commands::ping::ping,
            commands::tags::list_tags,
            commands::tags::create_tag,
            commands::tags::update_tag,
            commands::tags::delete_tag,
            commands::budgets::list_budgets,
            commands::budgets::get_budget,
            commands::budgets::create_budget,
            commands::budgets::update_budget,
            commands::budgets::delete_budget,
            commands::budgets::create_record,
            commands::budgets::update_record,
            commands::budgets::delete_record,
            commands::budgets::set_record_tags,
            commands::data::get_db_path,
            commands::data::export_json,
            commands::data::export_to_path,
            commands::data::export_csv,
            commands::data::copy_db,
            commands::data::stage_restore,
            commands::data::take_restore_status,
            commands::data::reset_all_data,
            commands::emoji::auto_suggest_emoji,
        ]);

    // In debug builds, export the TypeScript bindings to src/lib/bindings.ts.
    // This file is committed so the frontend always has types, even before first run.
    #[cfg(debug_assertions)]
    builder
        .export(
            specta_typescript::Typescript::default(),
            "../src/lib/bindings.ts",
        )
        .expect("Failed to export TypeScript bindings");

    let mut app_builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init());

    #[cfg(debug_assertions)]
    {
        app_builder = app_builder.plugin(tauri_plugin_pilot::init());
    }

    app_builder
        .invoke_handler(builder.invoke_handler())
        .setup(|app| {
            // Locate the app data directory (e.g. ~/Library/Application Support/com.nabeel.equilibrium)
            let db_path = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory")
                .join("equilibrium.db");

            // If a restore was staged before the last restart, swap the file in
            // now while nothing has the live DB open yet.
            db::apply_pending_restore(&db_path);

            // Open / create the SQLite database and run schema migrations
            let conn = db::init(&db_path).expect("failed to initialise database");
            app.manage(db::DbState(std::sync::Mutex::new(conn)));

            // Register the emoji suggestion backend.
            // To swap the backend: change this line to Arc::new(YourNewBackend::new()).
            let suggester: DynEmojiSuggester = Arc::new(StrsimSuggester::new());
            app.manage(suggester);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Equilibrium");
}
