/**
 * Server-only month management functions.
 * Handles current month logic and ensures month_incomes exist.
 */

import { getSupabaseServerClient } from './supabase.js';
import { copyTemplatesToMonth } from './fixed-cost-templates.js';

/**
 * Gets or creates the current month entry.
 *
 * Logic:
 * 1. Check if there's an open month → return it
 * 2. If not, find last closed month
 * 3. Create NEXT month after last closed (or current calendar month if no closed months)
 *
 * @returns Current month row
 * @throws {Error} If database operation fails
 */
export async function getOrCreateCurrentMonth() {
	const supabase = getSupabaseServerClient();

	// 1. Try to find existing open month (any year/month)
	const { data: existingOpenMonth, error: openError } = await supabase
		.from('months')
		.select('*')
		.eq('status', 'open')
		.limit(1)
		.single();

	if (openError && openError.code !== 'PGRST116') {
		// PGRST116 = no rows found, which is ok
		throw new Error(`Failed to find open month: ${openError.message}`);
	}

	// If open month exists, return it
	if (existingOpenMonth) {
		console.log('✅ Found existing open month:', existingOpenMonth.id, `(${existingOpenMonth.year}-${existingOpenMonth.month})`);
		return existingOpenMonth;
	}

	// 2. No open month exists - need to create next month
	// Find last closed month to determine what month to create next
	const { data: lastClosedMonth, error: lastMonthError } = await supabase
		.from('months')
		.select('year, month, private_balance_end')
		.eq('status', 'closed')
		.order('year', { ascending: false })
		.order('month', { ascending: false })
		.limit(1)
		.single();

	if (lastMonthError && lastMonthError.code !== 'PGRST116') {
		throw new Error(`Failed to find last closed month: ${lastMonthError.message}`);
	}

	// 3. Calculate next month to create
	let nextYear: number;
	let nextMonth: number;
	let privateBalanceStart: number;

	if (lastClosedMonth) {
		// Create the month AFTER the last closed month
		nextMonth = lastClosedMonth.month + 1;
		nextYear = lastClosedMonth.year;

		// Handle year overflow (December → January)
		if (nextMonth > 12) {
			nextMonth = 1;
			nextYear++;
		}

		privateBalanceStart = lastClosedMonth.private_balance_end ?? 0;
		console.log('📅 Creating next month after', lastClosedMonth.year, lastClosedMonth.month, '→', nextYear, nextMonth);
	} else {
		// No closed months exist - create current calendar month
		const now = new Date();
		nextYear = now.getFullYear();
		nextMonth = now.getMonth() + 1; // JavaScript months are 0-based
		privateBalanceStart = 0;
		console.log('📅 Creating first month (calendar-based):', nextYear, nextMonth);
	}

	// 4. Create new month
	const { data: newMonth, error: createError } = await supabase
		.from('months')
		.insert({
			year: nextYear,
			month: nextMonth,
			status: 'open',
			private_balance_start: privateBalanceStart,
			total_transfer_this_month: 0
		})
		.select()
		.single();

	if (createError) {
		console.error('❌ Failed to create month:', createError);
		throw new Error(`Failed to create month: ${createError.message}`);
	}

	console.log('✅ New month created:', newMonth.id, `(${nextYear}-${nextMonth})`);

	// 5. Copy templates to this new month
	try {
		console.log('📋 Copying templates to new month...');
		await copyTemplatesToMonth(newMonth.id);
		console.log('✅ Templates copied successfully!');
	} catch (err) {
		console.error('❌ Failed to copy templates to new month:', err);
		// Don't throw - month creation succeeded, template copy failed (can be retried)
	}

	return newMonth;
}

/**
 * Ensures that month_incomes entries exist for all profiles.
 *
 * Logic:
 * 1. Get all profiles (me + partner)
 * 2. For each profile, check if month_income exists
 * 3. If missing, create with net_income=0
 * 4. Return all month_incomes for this month
 *
 * @param monthId - The month ID (UUID)
 * @returns Array of month_incomes rows for this month
 * @throws {Error} If database operation fails
 */
