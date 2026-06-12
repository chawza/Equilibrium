/**
 * Date format store — manages the app-wide date display preference.
 *
 * Persists to localStorage('eq_dateFormat').
 * init() must be called on client mount (see +layout.svelte).
 * No pre-paint script needed — date rendering happens after JS loads,
 * so there is no flash risk (unlike the theme store).
 */

export type DateFormat = 'default' | 'iso' | 'long' | 'dayfirst';

const STORAGE_KEY = 'eq_dateFormat';

class DateFormatStore {
	value = $state<DateFormat>('default');

	/** Call once on mount. Reads localStorage. */
	init() {
		const stored = localStorage.getItem(STORAGE_KEY) as DateFormat | null;
		if (stored && (['default', 'iso', 'long', 'dayfirst'] as string[]).includes(stored)) {
			this.value = stored;
		}
	}

	set(fmt: DateFormat) {
		this.value = fmt;
		localStorage.setItem(STORAGE_KEY, fmt);
	}
}

export const dateFormatStore = new DateFormatStore();
