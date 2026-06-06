use crate::emoji::catalog::EmojiEntry;

/// English keyword dictionary.
/// This is the canonical source — every emoji in the set appears here.
/// Sync with: src/lib/constants/emoji.ts → ALL_EMOJIS (same order, same glyphs).
pub const ENTRIES: &[EmojiEntry] = &[
    // ── Income & Finance ─────────────────────────────────────────────────────
    EmojiEntry { emoji: "💼", keywords: &["salary", "wage", "income", "paycheck", "payroll", "work", "job", "employment"] },
    EmojiEntry { emoji: "💵", keywords: &["cash", "bonus", "money", "reward", "tip", "allowance", "pocket"] },
    EmojiEntry { emoji: "📈", keywords: &["investment", "dividend", "stock", "portfolio", "trading", "profit", "return", "equity", "shares"] },
    EmojiEntry { emoji: "🏦", keywords: &["bank", "banking", "interest", "transfer", "atm", "account", "deposit", "withdrawal"] },
    EmojiEntry { emoji: "💰", keywords: &["saving", "savings", "emergency", "fund", "nest", "reserve"] },
    EmojiEntry { emoji: "🫙", keywords: &["jar", "goal", "target", "piggy", "stash", "sinking", "bucket"] },
    EmojiEntry { emoji: "🏛️", keywords: &["tax", "taxes", "government", "irs", "vat", "levy", "duty", "fiscal", "revenue"] },
    EmojiEntry { emoji: "🛡️", keywords: &["insurance", "coverage", "premium", "policy", "protection", "assurance", "indemnity"] },

    // ── Housing ──────────────────────────────────────────────────────────────
    EmojiEntry { emoji: "🏠", keywords: &["rent", "housing", "apartment", "home", "house", "mortgage", "lease", "landlord", "condo"] },
    EmojiEntry { emoji: "⚡", keywords: &["electric", "electricity", "utility", "power", "energy", "pln"] },
    EmojiEntry { emoji: "💧", keywords: &["water", "utility", "plumbing", "pipe", "pdam", "water bill"] },
    EmojiEntry { emoji: "🔌", keywords: &["electronics", "gadget", "appliance", "device", "charger", "plug", "cable"] },
    EmojiEntry { emoji: "🛋️", keywords: &["furniture", "sofa", "decor", "furnishing", "interior", "couch", "table", "chair"] },
    EmojiEntry { emoji: "🧹", keywords: &["cleaning", "clean", "household", "sweep", "mop", "supplies", "vacuum", "sanitize"] },
    EmojiEntry { emoji: "🧺", keywords: &["laundry", "washing", "dryer", "detergent", "ironing", "linen"] },
    EmojiEntry { emoji: "🌱", keywords: &["garden", "plant", "gardening", "seeds", "fertilizer", "outdoor", "lawn", "flower"] },

    // ── Food & Drink ─────────────────────────────────────────────────────────
    EmojiEntry { emoji: "🍕", keywords: &["food", "eating", "eat", "restaurant", "lunch", "dinner", "meal", "pizza", "dine", "takeout", "catering"] },
    EmojiEntry { emoji: "☕", keywords: &["coffee", "cafe", "tea", "beverage", "breakfast", "morning", "latte", "espresso", "drink"] },
    EmojiEntry { emoji: "🍺", keywords: &["alcohol", "beer", "wine", "bar", "nightout", "pub", "drinks", "cocktail", "spirit"] },
    EmojiEntry { emoji: "🍫", keywords: &["snack", "snacks", "candy", "sweet", "chocolate", "junk", "treat", "chips", "dessert"] },

    // ── Transport ────────────────────────────────────────────────────────────
    EmojiEntry { emoji: "🚗", keywords: &["car", "vehicle", "drive", "commute", "transport", "auto", "parking"] },
    EmojiEntry { emoji: "⛽", keywords: &["fuel", "gas", "petrol", "gasoline", "refuel", "station", "diesel"] },
    EmojiEntry { emoji: "🚌", keywords: &["bus", "transit", "train", "subway", "metro", "mrt", "public", "commute", "rail", "tram"] },
    EmojiEntry { emoji: "✈️", keywords: &["flight", "travel", "vacation", "holiday", "airline", "ticket", "tour", "abroad"] },

    // ── Health ───────────────────────────────────────────────────────────────
    EmojiEntry { emoji: "💊", keywords: &["medicine", "health", "pharmacy", "drug", "prescription", "vitamin", "supplement", "medication"] },
    EmojiEntry { emoji: "🏥", keywords: &["hospital", "clinic", "doctor", "medical", "checkup", "surgery", "emergency", "inpatient"] },
    EmojiEntry { emoji: "🦷", keywords: &["dental", "dentist", "tooth", "teeth", "braces", "orthodontist"] },
    EmojiEntry { emoji: "🏋️", keywords: &["gym", "fitness", "exercise", "workout", "sport", "training", "membership", "crossfit"] },

    // ── Personal Care ────────────────────────────────────────────────────────
    EmojiEntry { emoji: "💇", keywords: &["salon", "haircut", "beauty", "spa", "grooming", "barber", "nail", "manicure", "pedicure", "waxing"] },

    // ── Shopping & Clothing ──────────────────────────────────────────────────
    EmojiEntry { emoji: "🛒", keywords: &["grocery", "groceries", "supermarket", "market", "store", "mart", "fresh", "produce"] },
    EmojiEntry { emoji: "🛍️", keywords: &["shopping", "retail", "purchase", "buy", "online", "mall", "boutique", "ecommerce"] },
    EmojiEntry { emoji: "👔", keywords: &["clothes", "clothing", "fashion", "apparel", "outfit", "wear", "shirt", "dress", "pants"] },

    // ── Technology & Communication ───────────────────────────────────────────
    EmojiEntry { emoji: "📱", keywords: &["phone", "mobile", "cellular", "smartphone", "iphone", "android", "handphone"] },
    EmojiEntry { emoji: "🌐", keywords: &["internet", "wifi", "broadband", "network", "web", "data", "hosting", "domain"] },

    // ── Entertainment & Leisure ──────────────────────────────────────────────
    EmojiEntry { emoji: "🎮", keywords: &["game", "gaming", "video", "console", "entertainment", "play", "playstation", "xbox", "steam"] },
    EmojiEntry { emoji: "🎬", keywords: &["streaming", "movie", "film", "cinema", "netflix", "show", "series", "watch"] },
    EmojiEntry { emoji: "🎵", keywords: &["music", "subscription", "spotify", "audio", "podcast", "concert", "playlist", "apple"] },
    EmojiEntry { emoji: "🎨", keywords: &["hobby", "art", "craft", "creative", "painting", "drawing", "design", "create"] },
    EmojiEntry { emoji: "📚", keywords: &["book", "books", "reading", "library", "kindle", "ebook", "magazine", "novel", "course"] },
    EmojiEntry { emoji: "⚽", keywords: &["sport", "sports", "soccer", "equipment", "gear", "jersey", "ball", "tennis", "golf"] },

    // ── Children & Family ────────────────────────────────────────────────────
    EmojiEntry { emoji: "👶", keywords: &["baby", "child", "children", "kid", "toddler", "daycare", "diaper", "formula", "stroller"] },
    EmojiEntry { emoji: "🎁", keywords: &["gift", "birthday", "present", "surprise", "celebration", "party", "occasion", "wedding"] },
    EmojiEntry { emoji: "🐾", keywords: &["pet", "pets", "dog", "cat", "animal", "vet", "veterinary", "feed", "grooming"] },

    // ── Services & Community ─────────────────────────────────────────────────
    EmojiEntry { emoji: "🎓", keywords: &["education", "school", "tuition", "university", "college", "class", "study", "course", "lesson"] },
    EmojiEntry { emoji: "🔧", keywords: &["repair", "maintenance", "fix", "service", "mechanic", "plumber", "technician", "handyman"] },
    EmojiEntry { emoji: "📦", keywords: &["delivery", "package", "shipping", "order", "courier", "parcel", "logistics", "express"] },
    EmojiEntry { emoji: "🧾", keywords: &["bill", "bills", "receipt", "invoice", "payment", "dues", "fee", "statement"] },
    EmojiEntry { emoji: "🤝", keywords: &["charity", "donation", "donate", "volunteer", "contribution", "tithe", "zakat", "foundation"] },

    // ── Misc ─────────────────────────────────────────────────────────────────
    EmojiEntry { emoji: "💡", keywords: &["idea", "tip", "miscellaneous", "other", "general", "note", "memo", "misc"] },
    EmojiEntry { emoji: "📝", keywords: &["note", "notes", "general", "misc", "other", "log", "entry"] },
];
