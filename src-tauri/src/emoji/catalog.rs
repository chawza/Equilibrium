use super::dictionaries;

/// A single emoji entry: a glyph and the keywords that map to it.
/// Keywords are compared token-by-token against the user's label.
pub struct EmojiEntry {
    pub emoji: &'static str,
    pub keywords: &'static [&'static str],
}

/// All language dictionaries, aggregated.
/// To add a language: create `dictionaries/<lang>.rs`, export `ENTRIES`,
/// declare it in `dictionaries/mod.rs`, and append its reference here.
pub const DICTIONARIES: &[&[EmojiEntry]] = &[
    dictionaries::en::ENTRIES,
    dictionaries::id::ENTRIES,
];
