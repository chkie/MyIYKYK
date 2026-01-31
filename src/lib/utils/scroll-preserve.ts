/**
 * Scroll Position Preservation for SvelteKit Forms
 * 
 * Prevents page from jumping to top after form submissions.
 * Critical for PWA UX where users scroll through lists and submit forms.
 * 
 * Usage:
 * ```svelte
 * import { enhanceWithScrollPreserve } from '$lib/utils/scroll-preserve';
 * 
 * <form use:enhance={enhanceWithScrollPreserve(() => {
 *   // Your existing enhance logic
 *   isSubmitting = true;
 *   return async ({ result, update }) => {
 *     await update();
 *     isSubmitting = false;
 *   };
 * })}>
 * ```
 */

import type { SubmitFunction } from '@sveltejs/kit';

/**
 * Wraps an enhance function to preserve scroll position after form submission
 * @param enhanceCallback - Your existing enhance callback (optional)
 * @returns Enhanced submit function with scroll preservation
 */
export function enhanceWithScrollPreserve(
	enhanceCallback?: () => ReturnType<SubmitFunction>
): SubmitFunction {
	return () => {
		// Capture scroll position BEFORE submission
		const scrollY = window.scrollY;
		const scrollX = window.scrollX;

		// Call user's callback if provided
		const userCallback = enhanceCallback?.();

		// Return enhanced callback
		return async ({ result, update }) => {
			// Call user's update logic if provided
			if (userCallback && typeof userCallback === 'function') {
				await userCallback({ result, update } as any);
			} else {
				// Default: just update
				await update();
			}

			// Restore scroll position after DOM update
			// Use requestAnimationFrame to ensure DOM is fully updated
			requestAnimationFrame(() => {
				window.scrollTo(scrollX, scrollY);
			});
		};
	};
}

/**
 * Simple scroll preservation without custom callback
 * Use when you don't need custom enhance logic
 */
export const preserveScroll: SubmitFunction = () => {
	const scrollY = window.scrollY;
	const scrollX = window.scrollX;

	return async ({ update }) => {
		await update();
		requestAnimationFrame(() => {
			window.scrollTo(scrollX, scrollY);
		});
	};
};
