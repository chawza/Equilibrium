use crate::emoji::catalog::EmojiEntry;

/// Indonesian (Bahasa Indonesia) keyword dictionary.
/// Subset — only emojis with meaningful Indonesian terms are listed.
/// All keywords are single tokens (no spaces) so the per-word tokenizer scores them correctly.
pub const ENTRIES: &[EmojiEntry] = &[
    // ── Income & Finance ─────────────────────────────────────────────────────
    EmojiEntry { emoji: "💼", keywords: &["gaji", "kerja", "pendapatan", "upah", "penghasilan"] },
    EmojiEntry { emoji: "💵", keywords: &["uang", "bonus", "tunai", "tips", "insentif"] },
    EmojiEntry { emoji: "📈", keywords: &["investasi", "saham", "portofolio", "dividen"] },
    EmojiEntry { emoji: "🏦", keywords: &["bank", "transfer", "atm", "rekening", "setor"] },
    EmojiEntry { emoji: "💰", keywords: &["tabungan", "dana", "simpanan", "cadangan"] },
    EmojiEntry { emoji: "🫙", keywords: &["celengan", "target", "tujuan", "menabung"] },
    EmojiEntry { emoji: "🏛️", keywords: &["pajak", "pph", "ppn", "fiskal"] },
    EmojiEntry { emoji: "🛡️", keywords: &["asuransi", "premi", "perlindungan", "polis"] },

    // ── Housing ──────────────────────────────────────────────────────────────
    EmojiEntry { emoji: "🏠", keywords: &["sewa", "kos", "kontrak", "rumah", "apartemen"] },
    EmojiEntry { emoji: "⚡", keywords: &["listrik", "pln", "token", "meteran"] },
    EmojiEntry { emoji: "💧", keywords: &["air", "pdam", "ledeng"] },
    EmojiEntry { emoji: "🔌", keywords: &["elektronik", "gadget", "perangkat", "alat"] },
    EmojiEntry { emoji: "🛋️", keywords: &["furnitur", "perabot", "dekorasi", "interior"] },
    EmojiEntry { emoji: "🧹", keywords: &["bersih", "pembersih", "pel", "sapu"] },
    EmojiEntry { emoji: "🧺", keywords: &["laundri", "cuci", "deterjen", "setrika"] },
    EmojiEntry { emoji: "🌱", keywords: &["tanaman", "kebun", "pupuk", "benih"] },

    // ── Food & Drink ─────────────────────────────────────────────────────────
    EmojiEntry { emoji: "🍕", keywords: &["makan", "makanan", "restoran", "warung", "makan-makan", "katering"] },
    EmojiEntry { emoji: "☕", keywords: &["kopi", "teh", "minuman", "sarapan", "ngopi"] },
    EmojiEntry { emoji: "🍺", keywords: &["minum", "bar", "alkohol", "bir"] },
    EmojiEntry { emoji: "🍫", keywords: &["camilan", "snack", "cokelat", "jajanan", "cemilan"] },

    // ── Transport ────────────────────────────────────────────────────────────
    EmojiEntry { emoji: "🚗", keywords: &["mobil", "kendaraan", "parkir", "transportasi"] },
    EmojiEntry { emoji: "⛽", keywords: &["bensin", "bbm", "pertamax", "pertalite", "solar", "premium"] },
    EmojiEntry { emoji: "🚌", keywords: &["bus", "angkot", "kereta", "mrt", "transjakarta", "commuter", "ojek", "gojek", "grab"] },
    EmojiEntry { emoji: "✈️", keywords: &["tiket", "liburan", "pesawat", "wisata", "perjalanan"] },

    // ── Health ───────────────────────────────────────────────────────────────
    EmojiEntry { emoji: "💊", keywords: &["obat", "apotek", "vitamin", "suplemen", "resep"] },
    EmojiEntry { emoji: "🏥", keywords: &["sakit", "klinik", "rawat", "opname", "periksa"] },
    EmojiEntry { emoji: "🦷", keywords: &["gigi", "dental", "kawat"] },
    EmojiEntry { emoji: "🏋️", keywords: &["gym", "olahraga", "fitnes", "latihan"] },

    // ── Personal Care ────────────────────────────────────────────────────────
    EmojiEntry { emoji: "💇", keywords: &["salon", "rambut", "kecantikan", "perawatan", "cukur"] },

    // ── Shopping & Clothing ──────────────────────────────────────────────────
    EmojiEntry { emoji: "🛒", keywords: &["belanja", "supermarket", "pasar", "minimarket", "warung"] },
    EmojiEntry { emoji: "🛍️", keywords: &["belanja", "toko", "online", "beli", "pembelian"] },
    EmojiEntry { emoji: "👔", keywords: &["baju", "pakaian", "fashion", "outfit", "busana"] },

    // ── Technology & Communication ───────────────────────────────────────────
    EmojiEntry { emoji: "📱", keywords: &["handphone", "hp", "pulsa", "kuota", "smartphone"] },
    EmojiEntry { emoji: "🌐", keywords: &["internet", "wifi", "data", "kuota"] },

    // ── Entertainment & Leisure ──────────────────────────────────────────────
    EmojiEntry { emoji: "🎮", keywords: &["game", "gaming", "main", "hiburan"] },
    EmojiEntry { emoji: "🎬", keywords: &["film", "bioskop", "nonton", "streaming"] },
    EmojiEntry { emoji: "🎵", keywords: &["musik", "lagu", "konser"] },
    EmojiEntry { emoji: "🎨", keywords: &["hobi", "seni", "kreatif", "kerajinan"] },
    EmojiEntry { emoji: "📚", keywords: &["buku", "bacaan", "perpustakaan", "novel"] },
    EmojiEntry { emoji: "⚽", keywords: &["olahraga", "bola", "perlengkapan", "sepatu"] },

    // ── Children & Family ────────────────────────────────────────────────────
    EmojiEntry { emoji: "👶", keywords: &["anak", "bayi", "popok", "susu", "balita"] },
    EmojiEntry { emoji: "🎁", keywords: &["hadiah", "kado", "ulang tahun", "perayaan"] },
    EmojiEntry { emoji: "🐾", keywords: &["hewan", "peliharaan", "anjing", "kucing", "vet"] },

    // ── Services & Community ─────────────────────────────────────────────────
    EmojiEntry { emoji: "🎓", keywords: &["sekolah", "pendidikan", "kuliah", "les", "kursus", "bimbel"] },
    EmojiEntry { emoji: "🔧", keywords: &["servis", "perbaikan", "bengkel", "teknisi"] },
    EmojiEntry { emoji: "📦", keywords: &["paket", "pengiriman", "kurir", "ekspedisi"] },
    EmojiEntry { emoji: "🧾", keywords: &["tagihan", "nota", "faktur", "kuitansi"] },
    EmojiEntry { emoji: "🤝", keywords: &["donasi", "sedekah", "zakat", "infak", "sumbangan", "amal"] },
];
