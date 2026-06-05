/**
 * TEMPORARY: History without month boundary filter
 */
import { getSupabaseServerClient } from './supabase.js';

export interface HistoryPosition {
	id: string;
	type: 'private_expense' | 'fixed_item' | 'transfer';
	description: string;
	amount: number;
	createdAt: string;
	createdBy: string | null;
	createdByName: string | null;
}

export interface HistoryResult {
	last5: HistoryPosition[];
	totalCount: number;
	fullMonthList?: HistoryPosition[];
}

export async function getMonthHistory(
	monthId: string,
	// year/month are part of the stable signature but currently unused
	// (history has no month-boundary filter yet — see file header).
	year: number,
	month: number,
	profiles: Array<{ id: string; name: string }>,
	options: { includeFull?: boolean } = {}
): Promise<HistoryResult> {
	const supabase = getSupabaseServerClient();

	// 1. Build name map from profiles passed in by the caller (root load) —
	//    avoids a redundant profiles fetch per request.
	const profileMap = new Map<string, string>();
	profiles.forEach((p) => profileMap.set(p.id, p.name));

	// 2-4. Fetch independent sources in parallel (expenses, categories, transfers).
	const [expensesResult, categoriesResult, transfersResult] = await Promise.all([
		supabase
			.from('private_expenses')
			.select('id, description, amount, created_at, created_by')
			.eq('month_id', monthId)
			.order('created_at', { ascending: false }),
		supabase.from('fixed_categories').select('id').eq('month_id', monthId),
		supabase
			.from('transfers')
			.select('id, amount, description, created_at, created_by')
			.eq('month_id', monthId)
			.order('created_at', { ascending: false })
	]);

	const { data: expenses, error: expensesError } = expensesResult;
	if (expensesError) {
		throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
	}

	const { data: transfersData, error: transfersError } = transfersResult;
	if (transfersError) {
		throw new Error(`Failed to fetch transfers: ${transfersError.message}`);
	}

	// Fixed items depend on the category IDs → fetched after the parallel batch.
	const categoryIds = (categoriesResult.data || []).map((c) => c.id);
	type FixedItemRow = {
		id: string;
		label: string;
		amount: number;
		created_at: string;
		created_by: string | null;
	};
	let items: FixedItemRow[] = [];

	if (categoryIds.length > 0) {
		const { data: itemsData } = await supabase
			.from('fixed_items')
			.select('id, label, amount, created_at, created_by')
			.in('category_id', categoryIds)
			.order('created_at', { ascending: false });
		items = (itemsData as FixedItemRow[] | null) || [];
	}

	const transfers = transfersData || [];

	// 5. Map to HistoryPosition with creator names
	const expensePositions: HistoryPosition[] = (expenses || []).map((exp) => ({
		id: exp.id,
		type: 'private_expense' as const,
		description: exp.description,
		amount: Number(exp.amount),
		createdAt: exp.created_at,
		createdBy: exp.created_by,
		createdByName: exp.created_by ? profileMap.get(exp.created_by) || null : null
	}));

	const itemPositions: HistoryPosition[] = items.map((item) => ({
		id: item.id,
		type: 'fixed_item' as const,
		description: item.label,
		amount: Number(item.amount),
		createdAt: item.created_at,
		createdBy: item.created_by,
		createdByName: item.created_by ? profileMap.get(item.created_by) || null : null
	}));

	const transferPositions: HistoryPosition[] = transfers.map((transfer) => ({
		id: transfer.id,
		type: 'transfer' as const,
		description: transfer.description || 'Zahlung',
		amount: Number(transfer.amount),
		createdAt: transfer.created_at,
		createdBy: transfer.created_by,
		createdByName: transfer.created_by ? profileMap.get(transfer.created_by) || null : null
	}));

	const allPositions = [...expensePositions, ...itemPositions, ...transferPositions].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);

	return {
		last5: allPositions.slice(0, 5),
		totalCount: allPositions.length,
		...(options.includeFull && { fullMonthList: allPositions })
	};
}
