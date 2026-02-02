/**
 * Server-only transfers management functions.
 * Handles individual payment/transfer records for tracking multiple payments per month.
 */

import { getSupabaseServerClient, getProfileIdByRole } from './supabase.js';

export interface Transfer {
	id: string;
	monthId: string;
	amount: number;
	description: string | null;
	createdAt: string;
	createdBy: string | null;
}

/**
 * Lists all transfers for a given month.
 * 
 * @param monthId - The month ID (UUID)
 * @returns Array of transfers, sorted by created_at (desc)
 * @throws {Error} If database operation fails
 */
export async function listTransfers(monthId: string): Promise<Transfer[]> {
	const supabase = getSupabaseServerClient();

	const { data: transfers, error } = await supabase
		.from('transfers')
		.select('*')
		.eq('month_id', monthId)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch transfers: ${error.message}`);
	}

	// Normalize to Transfer type
	return (transfers || []).map((transfer) => ({
		id: transfer.id,
		monthId: transfer.month_id,
		amount: Number(transfer.amount),
		description: transfer.description,
		createdAt: transfer.created_at,
		createdBy: transfer.created_by
	}));
}

/**
 * Creates a new transfer.
 * 
 * @param monthId - The month ID (UUID)
 * @param input - Transfer data (amount, optional description, optional createdBy)
 * @returns Created transfer
 * @throws {Error} If validation fails or database operation fails
 */
export async function createTransfer(
	monthId: string,
	input: {
		amount: number;
		description?: string;
		createdBy?: string; // Optional: profile ID, defaults to 'me' if not provided
	}
): Promise<Transfer> {
	const supabase = getSupabaseServerClient();

	// Validation
	if (input.amount < 0) {
		throw new Error('Amount must be >= 0');
	}

	if (!Number.isFinite(input.amount)) {
		throw new Error('Amount must be a valid number');
	}

	// Determine created_by: use provided value or fallback to 'me' profile
	const createdBy = input.createdBy || await getProfileIdByRole('me');

	// Round amount to 2 decimals
	const roundedAmount = Math.round(input.amount * 100) / 100;

	// Create transfer
	const { data: newTransfer, error: createError } = await supabase
		.from('transfers')
		.insert({
			month_id: monthId,
			amount: roundedAmount,
			description: input.description?.trim() || null,
			created_by: createdBy
		})
		.select()
		.single();

	if (createError) {
		throw new Error(`Failed to create transfer: ${createError.message}`);
	}

	return {
		id: newTransfer.id,
		monthId: newTransfer.month_id,
		amount: Number(newTransfer.amount),
		description: newTransfer.description,
		createdAt: newTransfer.created_at,
		createdBy: newTransfer.created_by
	};
}

/**
 * Deletes a transfer.
 * 
 * @param transferId - The transfer ID (UUID)
 * @throws {Error} If database operation fails
 */
export async function deleteTransfer(transferId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	const { error } = await supabase.from('transfers').delete().eq('id', transferId);

	if (error) {
		throw new Error(`Failed to delete transfer: ${error.message}`);
	}
}

/**
 * Calculates the total of all transfers for a month.
 * 
 * @param monthId - The month ID (UUID)
 * @returns Total transfer amount (rounded to 2 decimals)
 * @throws {Error} If database operation fails
 */
export async function getTotalTransfers(monthId: string): Promise<number> {
	const transfers = await listTransfers(monthId);
	const total = transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
	return Math.round(total * 100) / 100;
}