export async function ensureMonthIncomes(monthId: string) {
	const supabase = getSupabaseServerClient();

	// 1. Get all profiles
	const { data: profiles, error: profilesError } = await supabase
		.from('profiles')
		.select('id, role')
		.order('role', { ascending: true });

	if (profilesError) {
		throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
	}

	if (!profiles || profiles.length === 0) {
		throw new Error('No profiles found in database');
	}

	// 2. Get existing month_incomes for this month
	const { data: existingIncomes, error: incomesError } = await supabase
		.from('month_incomes')
		.select('*')
		.eq('month_id', monthId);

	if (incomesError) {
		throw new Error(`Failed to fetch month_incomes: ${incomesError.message}`);
	}

	const existingProfileIds = new Set((existingIncomes || []).map((income) => income.profile_id));

	// 3. Create missing month_incomes
	const missingProfiles = profiles.filter((profile) => !existingProfileIds.has(profile.id));

	if (missingProfiles.length > 0) {
		// Get last month's incomes to copy values
		const { data: lastMonthIncomes } = await supabase
			.from('month_incomes')
			.select('profile_id, net_income')
			.neq('month_id', monthId)
			.order('created_at', { ascending: false })
			.limit(profiles.length);

		// Map last incomes by profile_id
		const lastIncomesMap = new Map(
			(lastMonthIncomes || []).map((income) => [income.profile_id, income.net_income])
		);

		const incomesToInsert = missingProfiles.map((profile) => ({
			month_id: monthId,
			profile_id: profile.id,
			net_income: lastIncomesMap.get(profile.id) ?? 0
		}));

		const { error: insertError } = await supabase.from('month_incomes').insert(incomesToInsert);

		if (insertError) {
			throw new Error(`Failed to create month_incomes: ${insertError.message}`);
		}
	}

	// 4. Fetch and return all month_incomes for this month
	const { data: allIncomes, error: finalError } = await supabase
		.from('month_incomes')
		.select('*')
		.eq('month_id', monthId);

	if (finalError) {
		throw new Error(`Failed to fetch final month_incomes: ${finalError.message}`);
	}

	return allIncomes || [];
}

/**
 * Updates net income values for month_incomes.
 *
 * @param monthId - The month ID (UUID)
 * @param updates - Array of { profileId, netIncome } to update
 * @throws {Error} If validation fails or database operation fails
 */
export async function updateMonthIncomes(
	monthId: string,
	updates: Array<{ profileId: string; netIncome: number }>
) {
	const supabase = getSupabaseServerClient();

	// Validate all updates first
	for (const update of updates) {
		if (update.netIncome < 0) {
			throw new Error('Net income must be >= 0');
		}
		if (!Number.isFinite(update.netIncome)) {
			throw new Error('Net income must be a valid number');
		}
	}

	// Update each income (with rounding to 2 decimals)
	for (const update of updates) {
		const roundedIncome = Math.round(update.netIncome * 100) / 100;

		const { error: updateError } = await supabase
			.from('month_incomes')
			.update({ net_income: roundedIncome })
			.eq('month_id', monthId)
			.eq('profile_id', update.profileId);

		if (updateError) {
			throw new Error(
				`Failed to update income for profile ${update.profileId}: ${updateError.message}`
			);
		}
	}
}

/**
 * Closes a month by setting status to 'closed' and recording the final balance.
 *
 * @param monthId - The month ID (UUID)
 * @param privateBalanceEnd - The final private balance (can be negative)
 * @throws {Error} If validation fails or database operation fails
 */
export async function closeMonth(monthId: string, privateBalanceEnd: number) {
	const supabase = getSupabaseServerClient();

	// Validate privateBalanceEnd
	if (!Number.isFinite(privateBalanceEnd)) {
		throw new Error('Private balance end must be a valid number');
	}

	// Round to 2 decimals
	const roundedBalance = Math.round(privateBalanceEnd * 100) / 100;

	// Update month to closed status
	const { error: updateError } = await supabase
		.from('months')
		.update({
			status: 'closed',
			private_balance_end: roundedBalance,
			closed_at: new Date().toISOString()
		})
		.eq('id', monthId)
		.eq('status', 'open'); // Only close if currently open

	if (updateError) {
		throw new Error(`Failed to close month: ${updateError.message}`);
	}
}

/**
 * Lists closed months for archive display.
 *
 * @param limit - Maximum number of months to return (default: 12)
 * @returns Array of closed month records
 * @throws {Error} If database operation fails
 */
