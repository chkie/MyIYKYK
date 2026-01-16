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

	// Allow access to /login without authentication
	if (pathname.startsWith('/login')) {
		return resolve(event);
	}

	// Check for auth cookie
	const authCookie = event.cookies.get('auth');

	// If not authenticated, redirect to login
	if (authCookie !== 'ok') {
		throw redirect(303, '/login');
	}

	// User is authenticated, proceed
	return resolve(event);
};

