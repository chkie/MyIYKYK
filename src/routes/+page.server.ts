import { error, fail, redirect } from '@sveltejs/kit';
import { getSupabaseServerClient } from '$lib/server/supabase.js';
import {
	getOrCreateCurrentMonth,
	ensureMonthIncomes,
	updateMonthIncomes,
	updateMonthBalanceStart,
	closeMonth,
	listClosedMonths,
	resetOpenMonthForDev,
	deleteClosedMonth,
	deleteAllMonths
} from '$lib/server/months.js';
import { env } from '$env/dynamic/private';
import {
	listFixedCategoriesWithItems,
	createFixedCategory,
	deleteFixedCategory,
	createFixedItem,
	updateFixedItem,
	deleteFixedItem
} from '$lib/server/fixed-costs.js';
import {
	listPrivateExpenses,
	createPrivateExpense,
	deletePrivateExpense,
	updateMonthTransfer
} from '$lib/server/private-expenses.js';
import {
	listTransfers,
	createTransfer,
	deleteTransfer,
	getTotalTransfers
} from '$lib/server/transfers.js';
import { getMonthHistory } from '$lib/server/history.js';
import { calculateMonth } from '$lib/domain/index.js';
import type { Actions, PageServerLoad } from './$types.js';

/**
 * Server-side load function for the home page.
 *
 * Gets or creates current month and ensures month_incomes exist.
 */
export const load: PageServerLoad = async ({ url }) => {
	try {
		// Get server-only Supabase client
		const supabase = getSupabaseServerClient();

		// 1. Get or create current month (MUST be first - needed for month.id)
		const month = await getOrCreateCurrentMonth();

		// 2. Ensure month_incomes exist for all profiles (depends on month.id)
		const incomes = await ensureMonthIncomes(month.id);

		// Check if full history is requested
		const showFullHistory = url.searchParams.get('history') === 'full';

		// 3-8. PARALLEL QUERIES (all depend on month.id but not on each other)
		const [profilesResult, fixedCategories, privateExpenses, transfers, closedMonths, history] = await Promise.all([
			supabase.from('profiles').select('id, role, name').order('role', { ascending: true }),
			listFixedCategoriesWithItems(month.id),
			listPrivateExpenses(month.id),
			listTransfers(month.id),
			listClosedMonths(12),
			getMonthHistory(month.id, month.year, month.month, { includeFull: showFullHistory })
		]);

		// Handle profiles error
		if (profilesResult.error) {
			console.error('Supabase error:', profilesResult.error);
			throw error(500, `Database error: ${profilesResult.error.message}`);
		}

		const profiles = profilesResult.data;
		
		// DEBUG: Log what we got
		console.log('🔍 DEBUG - Fixed Categories loaded:', {
			monthId: month.id,
			categoriesCount: fixedCategories.length,
			categories: fixedCategories.map(c => ({
				label: c.label,
				itemsCount: c.items.length,
				items: c.items.map(i => i.label)
			}))
		});

		// 8. Map DB data to Domain types and calculate

		// Find profiles
		const meProfile = profiles?.find((p) => p.role === 'me');
		const partnerProfile = profiles?.find((p) => p.role === 'partner');

		// Get incomes
		const meIncome = incomes.find((i) => i.profile_id === meProfile?.id);
		const partnerIncome = incomes.find((i) => i.profile_id === partnerProfile?.id);

		// Calculate total transfers (sum of all transfer records)
		const totalTransfersAmount = (transfers || []).reduce((sum, t) => sum + t.amount, 0);

		// Build MonthInputs for domain calculation
		const monthInputs = {
			me: {
				role: 'me' as const,
				name: meProfile?.name || 'Me',
				netIncome: Number(meIncome?.net_income || 0)
			},
			partner: {
				role: 'partner' as const,
				name: partnerProfile?.name || 'Partner',
				netIncome: Number(partnerIncome?.net_income || 0)
			},
			fixedCategories: fixedCategories.map((cat) => ({
				id: cat.id,
				label: cat.label,
				items: cat.items.map((item) => ({
					id: item.id,
					label: item.label,
					amount: Number(item.amount),
					// Legacy: convert 'half' to 'income' (half mode was removed)
					splitMode: (item.splitMode === 'half' ? 'income' : item.splitMode) as 'income' | 'me' | 'partner'
				}))
			})),
			privateExpenses: privateExpenses.map((exp) => ({
				id: exp.id,
				dateISO: exp.date, // DB field 'date' → domain field 'dateISO'
				description: exp.description,
				amount: Number(exp.amount)
			})),
			privateBalanceStart: Number(month.private_balance_start || 0),
			prepaymentThisMonth: totalTransfersAmount // Use sum of transfers instead of single field
		};

		// Calculate month
		const computed = calculateMonth(monthInputs);

		// Return data for the page
		return {
			month: {
				id: month.id,
				year: month.year,
				month: month.month,
				status: month.status,
				private_balance_start: month.private_balance_start,
				total_transfer_this_month: month.total_transfer_this_month
			},
			incomes,
			profiles: profiles || [],
			fixedCategories,
			privateExpenses,
			transfers,
			computed,
			closedMonths,
			history
		};
	} catch (err) {
		// Handle unexpected errors
		console.error('Unexpected error in load function:', err);

		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Wrap other errors
		throw error(500, 'Failed to load month data');
	}
};
/**
 * Server actions for the home page.
 */
