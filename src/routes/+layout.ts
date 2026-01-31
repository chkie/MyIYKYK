import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
	return {
		isAuthenticated: data?.isAuthenticated ?? false,  // ← FIX: Durchreichen!
		profiles: data?.profiles || []
	};
};
