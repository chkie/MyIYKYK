/**
 * Server-only private expenses management functions.
 * Handles private expenses (Christian's debt tracking) and month transfer.
 */

import { getSupabaseServerClient } from './supabase.js';

// Simple date format validation (YYYY-MM-DD)
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lists all private expenses for a given month.
 * 
 * @param monthId - The month ID (UUID)
 * @returns Array of private expenses, sorted by date (desc) then created_at (desc)
 * @throws {Error} If database operation fails
 */
export async function listPrivateExpenses(monthId: string) {
	const supabase = getSupabaseServerClient();

	const { data: expenses, error } = await supabase
		.from('private_expenses')
		.select('*')
		.eq('month_id', monthId)
		.order('date', { ascending: false })
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch private expenses: ${error.message}`);
	}

	// Normalize amount to number
	return (expenses || []).map((expense) => ({
		id: expense.id,
		monthId: expense.month_id,
		date: expense.date,
		description: expense.description,
		amount: Number(expense.amount)
	}));
}

/**
 * Creates a new private expense.
 * 
 * @param monthId - The month ID (UUID)
 * @param input - Expense data (dateISO, description, amount)
 * @returns Created expense row
 * @throws {Error} If validation fails or database operation fails
 */
export async function createPrivateExpense(
	monthId: string,
	input: {
		dateISO: string;
		description: string;
		amount: number;
	}
) {
	const supabase = getSupabaseServerClient();

	// Validation
	if (!DATE_ISO_REGEX.test(input.dateISO)) {
		throw new Error('Date must be in format YYYY-MM-DD');
	}

	const trimmedDescription = input.description.trim();
	if (!trimmedDescription) {
		throw new Error('Description cannot be empty');
	}

	if (input.amount < 0) {
		throw new Error('Amount must be >= 0');
	}

	// Create expense
	const { data: newExpense, error: createError } = await supabase
		.from('private_expenses')
		.insert({
			month_id: monthId,
			date: input.dateISO,
			description: trimmedDescription,
			amount: input.amount
		})
		.select()
		.single();

	if (createError) {
		throw new Error(`Failed to create expense: ${createError.message}`);
	}

	return {
		id: newExpense.id,
		monthId: newExpense.month_id,
		date: newExpense.date,
		description: newExpense.description,
		amount: Number(newExpense.amount)
	};
}

/**
 * Deletes a private expense.
 * 
 * @param expenseId - The expense ID (UUID)
 * @throws {Error} If database operation fails
 */
export async function deletePrivateExpense(expenseId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	const { error } = await supabase.from('private_expenses').delete().eq('id', expenseId);

	if (error) {
		throw new Error(`Failed to delete expense: ${error.message}`);
	}
}

/**
 * Updates the total transfer amount for a month.
 * 
 * @param monthId - The month ID (UUID)
 * @param totalTransfer - The total transfer amount
 * @throws {Error} If validation fails or database operation fails
 */
export async function updateMonthTransfer(
	monthId: string,
	totalTransfer: number
): Promise<void> {
	const supabase = getSupabaseServerClient();

	// Validation
	if (totalTransfer < 0) {
		throw new Error('Total transfer must be >= 0');
	}

	const { error } = await supabase
		.from('months')
		.update({ total_transfer_this_month: totalTransfer })
		.eq('id', monthId);

	if (error) {
		throw new Error(`Failed to update month transfer: ${error.message}`);
	}
}

