use strsim::jaro_winkler;
use super::EmojiSuggester;

const FALLBACK: &str = "📝";
const THRESHOLD: f64 = 0.82;

struct EmojiEntry {
    emoji: &'static str,
    keywords: &'static [&'static str],
}

/// Keywords: English + Indonesian. Expanded from emojilib where applicable.
const EMOJI_MAP: &[EmojiEntry] = &[
    EmojiEntry { emoji: "💼", keywords: &["salary", "wage", "gaji", "income", "paycheck", "payroll", "work"] },
    EmojiEntry { emoji: "🏠", keywords: &["rent", "housing", "sewa", "kos", "apartment", "home", "house", "mortgage"] },
    EmojiEntry { emoji: "🛒", keywords: &["grocery", "groceries", "belanja", "supermarket", "market", "store", "mart"] },
    EmojiEntry { emoji: "⚡", keywords: &["electric", "electricity", "listrik", "utility", "power", "energy", "bill"] },
    EmojiEntry { emoji: "💰", keywords: &["saving", "emergency", "tabungan", "savings", "deposit", "fund"] },
    EmojiEntry { emoji: "🎁", keywords: &["gift", "birthday", "hadiah", "present", "surprise", "celebration"] },
    EmojiEntry { emoji: "📈", keywords: &["dividend", "stock", "investment", "investasi", "portfolio", "trading", "profit"] },
    EmojiEntry { emoji: "🍕", keywords: &["eating", "eat", "restaurant", "makan", "food", "lunch", "dinner", "pizza", "meal"] },
    EmojiEntry { emoji: "🚗", keywords: &["transport", "car", "fuel", "gas", "bensin", "vehicle", "drive", "commute", "parking"] },
    EmojiEntry { emoji: "💊", keywords: &["health", "medicine", "doctor", "obat", "pharmacy", "medical", "hospital", "clinic"] },
    EmojiEntry { emoji: "🎓", keywords: &["education", "school", "course", "tuition", "study", "university", "college", "class"] },
    EmojiEntry { emoji: "🏋️", keywords: &["fitness", "gym", "exercise", "workout", "sport"] },
    EmojiEntry { emoji: "🎮", keywords: &["entertainment", "game", "gaming", "video", "console", "play"] },
    EmojiEntry { emoji: "📱", keywords: &["phone", "mobile", "cellular", "handphone", "pulsa", "data"] },
    EmojiEntry { emoji: "🌐", keywords: &["internet", "wifi", "broadband", "network", "web"] },
    EmojiEntry { emoji: "🛍️", keywords: &["shopping", "belanja", "purchase", "buy", "retail", "online"] },
    EmojiEntry { emoji: "👔", keywords: &["clothes", "clothing", "fashion", "apparel", "outfit", "wear", "baju"] },
    EmojiEntry { emoji: "✈️", keywords: &["travel", "vacation", "flight", "trip", "holiday", "liburan", "tiket"] },
    EmojiEntry { emoji: "🐾", keywords: &["pet", "pets", "animal", "dog", "cat", "vet", "hewan"] },
    EmojiEntry { emoji: "👶", keywords: &["child", "children", "baby", "kid", "toddler", "anak", "daycare", "diaper"] },
    EmojiEntry { emoji: "🎬", keywords: &["streaming", "netflix", "movie", "film", "cinema", "show", "series"] },
    EmojiEntry { emoji: "🔧", keywords: &["maintenance", "repair", "fix", "service", "mechanic", "plumber"] },
    EmojiEntry { emoji: "🎵", keywords: &["subscription", "music", "spotify", "audio", "podcast"] },
    EmojiEntry { emoji: "📦", keywords: &["delivery", "package", "shipping", "order", "courier", "paket"] },
    EmojiEntry { emoji: "🧾", keywords: &["bills", "receipt", "invoice", "tagihan"] },
    EmojiEntry { emoji: "💵", keywords: &["bonus", "cash", "money", "reward", "uang"] },
    EmojiEntry { emoji: "🏦", keywords: &["interest", "bank", "banking", "transfer", "atm"] },
    EmojiEntry { emoji: "💡", keywords: &["idea", "tip", "suggestion", "inspiration", "creative"] },
    // 📝 is the FALLBACK constant — not in the map so it's never "suggested"
];

pub struct StrsimSuggester;

impl StrsimSuggester {
    pub fn new() -> Self {
        Self
    }
}

impl EmojiSuggester for StrsimSuggester {
    fn suggest(&self, label: &str) -> String {
        let label_lower = label.to_lowercase();
        let mut best_score = 0.0f64;
        let mut best_emoji = FALLBACK;

        for entry in EMOJI_MAP {
            for kw in entry.keywords {
                let score = jaro_winkler(&label_lower, kw);
                if score > best_score {
                    best_score = score;
                    best_emoji = entry.emoji;
                }
            }
        }

        if best_score >= THRESHOLD {
            best_emoji.to_string()
        } else {
            FALLBACK.to_string()
        }
    }

    fn backend_name(&self) -> &'static str {
        "strsim"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(label: &str) -> String {
        StrsimSuggester::new().suggest(label)
    }

    #[test]
    fn exact_matches() {
        assert_eq!(s("salary"), "💼");
        assert_eq!(s("grocery"), "🛒");
        assert_eq!(s("listrik"), "⚡");
        assert_eq!(s("belanja"), "🛒");
        assert_eq!(s("bank"), "🏦");
    }

    #[test]
    fn fuzzy_typos() {
        assert_eq!(s("salry"), "💼");    // jaro-winkler typo
        assert_eq!(s("grocrey"), "🛒");  // transposition
    }

    #[test]
    fn indonesian_keywords() {
        assert_eq!(s("gaji"), "💼");
        assert_eq!(s("tabungan"), "💰");
        assert_eq!(s("obat"), "💊");
        assert_eq!(s("makan"), "🍕");
    }

    #[test]
    fn no_match_returns_fallback() {
        assert_eq!(s("asdfghjk"), "📝");
        assert_eq!(s(""), "📝");
        assert_eq!(s("zzzzz"), "📝");
    }

    #[test]
    fn case_insensitive() {
        assert_eq!(s("Salary"), "💼");
        assert_eq!(s("GROCERY"), "🛒");
    }
}
