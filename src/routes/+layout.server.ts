import { getSupabaseServerClient } from '$lib/server/supabase';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const supabase = getSupabaseServerClient();
	
	// Check if user is authenticated
	const isAuthenticated = cookies.get('auth') === 'ok';
	
	// Fetch profiles for selection (only if authenticated)
	const { data: profiles } = isAuthenticated 
		? await supabase.from('profiles').select('id, name, role').order('role', { ascending: true })
		: { data: null };
	
	return {
		isAuthenticated,
		profiles: profiles || []
	};
};
