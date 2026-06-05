import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess()],

	kit: {
		// App läuft auf Vercel (Owner-bestätigt) — expliziter Adapter statt adapter-auto.
		// runtime explizit, da lokales Node (v26) sonst nicht auf eine Vercel-Runtime
		// gemappt wird; nodejs22.x = aktueller Vercel-LTS-Standard.
		// https://svelte.dev/docs/kit/adapter-vercel
		adapter: adapter({ runtime: 'nodejs22.x' })
	}
};

export default config;
