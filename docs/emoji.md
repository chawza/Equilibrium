# Emoji System

Records use emoji as visual identifiers. Users pick from the predefined set (defined in `src/lib/constants/emoji.ts` — canonical count lives there), or get an auto-suggestion based on the label they type.

---

## Predefined Set

Defined in `src/lib/constants/emoji.ts` (`ALL_EMOJIS`). Grouped by category for reference:

```
Income & Finance:  💼 💵 📈 🏦 💰 🫙 🏛️ 🛡️
Housing:           🏠 ⚡ 💧 🔌 🛋️ 🧹 🧺 🌱
Food & Drink:      🍕 ☕ 🍺 🍫
Transport:         🚗 ⛽ 🚌 ✈️
Health:            💊 🏥 🦷 🏋️
Personal Care:     💇
Shopping/Clothing: 🛒 🛍️ 👔
Technology:        📱 🌐
Entertainment:     🎮 🎬 🎵 🎨 📚 ⚽
Children/Family:   👶 🎁 🐾
Services:          🎓 🔧 📦 🧾 🤝
Misc:              💡 📝
```

> **Keep in sync:** adding a glyph here requires a matching `EmojiEntry` in `src-tauri/src/emoji/dictionaries/en.rs` (and `id.rs` if Indonesian keywords apply) so it can be suggested.

---

## Auto-Suggestion System

Suggestion is **Rust-only** — no TypeScript keyword mirror. The IPC command `auto_suggest_emoji(label) → String` is called on every keystroke in record edit mode.

### Architecture

A swappable-backend design lives under `src-tauri/src/emoji/`:

| File | Role |
|---|---|
| `mod.rs` | `EmojiSuggester` trait (`suggest(label) -> String`, `backend_name`); `DynEmojiSuggester` Tauri managed state |
| `strsim_backend.rs` | Active backend — Jaro-Winkler fuzzy matching |
| `catalog.rs` | Aggregates `DICTIONARIES` slice from both language modules |
| `dictionaries/en.rs` | English keyword table (canonical, ~52 entries) |
| `dictionaries/id.rs` | Indonesian keyword table (~50 entries, single-token keywords) |

### Matching Algorithm (`strsim_backend.rs`)

1. Lowercase the label.
2. Tokenize on whitespace, dropping tokens shorter than 2 chars.
3. For each token × each keyword across both dictionaries, compute `jaro_winkler(token, keyword)`.
4. Track the best score and its emoji.
5. If best score ≥ `0.82` → return that emoji. Otherwise → return fallback `"📝"`.

This gives typo-tolerance ("salry" → 💼) and multi-word matching ("monthly electricity bill" → ⚡ because "electricity" token matches the keyword).

### Example Mappings

| Label (EN) | Label (ID) | Emoji |
|---|---|---|
| salary, wage | gaji | 💼 |
| rent, housing | sewa, kos | 🏠 |
| grocery | belanja | 🛒 |
| electricity | listrik | ⚡ |
| water | air | 💧 |
| fuel, petrol | bensin | ⛽ |
| coffee | kopi | ☕ |
| medicine, health | obat | 💊 |
| dental | — | 🦷 |
| insurance | asuransi | 🛡️ |
| tax | pajak | 🏛️ |
| donation, zakat | donasi, zakat | 🤝 |
| laundry | — | 🧺 |
| salon | — | 💇 |

> The keyword tables in `dictionaries/en.rs` and `dictionaries/id.rs` are the source of truth — refer there for the complete list rather than maintaining a duplicate here.

Fallback: `📝` when no keyword scores ≥ 0.82.
