/**
 * Predefined emoji set for the picker grid (~50 emojis).
 * Emoji suggestion logic lives in the Rust backend — see src-tauri/src/emoji/.
 *
 * IMPORTANT: Keep the glyphs here in sync with
 * src-tauri/src/emoji/dictionaries/en.rs (canonical source).
 * Both runtimes are independent — a glyph added here needs a matching
 * EmojiEntry in en.rs (and id.rs if Indonesian keywords exist) to be suggested.
 */
export const ALL_EMOJIS: string[] = [
	// Income & Finance
	'💼', '💵', '📈', '🏦', '💰', '🫙', '🏛️', '🛡️',
	// Housing
	'🏠', '⚡', '💧', '🔌', '🛋️', '🧹', '🧺', '🌱',
	// Food & Drink
	'🍕', '☕', '🍺', '🍫',
	// Transport
	'🚗', '⛽', '🚌', '✈️',
	// Health
	'💊', '🏥', '🦷', '🏋️',
	// Personal Care
	'💇',
	// Shopping & Clothing
	'🛒', '🛍️', '👔',
	// Technology
	'📱', '🌐',
	// Entertainment & Leisure
	'🎮', '🎬', '🎵', '🎨', '📚', '⚽',
	// Children & Family
	'👶', '🎁', '🐾',
	// Services & Community
	'🎓', '🔧', '📦', '🧾', '🤝',
	// Misc
	'💡', '📝',
];
