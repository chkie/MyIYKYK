/**
 * Server-only fixed costs management functions.
 * Handles categories and items for fixed monthly costs.
 */

import { getSupabaseServerClient } from './supabase.js';

// Types for structured return data
export interface FixedItem {
	id: string;
	label: string;
	amount: number;
	splitMode: 'income' | 'me' | 'partner' | 'half';
}

export interface FixedCategoryWithItems {
	id: string;
	label: string;
	sortOrder: number;
	items: FixedItem[];
}

const ALLOWED_SPLIT_MODES = ['income', 'me', 'partner', 'half'] as const;

/**
 * Lists all fixed categories with their items for a given month.
 * 
 * @param monthId - The month ID (UUID)
 * @returns Array of categories with nested items
 * @throws {Error} If database operation fails
 */
export async function listFixedCategoriesWithItems(
	monthId: string
): Promise<FixedCategoryWithItems[]> {
	const supabase = getSupabaseServerClient();

	// 1. Fetch categories
	const { data: categories, error: categoriesError } = await supabase
		.from('fixed_categories')
		.select('*')
		.eq('month_id', monthId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (categoriesError) {
		throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
	}

	if (!categories || categories.length === 0) {
		return [];
	}

	// 2. Fetch all items for these categories
	const categoryIds = categories.map((c) => c.id);
	const { data: items, error: itemsError } = await supabase
		.from('fixed_items')
		.select('*')
		.in('category_id', categoryIds)
		.order('created_at', { ascending: true });

	if (itemsError) {
		throw new Error(`Failed to fetch items: ${itemsError.message}`);
	}

	// 3. Group items by category
	const itemsByCategory = new Map<string, FixedItem[]>();
	for (const item of items || []) {
		if (!itemsByCategory.has(item.category_id)) {
			itemsByCategory.set(item.category_id, []);
		}
		itemsByCategory.get(item.category_id)!.push({
			id: item.id,
			label: item.label,
			amount: Number(item.amount), // Normalize to number
			splitMode: item.split_mode as 'income' | 'me' | 'partner' | 'half'
		});
	}

	// 4. Build structured result
	return categories.map((category) => ({
		id: category.id,
		label: category.label,
		sortOrder: category.sort_order,
		items: itemsByCategory.get(category.id) || []
	}));
}

/**
 * Creates a new fixed category for a month.
 * Automatically assigns the next sort_order value.
 * 
 * @param monthId - The month ID (UUID)
 * @param label - Category label
 * @returns New category row
 * @throws {Error} If database operation fails
 */
export async function createFixedCategory(monthId: string, label: string) {
	const supabase = getSupabaseServerClient();

	// 1. Get max sort_order for this month
	const { data: maxData, error: maxError } = await supabase
		.from('fixed_categories')
		.select('sort_order')
		.eq('month_id', monthId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.single();

	if (maxError && maxError.code !== 'PGRST116') {
		// PGRST116 = no rows, which is ok
		throw new Error(`Failed to get max sort_order: ${maxError.message}`);
	}

	const nextSortOrder = maxData ? maxData.sort_order + 1 : 0;

	// 2. Create category
	const { data: newCategory, error: createError } = await supabase
		.from('fixed_categories')
		.insert({
			month_id: monthId,
			label: label.trim(),
			sort_order: nextSortOrder
		})
		.select()
		.single();

	if (createError) {
		throw new Error(`Failed to create category: ${createError.message}`);
	}

	return {
		id: newCategory.id,
		label: newCategory.label,
		sortOrder: newCategory.sort_order
	};
}

/**
 * Deletes a fixed category (cascade deletes items).
 * 
 * @param categoryId - The category ID (UUID)
 * @throws {Error} If database operation fails
 */
export async function deleteFixedCategory(categoryId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	const { error } = await supabase.from('fixed_categories').delete().eq('id', categoryId);

	if (error) {
		throw new Error(`Failed to delete category: ${error.message}`);
	}
}

/**
 * Creates a new fixed item in a category.
 * 
 * @param categoryId - The category ID (UUID)
 * @param input - Item data (label, amount, splitMode)
 * @returns New item row
 * @throws {Error} If validation fails or database operation fails
 */
export async function createFixedItem(
	categoryId: string,
	input: {
		label: string;
		amount: number;
		splitMode: 'income' | 'me' | 'partner' | 'half';
	}
) {
	const supabase = getSupabaseServerClient();

	// Validation
	const trimmedLabel = input.label.trim();
	if (!trimmedLabel) {
		throw new Error('Label cannot be empty');
	}

	if (input.amount < 0) {
		throw new Error('Amount must be >= 0');
	}

	if (!ALLOWED_SPLIT_MODES.includes(input.splitMode)) {
		throw new Error(`Invalid split mode: ${input.splitMode}`);
	}

	// Create item
	const { data: newItem, error: createError } = await supabase
		.from('fixed_items')
		.insert({
			category_id: categoryId,
			label: trimmedLabel,
			amount: input.amount,
			split_mode: input.splitMode
		})
		.select()
		.single();

	if (createError) {
		throw new Error(`Failed to create item: ${createError.message}`);
	}

	return {
		id: newItem.id,
		label: newItem.label,
		amount: Number(newItem.amount), // Normalize to number
		splitMode: newItem.split_mode as 'income' | 'me' | 'partner' | 'half'
	};
}

/**
 * Updates a fixed item (partial update).
 * 
 * @param itemId - The item ID (UUID)
 * @param patch - Partial item data to update
 * @returns Updated item row
 * @throws {Error} If validation fails or database operation fails
 */
export async function updateFixedItem(
	itemId: string,
	patch: {
		label?: string;
		amount?: number;
		splitMode?: 'income' | 'me' | 'partner' | 'half';
	}
) {
	const supabase = getSupabaseServerClient();

	// Build update object with validation
	const updates: Record<string, any> = {};

	if (patch.label !== undefined) {
		const trimmedLabel = patch.label.trim();
		if (!trimmedLabel) {
			throw new Error('Label cannot be empty');
		}
		updates.label = trimmedLabel;
	}

	if (patch.amount !== undefined) {
		if (patch.amount < 0) {
			throw new Error('Amount must be >= 0');
		}
		updates.amount = patch.amount;
	}

	if (patch.splitMode !== undefined) {
		if (!ALLOWED_SPLIT_MODES.includes(patch.splitMode)) {
			throw new Error(`Invalid split mode: ${patch.splitMode}`);
		}
		updates.split_mode = patch.splitMode;
	}

	// Nothing to update
	if (Object.keys(updates).length === 0) {
		// Fetch and return current item
		const { data: currentItem, error: fetchError } = await supabase
			.from('fixed_items')
			.select('*')
			.eq('id', itemId)
			.single();

		if (fetchError) {
			throw new Error(`Failed to fetch item: ${fetchError.message}`);
		}

		return {
			id: currentItem.id,
			label: currentItem.label,
			amount: Number(currentItem.amount),
			splitMode: currentItem.split_mode as 'income' | 'me' | 'partner' | 'half'
		};
	}

	// Update item
	const { data: updatedItem, error: updateError } = await supabase
		.from('fixed_items')
		.update(updates)
		.eq('id', itemId)
		.select()
		.single();

	if (updateError) {
		throw new Error(`Failed to update item: ${updateError.message}`);
	}

	return {
		id: updatedItem.id,
		label: updatedItem.label,
		amount: Number(updatedItem.amount), // Normalize to number
		splitMode: updatedItem.split_mode as 'income' | 'me' | 'partner' | 'half'
	};
}

/**
 * Deletes a fixed item.
 * 
 * @param itemId - The item ID (UUID)
 * @throws {Error} If database operation fails
 */
export async function deleteFixedItem(itemId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	const { error } = await supabase.from('fixed_items').delete().eq('id', itemId);

	if (error) {
		throw new Error(`Failed to delete item: ${error.message}`);
	}
}

