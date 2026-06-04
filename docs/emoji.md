# Emoji System

Records use emoji as visual identifiers. Users pick from a predefined set of 29, or get an auto-suggestion based on the label they type.

---

## Predefined Set

```
💼 🏠 🛒 💰 ⚡ 🎁 📈 🍕 🚗 💊 🎓 🏋️ 🎮 📱 🛍️ ✈️ 🐾 👶 🎬 🔧 🎵 👔 🌐 📦 🧾 💵 🏦 📝 💡
```

---

## Keyword → Emoji Map

Case-insensitive substring matching. Returns first match; fallback is `📝`.

Implemented in Rust (`auto_suggest_emoji` command) and mirrored in TypeScript for live preview while typing.

| Keywords | Emoji |
|---|---|
| salary, wage, gaji | 💼 |
| rent, housing, sewa, kos | 🏠 |
| grocery, groceries, belanja | 🛒 |
| electric, electricity, listrik, utility | ⚡ |
| saving, emergency, tabungan | 💰 |
| gift, birthday, hadiah | 🎁 |
| dividend, stock, investment, investasi | 📈 |
| eating, eat, restaurant, makan | 🍕 |
| transport, car, fuel, gas | 🚗 |
| health, medicine, doctor, obat | 💊 |
| education, school, course | 🎓 |
| fitness, gym | 🏋️ |
| entertainment, game | 🎮 |
| phone | 📱 |
| internet, wifi | 🌐 |
| shopping | 🛍️ |
| clothes | 👔 |
| travel, vacation | ✈️ |
| pet, pets | 🐾 |
| child, children, baby | 👶 |
| streaming, netflix, movie | 🎬 |
| maintenance, repair | 🔧 |
| subscription, music | 🎵 |
| delivery | 📦 |
| bill, bills | 🧾 |
| bonus | 💵 |
| interest, bank | 🏦 |

Bilingual (EN + Indonesian) to support the target user base.
