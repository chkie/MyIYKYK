import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

/**
 * Global hook for authentication.
 *
 * Public routes:
 * - /login (and all sub-paths)
 *
 * All other routes require authentication via 'auth' cookie.
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Preload latin woff2 fonts (in addition to SvelteKit's default js/css)
	// → emits <link rel="preload" as="font" crossorigin> with correct hashed paths.
	const opts: Parameters<typeof resolve>[1] = {
		preload: ({ type }) => type === 'js' || type === 'css' || type === 'font'
	};

	// Allow access to /login without authentication
	if (pathname.startsWith('/login')) {
		return resolve(event, opts);
	}

	// Check for auth cookie
	const authCookie = event.cookies.get('auth');

	// If not authenticated, redirect to login
	if (authCookie !== 'ok') {
		throw redirect(303, '/login');
	}

	// User is authenticated, proceed
	return resolve(event, opts);
};
