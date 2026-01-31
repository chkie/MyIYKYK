/**
 * TEMPORARY: History without month boundary filter
 */
import { getSupabaseServerClient } from './supabase.js';

export interface HistoryPosition {
	id: string;
	type: 'private_expense' | 'fixed_item';
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
	year: number,
	month: number,
	options: { includeFull?: boolean } = {}
): Promise<HistoryResult> {
	const supabase = getSupabaseServerClient();

	// 1. Fetch all profiles for name mapping
	const { data: profiles } = await supabase
		.from('profiles')
		.select('id, name');
	
	const profileMap = new Map<string, string>();
	(profiles || []).forEach(p => profileMap.set(p.id, p.name));

	// 2. Fetch expenses with created_by
	const { data: expenses, error: expensesError } = await supabase
		.from('private_expenses')
		.select('id, description, amount, created_at, created_by')
		.eq('month_id', monthId)
		.order('created_at', { ascending: false });

	if (expensesError) {
		throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
	}

	// 3. Fetch fixed items with created_by
	const { data: categories } = await supabase
		.from('fixed_categories')
		.select('id')
		.eq('month_id', monthId);

	const categoryIds = (categories || []).map((c) => c.id);
	let items: any[] = [];

	if (categoryIds.length > 0) {
		const { data: itemsData } = await supabase
			.from('fixed_items')
			.select('id, label, amount, created_at, created_by')
			.in('category_id', categoryIds)
			.order('created_at', { ascending: false });
		items = itemsData || [];
	}

	// 4. Map to HistoryPosition with creator names
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

	const allPositions = [...expensePositions, ...itemPositions].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);

	return {
		last5: allPositions.slice(0, 5),
		totalCount: allPositions.length,
		...(options.includeFull && { fullMonthList: allPositions })
	};
}
