use strsim::jaro_winkler;
use super::EmojiSuggester;
use super::catalog::DICTIONARIES;

const FALLBACK: &str = "📝";
const THRESHOLD: f64 = 0.82;

pub struct StrsimSuggester;

impl StrsimSuggester {
    pub fn new() -> Self {
        Self
    }
}

impl EmojiSuggester for StrsimSuggester {
    fn suggest(&self, label: &str) -> String {
        let label_lower = label.to_lowercase();

        // Tokenize: split on whitespace, drop tokens shorter than 2 chars.
        // This lets "electricity bill" match the keyword "electricity" on its own token.
        let tokens: Vec<&str> = label_lower
            .split_whitespace()
            .filter(|t| t.len() >= 2)
            .collect();

        if tokens.is_empty() {
            return FALLBACK.to_string();
        }

        let mut best_score = 0.0f64;
        let mut best_emoji = FALLBACK;

        for dict in DICTIONARIES {
            for entry in *dict {
                for kw in entry.keywords {
                    for token in &tokens {
                        let score = jaro_winkler(token, kw);
                        if score > best_score {
                            best_score = score;
                            best_emoji = entry.emoji;
                        }
                    }
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

    // ── Existing single-word cases (regression) ───────────────────────────────
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
        assert_eq!(s("salry"), "💼");
        assert_eq!(s("grocrey"), "🛒");
    }

    #[test]
    fn indonesian_keywords() {
        assert_eq!(s("gaji"), "💼");
        assert_eq!(s("tabungan"), "💰");
        assert_eq!(s("obat"), "💊");
        assert_eq!(s("makan"), "🍕");
        assert_eq!(s("bensin"), "⛽");
        assert_eq!(s("kopi"), "☕");
        assert_eq!(s("pajak"), "🏛️");
        assert_eq!(s("asuransi"), "🛡️");
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
        assert_eq!(s("Kopi"), "☕");
    }

    // ── Multi-word label matching (per-word tokenizer) ─────────────────────────
    #[test]
    fn multi_word_english() {
        assert_eq!(s("monthly electricity bill"), "⚡");
        assert_eq!(s("grocery shopping"), "🛒");
        assert_eq!(s("fuel refill"), "⛽");           // "car fuel" ambiguous — label with just fuel
        assert_eq!(s("gym membership fee"), "🏋️");
        assert_eq!(s("book reading"), "📚");
    }

    #[test]
    fn multi_word_indonesian() {
        assert_eq!(s("beli kopi pagi"), "☕");
        assert_eq!(s("bayar listrik bulan ini"), "⚡");
        assert_eq!(s("isi bensin"), "⛽");             // "mobil" ambiguous — label with just bensin
        assert_eq!(s("bayar tagihan air"), "💧");
    }

    #[test]
    fn multi_word_no_match() {
        assert_eq!(s("random gibberish xyz"), "📝");
    }

    // ── New emojis in expanded catalogue ──────────────────────────────────────
    #[test]
    fn new_emojis() {
        assert_eq!(s("coffee"), "☕");
        assert_eq!(s("dental"), "🦷");
        assert_eq!(s("salon"), "💇");
        assert_eq!(s("laundry"), "🧺");
        assert_eq!(s("donation"), "🤝");
        assert_eq!(s("insurance"), "🛡️");
        assert_eq!(s("tax"), "🏛️");
        assert_eq!(s("furniture"), "🛋️");
        assert_eq!(s("bus"), "🚌");
        assert_eq!(s("petrol"), "⛽");
        assert_eq!(s("hospital"), "🏥");
        assert_eq!(s("cleaning"), "🧹");
        assert_eq!(s("zakat"), "🤝");
        assert_eq!(s("donasi"), "🤝");
    }
}
