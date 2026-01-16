import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types.js';

/**
 * Login action handler.
 * 
 * Validates password against ADMIN_PASSWORD environment variable.
 * Sets httpOnly auth cookie on success.
 */
export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString() || '';
		const password = formData.get('password')?.toString() || '';

		// Get expected password from environment (SvelteKit way)
		const expectedPassword = env.ADMIN_PASSWORD;

		// Check if ADMIN_PASSWORD is configured
		if (!expectedPassword) {
			console.error('ADMIN_PASSWORD environment variable is not set');
			return fail(400, {
				error: 'Server-Konfigurationsfehler: ADMIN_PASSWORD nicht gesetzt.'
			});
		}

		// Validate username (must be 'admin')
		if (username !== 'admin') {
			return fail(400, {
				error: 'Ungültiger Benutzername.'
			});
		}

		// Validate password
		if (password !== expectedPassword) {
			return fail(400, {
				error: 'Falsches Passwort.'
			});
		}

		// Password is correct - set auth cookie
		cookies.set('auth', 'ok', {
			httpOnly: true,
			secure: env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		});

		// Redirect to home page
		throw redirect(303, '/');
	}
};

