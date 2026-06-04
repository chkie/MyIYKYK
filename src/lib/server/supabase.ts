/**
 * Server-only Supabase client.
 *
 * IMPORTANT: This file should NEVER be imported in client-side code!
 * It uses the Service Role Key which has full database access.
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

/**
 * Creates a Supabase client with Service Role Key for server-side operations.
 *
 * This client has full admin access to the database and should only be used
 * in server-side code (+page.server.ts, +server.ts, hooks.server.ts).
 *
 * @throws {Error} If SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not set
 * @returns Supabase client instance
 */
export function getSupabaseServerClient() {
	const supabaseUrl = env.SUPABASE_URL;
	const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

	// Validate environment variables
	if (!supabaseUrl) {
		throw new Error('SUPABASE_URL is not set. Please add it to your .env file.');
	}

	if (!supabaseServiceRoleKey) {
		throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Please add it to your .env file.');
	}

	// Create and return Supabase client with Service Role Key
	return createClient(supabaseUrl, supabaseServiceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

/**
 * Gets the profile ID for a given role.
 * Used as fallback when created_by is not provided.
 *
 * @param role - Profile role ('me' or 'partner')
 * @returns Profile ID (UUID)
 * @throws {Error} If profile not found
 */
export async function getProfileIdByRole(role: 'me' | 'partner'): Promise<string> {
	const supabase = getSupabaseServerClient();

	const { data: profile, error } = await supabase
		.from('profiles')
		.select('id')
		.eq('role', role)
		.single();

	if (error || !profile) {
		throw new Error(`Failed to find profile with role '${role}': ${error?.message || 'not found'}`);
	}

	return profile.id;
}
