import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/**
 * Logout endpoint.
 * 
 * Deletes the auth cookie and redirects to login.
 * Supports both GET and POST methods.
 */
export const GET: RequestHandler = async ({ cookies }) => {
	// Delete auth cookie
	cookies.delete('auth', {
		path: '/'
	});

	// Redirect to login
	throw redirect(303, '/login');
};

export const POST: RequestHandler = GET;