export async function listClosedMonths(limit: number = 12) {
	const supabase = getSupabaseServerClient();

	const { data: closedMonths, error } = await supabase
		.from('months')
		.select(
			'id, year, month, private_balance_start, private_balance_end, total_transfer_this_month, closed_at'
		)
		.eq('status', 'closed')
		.order('year', { ascending: false })
		.order('month', { ascending: false })
		.limit(limit);

	if (error) {
		throw new Error(`Failed to list closed months: ${error.message}`);
	}

	return closedMonths || [];
}

/**
 * Resets an open month to clean state for testing (DEV ONLY).
 *
 * WARNING: This deletes all data for the given month!
 * - Deletes all fixed categories and items
 * - Deletes all private expenses
 * - Resets month_incomes to 0
 * - Resets month fields to initial values
 * - Re-copies templates to month (so you start fresh with all standard fixed costs)
 *
 * @param monthId - The month ID (UUID)
 * @throws {Error} If database operation fails
 */
export async function resetOpenMonthForDev(monthId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	// 1. Get category IDs for this month
	const { data: categories, error: categoriesError } = await supabase
		.from('fixed_categories')
		.select('id')
		.eq('month_id', monthId);

	if (categoriesError) {
		throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
	}

	const categoryIds = (categories || []).map((cat) => cat.id);

	// 2. Delete fixed items (if any categories exist)
	if (categoryIds.length > 0) {
		const { error: deleteItemsError } = await supabase
			.from('fixed_items')
			.delete()
			.in('category_id', categoryIds);

		if (deleteItemsError) {
			throw new Error(`Failed to delete fixed items: ${deleteItemsError.message}`);
		}
	}

	// 3. Delete fixed categories
	const { error: deleteCategoriesError } = await supabase
		.from('fixed_categories')
		.delete()
		.eq('month_id', monthId);

	if (deleteCategoriesError) {
		throw new Error(`Failed to delete fixed categories: ${deleteCategoriesError.message}`);
	}

	// 4. Delete private expenses
	const { error: deleteExpensesError } = await supabase
		.from('private_expenses')
		.delete()
		.eq('month_id', monthId);

	if (deleteExpensesError) {
		throw new Error(`Failed to delete private expenses: ${deleteExpensesError.message}`);
	}

	// 5. Reset month_incomes to 0
	const { error: resetIncomesError } = await supabase
		.from('month_incomes')
		.update({ net_income: 0 })
		.eq('month_id', monthId);

	if (resetIncomesError) {
		throw new Error(`Failed to reset month incomes: ${resetIncomesError.message}`);
	}

	// 6. Reset month fields
	const { error: resetMonthError } = await supabase
		.from('months')
		.update({
			total_transfer_this_month: 0,
			private_balance_start: 0,
			private_balance_end: null
		})
		.eq('id', monthId)
		.eq('status', 'open');

	if (resetMonthError) {
		throw new Error(`Failed to reset month: ${resetMonthError.message}`);
	}

	// 7. Re-copy templates to this month (so you start fresh with all standard fixed costs)
	try {
		console.log('📋 Re-copying templates to reset month...');
		await copyTemplatesToMonth(monthId);
		console.log('✅ Templates re-copied successfully!');
	} catch (err) {
		console.error('❌ Failed to re-copy templates:', err);
		// Don't throw - reset succeeded, template copy can be retried
	}
}

/**
 * Deletes a closed month completely (DEV/TESTING).
 *
 * WARNING: This permanently deletes the month and all associated data!
 * - Deletes all fixed categories and items
 * - Deletes all private expenses
 * - Deletes all month_incomes
 * - Deletes the month record itself
 *
 * @param monthId - The month ID (UUID)
 * @throws {Error} If database operation fails or month is not closed
 */
