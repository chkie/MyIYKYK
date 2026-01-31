/**
 * Manual month navigation actions
 * ADMIN ONLY - requires Christian's profile
 */

import { getSupabaseServerClient } from '$lib/server/supabase.js';
import { copyTemplatesToMonth } from '$lib/server/fixed-cost-templates.js';
import { fail, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

/**
 * Load function - verify admin access
 */
export const load: PageServerLoad = async () => {
	const supabase = getSupabaseServerClient();

	// Get all profiles
	const { data: profiles, error: profileError } = await supabase
		.from('profiles')
		.select('id, role, name')
		.order('role', { ascending: true });

	if (profileError) {
		throw error(500, `Database error: ${profileError.message}`);
	}

	// Find Christian's profile (role='me')
	const christianProfile = profiles?.find((p) => p.role === 'me');

	if (!christianProfile) {
		throw error(500, 'Christian profile not found in database');
	}

	// Get all months for display
	const { data: months } = await supabase
		.from('months')
		.select('id, year, month, status')
		.order('year', { ascending: false })
		.order('month', { ascending: false })
		.limit(24);

	return {
		christianProfile,
		months: months || []
	};
};

export const actions = {
	/**
	 * Create a specific month manually (for debugging/setup)
	 */
	createMonth: async ({ request }) => {
		const supabase = getSupabaseServerClient();
		const formData = await request.formData();
		
		const year = parseInt(formData.get('year') as string);
		const month = parseInt(formData.get('month') as string);

		if (!year || !month || month < 1 || month > 12) {
			return fail(400, { error: 'Ungültiges Jahr oder Monat' });
		}

		// Check if month already exists
		const { data: existing } = await supabase
			.from('months')
			.select('id, status')
			.eq('year', year)
			.eq('month', month)
			.single();

		if (existing) {
			// Month exists - close all others and open this one
			if (existing.status !== 'open') {
				// Close all open months
				await supabase
					.from('months')
					.update({ status: 'closed' })
					.eq('status', 'open');

				// Open this month
				await supabase
					.from('months')
					.update({ status: 'open' })
					.eq('year', year)
					.eq('month', month);
			}
			
			return { success: true, monthId: existing.id };
		}

		// Month doesn't exist - create it
		// Get private_balance_start from previous month
		let privateBalanceStart = 0;
		
		const { data: previousMonths } = await supabase
			.from('months')
			.select('private_balance_end, year, month')
			.order('year', { ascending: false })
			.order('month', { ascending: false })
			.limit(10);

		if (previousMonths && previousMonths.length > 0) {
			// Find the month immediately before target month
			for (const prevMonth of previousMonths) {
				const prevDate = new Date(prevMonth.year, prevMonth.month - 1);
				const targetDate = new Date(year, month - 1);
				
				if (prevDate < targetDate) {
					privateBalanceStart = prevMonth.private_balance_end ?? 0;
					break;
				}
			}
		}

		// Close all open months
		await supabase
			.from('months')
			.update({ status: 'closed' })
			.eq('status', 'open');

		// Create new month
		const { data: newMonth, error: createError } = await supabase
			.from('months')
			.insert({
				year,
				month,
				status: 'open',
				private_balance_start: privateBalanceStart,
				total_transfer_this_month: 0
			})
			.select()
			.single();

		if (createError) {
			return fail(500, { error: `Monat konnte nicht erstellt werden: ${createError.message}` });
		}

		// Copy templates
		await copyTemplatesToMonth(newMonth.id);

		return { success: true, monthId: newMonth.id };
	},

	/**
	 * Switch to existing month (close current, open target)
	 */
	switchMonth: async ({ request }) => {
		const supabase = getSupabaseServerClient();
		const formData = await request.formData();
		
		const monthId = formData.get('monthId') as string;

		if (!monthId) {
			return fail(400, { error: 'Monat-ID fehlt' });
		}

		// Close all open months
		await supabase
			.from('months')
			.update({ status: 'closed' })
			.eq('status', 'open');

		// Open target month
		const { error } = await supabase
			.from('months')
			.update({ status: 'open' })
			.eq('id', monthId);

		if (error) {
			return fail(500, { error: `Monat konnte nicht geöffnet werden: ${error.message}` });
		}

		return { success: true };
	}
} satisfies Actions;
