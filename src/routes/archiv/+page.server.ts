import { error, fail } from '@sveltejs/kit';
import { listClosedMonths, deleteClosedMonth } from '$lib/server/months.js';
import type { Actions, PageServerLoad } from './$types.js';

/**
 * Server-side load function for the archive page.
 */
export const load: PageServerLoad = async () => {
	try {
		// Load all closed months
		const closedMonths = await listClosedMonths(100); // Load up to 100 archived months

		return {
			closedMonths
		};
	} catch (err) {
		console.error('Error loading archive:', err);
		throw error(500, 'Failed to load archive');
	}
};

/**
 * Actions for the archive page
 */
export const actions: Actions = {
	deleteArchivedMonth: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId');

			if (!monthId || typeof monthId !== 'string') {
				return fail(400, { error: 'Month ID is required' });
			}

			await deleteClosedMonth(monthId);

			return { success: true };
		} catch (err) {
			console.error('Error deleting archived month:', err);
			return fail(500, { error: 'Failed to delete archived month' });
		}
	}
};
