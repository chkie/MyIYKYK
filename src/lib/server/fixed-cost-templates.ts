/**
 * Server functions for managing fixed cost templates
 * Templates are month-independent standard fixed costs
 */

import { getSupabaseServerClient } from './supabase.js';

export interface TemplateCategory {
	id: string;
	label: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface TemplateItem {
	id: string;
	template_category_id: string;
	label: string;
	amount: number;
	splitMode: 'income' | 'me' | 'partner' | 'half';
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface TemplateCategoryWithItems extends TemplateCategory {
	items: TemplateItem[];
}

/**
 * List all template categories with their items
 */
export async function listTemplateCategories(): Promise<TemplateCategoryWithItems[]> {
	const supabase = getSupabaseServerClient();

	// Get categories
	const { data: categories, error: categoriesError } = await supabase
		.from('fixed_cost_template_categories')
		.select('*')
		.order('sort_order', { ascending: true });

	if (categoriesError) {
		throw new Error(`Failed to load template categories: ${categoriesError.message}`);
	}

	// Get all items
	const { data: items, error: itemsError } = await supabase
		.from('fixed_cost_template_items')
		.select('*')
		.order('sort_order', { ascending: true });

	if (itemsError) {
		throw new Error(`Failed to load template items: ${itemsError.message}`);
	}

	// Map items to categories
	const result: TemplateCategoryWithItems[] = (categories || []).map((cat) => ({
		...cat,
		items: (items || [])
			.filter((item) => item.template_category_id === cat.id)
			.map((item) => ({
				...item,
				splitMode: item.split_mode as 'income' | 'me' | 'partner' | 'half'
			}))
	}));

	return result;
}

/**
 * Update a template item (e.g., change amount or split mode)
 */
export async function updateTemplateItem(
	itemId: string,
	patch: { label?: string; amount?: number; splitMode?: 'income' | 'me' | 'partner' | 'half' }
): Promise<void> {
	const supabase = getSupabaseServerClient();

	const updateData: any = {
		updated_at: new Date().toISOString()
	};

	if (patch.label !== undefined) updateData.label = patch.label;
	if (patch.amount !== undefined) updateData.amount = patch.amount;
	if (patch.splitMode !== undefined) updateData.split_mode = patch.splitMode;

	const { error } = await supabase
		.from('fixed_cost_template_items')
		.update(updateData)
		.eq('id', itemId);

	if (error) {
		throw new Error(`Failed to update template item: ${error.message}`);
	}
}

/**
 * Create template category
 */
export async function createTemplateCategory(label: string): Promise<string> {
	const supabase = getSupabaseServerClient();

	// Get max sort order
	const { data: maxData } = await supabase
		.from('fixed_cost_template_categories')
		.select('sort_order')
		.order('sort_order', { ascending: false })
		.limit(1)
		.single();

	const nextSortOrder = (maxData?.sort_order || 0) + 1;

	const { data, error } = await supabase
		.from('fixed_cost_template_categories')
		.insert({
			label,
			sort_order: nextSortOrder
		})
		.select()
		.single();

	if (error || !data) {
		throw new Error(`Failed to create template category: ${error?.message}`);
	}

	return data.id;
}

/**
 * Create template item
 */
export async function createTemplateItem(
	categoryId: string,
	item: { label: string; amount: number; splitMode: 'income' | 'me' | 'partner' | 'half' }
): Promise<string> {
	const supabase = getSupabaseServerClient();

	// Get max sort order for this category
	const { data: maxData } = await supabase
		.from('fixed_cost_template_items')
		.select('sort_order')
		.eq('template_category_id', categoryId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.single();

	const nextSortOrder = (maxData?.sort_order || 0) + 1;

	const { data, error } = await supabase
		.from('fixed_cost_template_items')
		.insert({
			template_category_id: categoryId,
			label: item.label,
			amount: item.amount,
			split_mode: item.splitMode,
			sort_order: nextSortOrder
		})
		.select()
		.single();

	if (error || !data) {
		throw new Error(`Failed to create template item: ${error?.message}`);
	}

	return data.id;
}

/**
 * Delete template category and all its items
 */
export async function deleteTemplateCategory(categoryId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	const { error } = await supabase
		.from('fixed_cost_template_categories')
		.delete()
		.eq('id', categoryId);

	if (error) {
		throw new Error(`Failed to delete template category: ${error.message}`);
	}
}

/**
 * Delete template item
 */
export async function deleteTemplateItem(itemId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	const { error } = await supabase.from('fixed_cost_template_items').delete().eq('id', itemId);

	if (error) {
		throw new Error(`Failed to delete template item: ${error.message}`);
	}
}

/**
 * Copy all templates to a specific month
 * This is called when creating a new month
 */
export async function copyTemplatesToMonth(monthId: string): Promise<void> {
	const supabase = getSupabaseServerClient();

	// Get all templates
	const templates = await listTemplateCategories();

	// For each template category, create a category for the month
	for (const templateCat of templates) {
		const { data: newCategory, error: catError } = await supabase
			.from('fixed_categories')
			.insert({
				month_id: monthId,
				label: templateCat.label,
				is_from_template: true,
				template_category_id: templateCat.id
			})
			.select()
			.single();

		if (catError || !newCategory) {
			throw new Error(`Failed to copy template category: ${catError?.message}`);
		}

		// Copy all items
		if (templateCat.items.length > 0) {
			const itemsToInsert = templateCat.items.map((item) => ({
				category_id: newCategory.id,
				label: item.label,
				amount: item.amount,
				split_mode: item.splitMode,
				is_from_template: true,
				template_item_id: item.id
			}));

			const { error: itemsError } = await supabase
				.from('fixed_items')
				.insert(itemsToInsert);

			if (itemsError) {
				throw new Error(`Failed to copy template items: ${itemsError.message}`);
			}
		}
	}
}

