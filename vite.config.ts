import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
	plugins: [
		tailwindcss(),
		sveltekit()
	],

	// Tauri-specific settings
	clearScreen: false,
	server: {
		port: 5173,
		strictPort: true,
		watch: {
			// Tell Vite to ignore watching src-tauri
			ignored: ['**/src-tauri/**']
		}
	}
}));
