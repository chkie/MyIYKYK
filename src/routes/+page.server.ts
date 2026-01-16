import { error, fail, redirect } from '@sveltejs/kit';
import { getSupabaseServerClient } from '$lib/server/supabase.js';
import { getOrCreateCurrentMonth, ensureMonthIncomes, updateMonthIncomes, closeMonth, listClosedMonths, resetOpenMonthForDev, deleteClosedMonth } from '$lib/server/months.js';
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
import { calculateMonth } from '$lib/domain';
import type { Actions, PageServerLoad } from './$types.js';

/**
 * Server-side load function for the home page.
 * 
 * Gets or creates current month and ensures month_incomes exist.
 */
export const load: PageServerLoad = async () => {
	try {
		// Get server-only Supabase client
		const supabase = getSupabaseServerClient();

		// 1. Get or create current month
		const month = await getOrCreateCurrentMonth();

		// 2. Ensure month_incomes exist for all profiles
		const incomes = await ensureMonthIncomes(month.id);

		// 3. Get profiles for display (role + name + id)
		const { data: profiles, error: profilesError } = await supabase
			.from('profiles')
			.select('id, role, name')
			.order('role', { ascending: true });

		if (profilesError) {
			console.error('Supabase error:', profilesError);
			throw error(500, `Database error: ${profilesError.message}`);
		}

		// 4. Get fixed categories with items
		const fixedCategories = await listFixedCategoriesWithItems(month.id);

		// 5. Get private expenses
		const privateExpenses = await listPrivateExpenses(month.id);

		// 6. Map DB data to Domain types and calculate
		
		// Find profiles
		const meProfile = profiles?.find((p) => p.role === 'me');
		const partnerProfile = profiles?.find((p) => p.role === 'partner');

		// Get incomes
		const meIncome = incomes.find((i) => i.profile_id === meProfile?.id);
		const partnerIncome = incomes.find((i) => i.profile_id === partnerProfile?.id);

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
					splitMode: item.splitMode
				}))
			})),
			privateExpenses: privateExpenses.map((exp) => ({
				id: exp.id,
				dateISO: exp.date, // DB field 'date' → domain field 'dateISO'
				description: exp.description,
				amount: Number(exp.amount)
			})),
			privateBalanceStart: Number(month.private_balance_start || 0),
			totalTransferThisMonth: Number(month.total_transfer_this_month || 0)
		};

		// Calculate month
		const computed = calculateMonth(monthInputs);

		// 7. Load closed months for archive
		const closedMonths = await listClosedMonths(12);

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
			computed,
			closedMonths
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

			// Redirect to reload data
			throw redirect(303, '/');

		} catch (err) {
			// Handle redirect
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}

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
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
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
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
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
			const splitMode = formData.get('splitMode')?.toString() as 'income' | 'me' | 'partner' | 'half';

			if (!categoryId || !label) {
				return fail(400, { error: 'Category ID and label are required' });
			}

			if (isNaN(amount) || amount < 0) {
				return fail(400, { error: 'Invalid amount' });
			}

			await createFixedItem(categoryId, { label, amount, splitMode });
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
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
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
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
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
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

			if (!monthId || !dateISO || !description) {
				return fail(400, { error: 'Month ID, date, and description are required' });
			}

			if (isNaN(amount) || amount < 0) {
				return fail(400, { error: 'Invalid amount' });
			}

			await createPrivateExpense(monthId, { dateISO, description, amount });
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error adding expense:', err);
			return fail(500, { 
				error: err instanceof Error ? err.message : 'Failed to add expense' 
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
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error deleting expense:', err);
			return fail(500, { 
				error: err instanceof Error ? err.message : 'Failed to delete expense' 
			});
		}
	},

	/**
	 * Save month transfer amount.
	 */
	saveTransfer: async ({ request }) => {
		try {
			const formData = await request.formData();
			const monthId = formData.get('monthId')?.toString();
			const totalTransfer = parseFloat(formData.get('totalTransfer')?.toString() || '0');

			if (!monthId) {
				return fail(400, { error: 'Month ID is required' });
			}

			if (isNaN(totalTransfer) || totalTransfer < 0) {
				return fail(400, { error: 'Invalid transfer amount' });
			}

			await updateMonthTransfer(monthId, totalTransfer);
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error saving transfer:', err);
			return fail(500, { 
				error: err instanceof Error ? err.message : 'Failed to save transfer' 
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
			// Redirect to home - will create new month automatically
			throw redirect(303, '/');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
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
	}
};