export async function deleteClosedMonth(monthId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	// 1. Verify month is closed
	const { data: month, error: monthError } = await supabase
		.from('months')
		.select('status')
		.eq('id', monthId)
		.single();

	if (monthError) {
		throw new Error(`Failed to fetch month: ${monthError.message}`);
	}

	if (month.status !== 'closed') {
		throw new Error('Can only delete closed months');
	}

	// 2. Get category IDs for this month
	const { data: categories, error: categoriesError } = await supabase
		.from('fixed_categories')
		.select('id')
		.eq('month_id', monthId);

	if (categoriesError) {
		throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
	}

	const categoryIds = (categories || []).map((cat) => cat.id);

	// 3. Delete fixed items (if any categories exist)
	if (categoryIds.length > 0) {
		const { error: deleteItemsError } = await supabase
			.from('fixed_items')
			.delete()
			.in('category_id', categoryIds);

		if (deleteItemsError) {
			throw new Error(`Failed to delete fixed items: ${deleteItemsError.message}`);
		}
	}

	// 4. Delete fixed categories
	const { error: deleteCategoriesError } = await supabase
		.from('fixed_categories')
		.delete()
		.eq('month_id', monthId);

	if (deleteCategoriesError) {
		throw new Error(`Failed to delete fixed categories: ${deleteCategoriesError.message}`);
	}

	// 5. Delete private expenses
	const { error: deleteExpensesError } = await supabase
		.from('private_expenses')
		.delete()
		.eq('month_id', monthId);

	if (deleteExpensesError) {
		throw new Error(`Failed to delete private expenses: ${deleteExpensesError.message}`);
	}

	// 6. Delete month_incomes
	const { error: deleteIncomesError } = await supabase
		.from('month_incomes')
		.delete()
		.eq('month_id', monthId);

	if (deleteIncomesError) {
		throw new Error(`Failed to delete month incomes: ${deleteIncomesError.message}`);
	}

	// 7. Delete the month itself
	const { error: deleteMonthError } = await supabase
		.from('months')
		.delete()
		.eq('id', monthId)
		.eq('status', 'closed');

	if (deleteMonthError) {
		throw new Error(`Failed to delete month: ${deleteMonthError.message}`);
	}
}

/**
 * Deletes the current open month completely (DEV/TESTING).
 * 
 * WARNING: This permanently deletes the open month and all associated data!
 * Use this for complete app reset during development.
 * 
 * @throws {Error} If database operation fails
 */
export async function deleteOpenMonth(): Promise<void> {
	const supabase = getSupabaseServerClient();

	// 1. Find open month
	const { data: month, error: monthError } = await supabase
		.from('months')
		.select('id')
		.eq('status', 'open')
		.limit(1)
		.single();

	if (monthError) {
		if (monthError.code === 'PGRST116') {
			// No open month exists - that's ok
			return;
		}
		throw new Error(`Failed to find open month: ${monthError.message}`);
	}

	const monthId = month.id;

	// 2. Get category IDs for this month
	const { data: categories, error: categoriesError } = await supabase
		.from('fixed_categories')
		.select('id')
		.eq('month_id', monthId);

	if (categoriesError) {
		throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
	}

	const categoryIds = (categories || []).map((cat) => cat.id);

	// 3. Delete fixed items (if any categories exist)
	if (categoryIds.length > 0) {
		const { error: deleteItemsError } = await supabase
			.from('fixed_items')
			.delete()
			.in('category_id', categoryIds);

		if (deleteItemsError) {
			throw new Error(`Failed to delete fixed items: ${deleteItemsError.message}`);
		}
	}

	// 4. Delete fixed categories
	const { error: deleteCategoriesError } = await supabase
		.from('fixed_categories')
		.delete()
		.eq('month_id', monthId);

	if (deleteCategoriesError) {
		throw new Error(`Failed to delete fixed categories: ${deleteCategoriesError.message}`);
	}

	// 5. Delete private expenses
	const { error: deleteExpensesError } = await supabase
		.from('private_expenses')
		.delete()
		.eq('month_id', monthId);

	if (deleteExpensesError) {
		throw new Error(`Failed to delete private expenses: ${deleteExpensesError.message}`);
	}

	// 6. Delete month_incomes
	const { error: deleteIncomesError } = await supabase
		.from('month_incomes')
		.delete()
		.eq('month_id', monthId);

	if (deleteIncomesError) {
		throw new Error(`Failed to delete month incomes: ${deleteIncomesError.message}`);
	}

	// 7. Delete the month itself
	const { error: deleteMonthError } = await supabase
		.from('months')
		.delete()
		.eq('id', monthId)
		.eq('status', 'open');

	if (deleteMonthError) {
		throw new Error(`Failed to delete month: ${deleteMonthError.message}`);
	}

	console.log('✅ Open month deleted completely');
}

