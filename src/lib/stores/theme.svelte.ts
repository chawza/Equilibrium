/**
 * Theme store — manages light/dark mode.
 *
 * Persists to localStorage('eq_theme').
 * Applies .dark class to <html>.
 * init() must be called on client mount (see +layout.svelte).
 * The pre-paint script in app.html applies the class before JS loads
 * to prevent the flash — this store keeps it in sync afterwards.
 */

type Theme = 'light' | 'dark';

class ThemeStore {
	value = $state<Theme>('light');

	/** Call once on mount. Reads localStorage and OS preference. */
	init() {
		const stored = localStorage.getItem('eq_theme') as Theme | null;
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		this.value = stored ?? (prefersDark ? 'dark' : 'light');
		this._apply();
	}

	toggle() {
		this.value = this.value === 'light' ? 'dark' : 'light';
		localStorage.setItem('eq_theme', this.value);
		this._apply();
	}

	private _apply() {
		document.documentElement.classList.toggle('dark', this.value === 'dark');
	}
}

export const themeStore = new ThemeStore();
