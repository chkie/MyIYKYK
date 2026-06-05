import { json, error } from '@sveltejs/kit';
import { getSupabaseServerClient } from '$lib/server/supabase.js';
import { getMonthHistory } from '$lib/server/history.js';
import type { RequestHandler } from './$types.js';

/**
 * Returns the full flat entry list of a single closed month (archive detail).
 *
 * Lazy-loaded by the archive accordion the first time a month is expanded, so the
 * archive list itself stays cheap (one query) even with many closed months.
 *
 * Auth: covered by the global hook (every non-/login route requires the auth cookie).
 */
export const GET: RequestHandler = async ({ params }) => {
	const monthId = params.id;
	if (!monthId) {
		throw error(400, 'Month ID is required');
	}

	try {
		const supabase = getSupabaseServerClient();

		// Profiles supply the creator name map for getMonthHistory.
		const { data: profiles } = await supabase.from('profiles').select('id, name');

		// year/month are part of getMonthHistory's stable signature but currently
		// unused (no month-boundary filter yet) → pass 0/0.
		const history = await getMonthHistory(monthId, 0, 0, profiles ?? [], {
			includeFull: true
		});

		return json({ positions: history.fullMonthList ?? [] });
	} catch (err) {
		console.error('Error loading archive month detail:', err);
		throw error(500, 'Failed to load month detail');
	}
};
