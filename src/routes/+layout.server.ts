import { getSupabaseServerClient } from '$lib/server/supabase';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	// Check if user is authenticated
	const isAuthenticated = cookies.get('auth') === 'ok';
	
	// Early return if not authenticated
	if (!isAuthenticated) {
		return {
			isAuthenticated,
			profiles: []
		};
	}
	
	// Only get Supabase client if authenticated
	const supabase = getSupabaseServerClient();
	
	// Fetch profiles for selection
	const { data: profiles } = await supabase.from('profiles').select('id, name, role').order('role', { ascending: true });
	
	return {
		isAuthenticated,
		profiles: profiles || []
	};
};