export const actions: Actions = {
	/**
	 * Save income values for the current month.
	 */
	saveIncomes: async ({ request }) => {
		try {
			const formData = await request.formData();

			// Get monthId
			const monthId = formData.get('monthId')?.toString();
			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			// Get all income fields (income_<profileId>)
			const updates: Array<{ profileId: string; netIncome: number }> = [];

			for (const [key, value] of formData.entries()) {
				if (key.startsWith('income_')) {
					const profileId = key.replace('income_', '');
					const netIncome = parseFloat(value.toString());

					// Validate
					if (isNaN(netIncome)) {
						return fail(400, {
							error: `Invalid income value for profile ${profileId}`
						});
					}

					if (netIncome < 0) {
						return fail(400, {
							error: 'Income must be >= 0'
						});
					}

					updates.push({ profileId, netIncome });
				}
			}

			// Check we have updates
			if (updates.length === 0) {
				return fail(400, { error: 'No income values provided' });
			}

			// Update incomes
			await updateMonthIncomes(monthId, updates);

			// Success - no redirect needed, SvelteKit will invalidate and reload data
			return { success: true };
		} catch (err) {
			// Handle other errors
			console.error('Error saving incomes:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to save incomes'
			});
		}
	},

	/**
	 * Add a new fixed category.
	 */
	addCategory: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();
			const label = formData.get('label')?.toString();

			if (!monthId || !label) {
				return fail(400, { error: 'Month ID and label are required' });
			}

			await createFixedCategory(monthId, label);
			return { success: true };
		} catch (err) {
			console.error('Error adding category:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to add category'
			});
		}
	},

	/**
	 * Delete a fixed category.
	 */
	deleteCategory: async ({ request }) => {
		try {
			const formData = await request.formData();
			const categoryId = formData.get('categoryId')?.toString();

			if (!categoryId) {
				return fail(400, { error: 'Category ID is required' });
			}

			await deleteFixedCategory(categoryId);
			return { success: true };
		} catch (err) {
			console.error('Error deleting category:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to delete category'
			});
		}
	},

	/**
	 * Add a new fixed item to a category.
	 */
	addItem: async ({ request }) => {
		try {
			const formData = await request.formData();
			const categoryId = formData.get('categoryId')?.toString();
			const label = formData.get('label')?.toString();
			const amount = parseFloat(formData.get('amount')?.toString() || '0');
			const createdBy = formData.get('createdBy')?.toString();
			const splitMode = formData.get('splitMode')?.toString() as
				| 'income'
				| 'me'
				| 'partner'
				| 'half';

			if (!categoryId || !label) {
				return fail(400, { error: 'Category ID and label are required' });
			}

			if (isNaN(amount) || amount < 0) {
				return fail(400, { error: 'Invalid amount' });
			}

			await createFixedItem(categoryId, { label, amount, splitMode, createdBy });
			return { success: true };
		} catch (err) {
			console.error('Error adding item:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to add item'
			});
		}
	},

	/**
	 * Update a fixed item.
	 */
	updateItem: async ({ request }) => {
		try {
			const formData = await request.formData();
			const itemId = formData.get('itemId')?.toString();

			if (!itemId) {
				return fail(400, { error: 'Item ID is required' });
			}

			const patch: any = {};

			// Check for label update
			const label = formData.get('label')?.toString();
			if (label !== null && label !== undefined) {
				patch.label = label;
			}

			// Check for amount update
			const amountStr = formData.get('amount')?.toString();
			if (amountStr !== null && amountStr !== undefined) {
				const amount = parseFloat(amountStr);
				if (isNaN(amount) || amount < 0) {
					return fail(400, { error: 'Invalid amount' });
				}
				patch.amount = amount;
			}

			// Check for splitMode update
			const splitMode = formData.get('splitMode')?.toString();
			if (splitMode) {
				patch.splitMode = splitMode as 'income' | 'me' | 'partner' | 'half';
			}

			await updateFixedItem(itemId, patch);
			return { success: true };
		} catch (err) {
			console.error('Error updating item:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to update item'
			});
		}
	},

	/**
	 * Delete a fixed item.
	 */
	deleteItem: async ({ request }) => {
		try {
			const formData = await request.formData();
			const itemId = formData.get('itemId')?.toString();

			if (!itemId) {
				return fail(400, { error: 'Item ID is required' });
			}

			await deleteFixedItem(itemId);
			return { success: true };
		} catch (err) {
			console.error('Error deleting item:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to delete item'
			});
		}
	},

	/**
	 * Add a new private expense.
	 */
	addPrivateExpense: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();
			const dateISO = formData.get('dateISO')?.toString();
			const description = formData.get('description')?.toString();
			const amount = parseFloat(formData.get('amount')?.toString() || '0');
			const createdBy = formData.get('createdBy')?.toString(); // ← ADD: Get createdBy from form

			if (!monthId || !dateISO || !description) {
				return fail(400, { error: 'Month ID, date, and description are required' });
			}

			if (isNaN(amount) || amount < 0) {
				return fail(400, { error: 'Invalid amount' });
			}

			await createPrivateExpense(monthId, { 
				dateISO, 
				description, 
				amount,
				createdBy // ← ADD: Pass createdBy to function
			});
			return { success: true };
		} catch (err) {
			console.error('Error adding expense:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to add expense'
			});
		}
	},

	/**
	 * Update a private expense.
	 */
	updatePrivateExpense: async ({ request }) => {
		try {
			const formData = await request.formData();
			const expenseId = formData.get('expenseId')?.toString();
			const dateISO = formData.get('dateISO')?.toString();
			const description = formData.get('description')?.toString();
			const amount = parseFloat(formData.get('amount')?.toString() || '0');

			if (!expenseId || !dateISO || !description) {
				return fail(400, { error: 'Expense ID, date, and description are required' });
			}

			if (isNaN(amount) || amount < 0) {
				return fail(400, { error: 'Invalid amount' });
			}

			// Update expense via private-expenses module
			const supabase = getSupabaseServerClient();
			const { error: updateError } = await supabase
				.from('private_expenses')
				.update({
					date: dateISO,
					description,
					amount
				})
				.eq('id', expenseId);

			if (updateError) {
				throw new Error(`Failed to update expense: ${updateError.message}`);
			}

			return { success: true };
		} catch (err) {
			console.error('Error updating expense:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to update expense'
			});
		}
	},

	/**
	 * Delete a private expense.
	 */
	deletePrivateExpense: async ({ request }) => {
		try {
			const formData = await request.formData();
			const expenseId = formData.get('expenseId')?.toString();

			if (!expenseId) {
				return fail(400, { error: 'Expense ID is required' });
			}

			await deletePrivateExpense(expenseId);
			return { success: true };
		} catch (err) {
			console.error('Error deleting expense:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to delete expense'
			});
		}
	},

	/**
	 * Save month prepayment amount.
	 */
	savePrepayment: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();
			const prepayment = parseFloat(formData.get('prepayment')?.toString() || '0');

			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			if (isNaN(prepayment) || prepayment < 0) {
				return fail(400, { error: 'Invalid prepayment amount' });
			}

			await updateMonthTransfer(monthId, prepayment);
			return { success: true };
		} catch (err) {
			console.error('Error saving prepayment:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to save prepayment'
			});
		}
	},

	/**
	 * Save month starting balance (typically for the first month).
	 */
	saveBalanceStart: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();
			const balanceStart = parseFloat(formData.get('balanceStart')?.toString() || '0');

			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			if (isNaN(balanceStart)) {
				return fail(400, { error: 'Invalid balance start amount' });
			}

			await updateMonthBalanceStart(monthId, balanceStart);
			return { success: true };
		} catch (err) {
			console.error('Error saving balance start:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to save balance start'
			});
		}
	},

	/**
	 * Add a new transfer/payment.
	 */
	addTransfer: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();
			const amount = parseFloat(formData.get('amount')?.toString() || '0');
			const description = formData.get('description')?.toString();
			const createdBy = formData.get('createdBy')?.toString();

			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			if (isNaN(amount) || amount < 0) {
				return fail(400, { error: 'Invalid amount' });
			}

			await createTransfer(monthId, { amount, description, createdBy });
			return { success: true };
		} catch (err) {
			console.error('Error adding transfer:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to add transfer'
			});
		}
	},

	/**
	 * Delete a transfer.
	 */
	deleteTransfer: async ({ request }) => {
		try {
			const formData = await request.formData();
			const transferId = formData.get('transferId')?.toString();

			if (!transferId) {
				return fail(400, { error: 'Transfer ID is required' });
			}

			await deleteTransfer(transferId);
			return { success: true };
		} catch (err) {
			console.error('Error deleting transfer:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to delete transfer'
			});
		}
	},

	/**
	 * Close the current month.
	 */
	closeMonth: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();
			const privateBalanceEnd = parseFloat(formData.get('privateBalanceEnd')?.toString() || '0');

			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			if (!Number.isFinite(privateBalanceEnd)) {
				return fail(400, { error: 'Invalid balance end value' });
			}

		await closeMonth(monthId, privateBalanceEnd);
		// Return success - user can manually reload to see next month
		return { success: true, monthClosed: true };
	} catch (err) {
		console.error('Error closing month:', err);
		return fail(500, {
			error: err instanceof Error ? err.message : 'Failed to close month'
		});
	}
	},

	/**
	 * Reset current month (DEV ONLY) - removes all data for testing.
	 */
	resetMonthDev: async ({ request }) => {
		// Guard: Only allow in development
		if (env.NODE_ENV === 'production') {
			return fail(403, { error: 'Not allowed in production' });
		}

		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();

			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			await resetOpenMonthForDev(monthId);
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error resetting month:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to reset month'
			});
		}
	},

	/**
	 * Delete a closed month from archive (DEV ONLY).
	 */
	deleteArchivedMonth: async ({ request }) => {
		// Guard: Only allow in development
		if (env.NODE_ENV === 'production') {
			return fail(403, { error: 'Not allowed in production' });
		}

		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();

			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			await deleteClosedMonth(monthId);
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error deleting archived month:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to delete archived month'
			});
		}
	},

	/**
	 * Full Reset: Delete ALL months and data (DEV ONLY).
	 * After this, the app will start fresh with current calendar month.
	 */
	fullResetDev: async () => {
		// Guard: Only allow in development
		if (env.NODE_ENV === 'production') {
			return fail(403, { error: 'Not allowed in production' });
		}

		try {
			await deleteAllMonths();
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error in full reset:', err);
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to perform full reset'
			});
		}
	}
};