/**
 * Deletes ALL months from the system (DEV/TESTING).
 * 
 * WARNING: This is a FULL RESET! Deletes everything:
 * - All open AND closed months
 * - All fixed categories and items
 * - All private expenses
 * - All month_incomes
 * 
 * Use this to reset the app to initial state.
 * 
 * @throws {Error} If database operation fails
 */
export async function deleteAllMonths(): Promise<void> {
	const supabase = getSupabaseServerClient();

	// 1. Get ALL months
	const { data: months, error: monthsError } = await supabase
		.from('months')
		.select('id');

	if (monthsError) {
		throw new Error(`Failed to fetch months: ${monthsError.message}`);
	}

	if (!months || months.length === 0) {
		console.log('✅ No months to delete');
		return;
	}

	const monthIds = months.map(m => m.id);

	// 2. Get ALL category IDs for these months
	const { data: categories, error: categoriesError } = await supabase
		.from('fixed_categories')
		.select('id')
		.in('month_id', monthIds);

	if (categoriesError) {
		throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
	}

	const categoryIds = (categories || []).map((cat) => cat.id);

	// 3. Delete ALL fixed items
	if (categoryIds.length > 0) {
		const { error: deleteItemsError } = await supabase
			.from('fixed_items')
			.delete()
			.in('category_id', categoryIds);

		if (deleteItemsError) {
			throw new Error(`Failed to delete fixed items: ${deleteItemsError.message}`);
		}
	}

	// 4. Delete ALL fixed categories
	const { error: deleteCategoriesError } = await supabase
		.from('fixed_categories')
		.delete()
		.in('month_id', monthIds);

	if (deleteCategoriesError) {
		throw new Error(`Failed to delete fixed categories: ${deleteCategoriesError.message}`);
	}

	// 5. Delete ALL private expenses
	const { error: deleteExpensesError } = await supabase
		.from('private_expenses')
		.delete()
		.in('month_id', monthIds);

	if (deleteExpensesError) {
		throw new Error(`Failed to delete private expenses: ${deleteExpensesError.message}`);
	}

	// 6. Delete ALL month_incomes
	const { error: deleteIncomesError } = await supabase
		.from('month_incomes')
		.delete()
		.in('month_id', monthIds);

	if (deleteIncomesError) {
		throw new Error(`Failed to delete month incomes: ${deleteIncomesError.message}`);
	}

	// 7. Delete ALL months
	const { error: deleteMonthsError } = await supabase
		.from('months')
		.delete()
		.in('id', monthIds);

	if (deleteMonthsError) {
		throw new Error(`Failed to delete months: ${deleteMonthsError.message}`);
	}

	console.log(`✅ Deleted ${months.length} month(s) completely`);
}

/**
 * Creates a specific month (for initial setup or testing).
 * 
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Created month record
 * @throws {Error} If validation fails or database operation fails
 */
export async function createSpecificMonth(year: number, month: number) {
	const supabase = getSupabaseServerClient();

	// Validate inputs
	if (!Number.isInteger(year) || year < 2000 || year > 2100) {
		throw new Error('Invalid year (must be 2000-2100)');
	}
	if (!Number.isInteger(month) || month < 1 || month > 12) {
		throw new Error('Invalid month (must be 1-12)');
	}

	// Check if month already exists
	const { data: existingMonth, error: checkError } = await supabase
		.from('months')
		.select('id')
		.eq('year', year)
		.eq('month', month)
		.limit(1)
		.single();

	if (checkError && checkError.code !== 'PGRST116') {
		throw new Error(`Failed to check existing month: ${checkError.message}`);
	}

	if (existingMonth) {
		throw new Error(`Month ${year}-${month} already exists`);
	}

	// Create the month
	const { data: newMonth, error: createError } = await supabase
		.from('months')
		.insert({
			year,
			month,
			status: 'open',
			private_balance_start: 0,
			total_transfer_this_month: 0
		})
		.select()
		.single();

	if (createError) {
		throw new Error(`Failed to create month: ${createError.message}`);
	}

	console.log(`✅ Created month: ${year}-${month} (${newMonth.id})`);

	// Copy templates to this new month
	try {
		console.log('📋 Copying templates to new month...');
		await copyTemplatesToMonth(newMonth.id);
		console.log('✅ Templates copied successfully!');
	} catch (err) {
		console.error('❌ Failed to copy templates:', err);
		// Don't throw - month creation succeeded
	}

	return newMonth;
}
