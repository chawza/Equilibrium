/**
 * Predefined emoji set and keyword-based auto-suggestion.
 * Ported from ClAUDE_DESIGN/design_files/components/core.jsx
 */

export const ALL_EMOJIS: string[] = [
	'💼', '🏠', '🛒', '💰', '⚡', '🎁', '📈', '🍕', '🚗', '💊',
	'🎓', '🏋️', '🎮', '📱', '🛍️', '✈️', '🐾', '👶', '🎬', '🔧',
	'🎵', '👔', '🌐', '📦', '🧾', '💵', '🏦', '📝', '💡',
];

const EMOJI_MAP: Record<string, string> = {
	salary: '💼', wage: '💼', gaji: '💼',
	rent: '🏠', housing: '🏠', sewa: '🏠', kos: '🏠',
	grocery: '🛒', groceries: '🛒', belanja: '🛒',
	electric: '⚡', electricity: '⚡', listrik: '⚡', utility: '⚡',
	saving: '💰', emergency: '💰', tabungan: '💰',
	gift: '🎁', birthday: '🎁', hadiah: '🎁',
	dividend: '📈', stock: '📈', investment: '📈', investasi: '📈',
	eating: '🍕', eat: '🍕', restaurant: '🍕', makan: '🍕',
	transport: '🚗', car: '🚗', fuel: '🚗', gas: '🚗',
	health: '💊', medicine: '💊', doctor: '💊', obat: '💊',
	education: '🎓', school: '🎓', course: '🎓',
	fitness: '🏋️', gym: '🏋️',
	entertainment: '🎮', game: '🎮',
	phone: '📱', internet: '🌐', wifi: '🌐',
	shopping: '🛍️', clothes: '👔',
	travel: '✈️', vacation: '✈️',
	pet: '🐾', pets: '🐾',
	child: '👶', children: '👶', baby: '👶',
	streaming: '🎬', netflix: '🎬', movie: '🎬',
	maintenance: '🔧', repair: '🔧',
	subscription: '🎵', music: '🎵',
	delivery: '📦',
	bill: '🧾', bills: '🧾',
	bonus: '💵',
	interest: '🏦', bank: '🏦',
};

/** Returns a suggested emoji for the given label (substring match), or '📝' as fallback. */
export function suggestEmoji(label: string): string {
	const lower = label.toLowerCase();
	for (const [keyword, emoji] of Object.entries(EMOJI_MAP)) {
		if (lower.includes(keyword)) return emoji;
	}
	return '📝';
}
