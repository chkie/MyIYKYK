import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],

	server: {
		host: true, // Expose to network (0.0.0.0)
		port: 5174
	},

	build: {
		// Performance Optimizations
		target: 'es2022',
		minify: 'esbuild',
		cssMinify: 'lightningcss',
		cssCodeSplit: true,
		
		rollupOptions: {
			output: {
				// Aggressive code-splitting for better caching
				manualChunks: (id) => {
					if (id.includes('node_modules')) {
						// Core framework
						if (id.includes('@sveltejs') || id.includes('svelte')) {
							return 'vendor-svelte';
						}
						// Fonts (large, rarely changes)
						if (id.includes('@fontsource')) {
							return 'vendor-fonts';
						}
						// Other vendor code
						return 'vendor';
					}
				},
				// Optimize chunk names for better caching
				chunkFileNames: '_app/immutable/chunks/[name]-[hash].js',
				assetFileNames: '_app/immutable/assets/[name]-[hash][extname]'
			}
		}
	},

	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'client',

					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},

					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
