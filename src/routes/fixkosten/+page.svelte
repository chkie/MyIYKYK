<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types.js';
	import SwipeActions from '$lib/components/SwipeActions.svelte';

	let { data }: { data: PageData } = $props();

	// Currency formatter
	function formatEuro(amount: number): string {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// Local state for new category/item forms
	let newCategoryLabel = $state('');
	let showNewCategoryForm = $state(false);
	let isSubmitting = $state(false);
	
	// Per-category state for new items
	let newItems = $state<Record<string, { label: string; amount: string; splitMode: string }>>({});
	let openItemForms = $state<Set<string>>(new Set());

	// Helper to get or create item state (read-only, doesn't mutate)
	function getItemState(categoryId: string) {
		if (!newItems[categoryId]) {
			return { label: '', amount: '', splitMode: 'income' };
		}
		return newItems[categoryId];
	}

	// Edit state for items
	let editingItem = $state<string | null>(null);
	let editItemData = $state<{ label: string; amount: string; splitMode: string }>({ label: '', amount: '', splitMode: 'income' });

	function startEditItem(itemId: string, label: string, amount: number, splitMode: string) {
		editingItem = itemId;
		editItemData = { label, amount: amount.toString(), splitMode };
	}

	function cancelEditItem() {
		editingItem = null;
	}

	// Split mode labels
	const splitModeLabels: Record<string, string> = {
		income: '📊 Nach Einkommen',
		half: '⚖️ 50/50',
		me: '👤 Nur ich',
		partner: '👥 Nur Partner'
	};

	// Collapsible categories
	let collapsedCategories = $state<Set<string>>(new Set());

	function toggleCategory(categoryId: string) {
		const newSet = new Set(collapsedCategories);
		if (newSet.has(categoryId)) {
			newSet.delete(categoryId);
		} else {
			newSet.add(categoryId);
		}
		collapsedCategories = newSet;
	}
</script>

<svelte:head>
	<title>Fixkosten - Kosten-Tool</title>
</svelte:head>

<h1 class="mb-6 text-3xl font-black text-primary-900">Fixkosten</h1>

<!-- Summary Card -->
<div class="mb-6 overflow-hidden rounded-2xl border-2 border-primary-200 bg-white shadow-lg">
	<div class="bg-gradient-to-r from-primary-50 to-primary-100 px-5 py-4">
		<p class="text-sm font-semibold uppercase tracking-wide text-primary-700">Mein Anteil</p>
	</div>
	<div class="p-5">
		<p class="text-4xl font-black text-primary-600">{formatEuro(data.computed.myFixedShare)}</p>
		<p class="mt-2 text-sm text-neutral-600">
			Gesamt: {formatEuro(data.computed.totalFixedCosts)}
		</p>
	</div>
</div>

<!-- Add Category Button -->
<div class="mb-4">
	{#if !showNewCategoryForm}
		<button
			type="button"
			onclick={() => showNewCategoryForm = true}
			class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 px-4 py-3 font-semibold text-primary-700 transition-all hover:border-primary-400 hover:bg-primary-100 active:scale-95"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Neue Kategorie
		</button>
	{:else}
		<form
			method="POST"
			action="?/addCategory"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success') {
						newCategoryLabel = '';
						showNewCategoryForm = false;
					}
				};
			}}
			class="rounded-xl border-2 border-primary-200 bg-white p-4"
		>
			<input type="hidden" name="monthId" value={data.month.id} />
			<div class="mb-3">
				<label class="mb-2 block text-sm font-semibold text-neutral-700" for="newCategoryLabel">
					Kategorie Name
				</label>
				<input
					id="newCategoryLabel"
					type="text"
					name="label"
					bind:value={newCategoryLabel}
					placeholder="z.B. Wohnung, Auto, Versicherungen..."
					class="w-full rounded-lg border-2 border-neutral-300 px-4 py-2 transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
					required
				/>
			</div>
			<div class="flex gap-2">
				<button
					type="submit"
					disabled={isSubmitting}
					class="flex-1 rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition-all hover:bg-primary-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{#if isSubmitting}
						<span class="inline-flex items-center gap-2">
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Speichert...
						</span>
					{:else}
						Hinzufügen
					{/if}
				</button>
				<button
					type="button"
					onclick={() => {
						showNewCategoryForm = false;
						newCategoryLabel = '';
					}}
					class="rounded-lg border-2 border-neutral-300 px-4 py-2 font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95"
				>
					Abbrechen
				</button>
			</div>
		</form>
	{/if}
</div>

<!-- Categories List -->
{#each data.fixedCategories as category}
	<div class="mb-4 overflow-hidden rounded-2xl border-2 border-primary-200 bg-white shadow-lg transition-all hover:shadow-xl">
		<!-- Category Header - Clickable -->
		<button
			type="button"
			onclick={() => toggleCategory(category.id)}
			class="flex w-full items-center justify-between bg-gradient-to-r from-primary-50 to-primary-100 px-5 py-4 text-left transition-colors hover:from-primary-100 hover:to-primary-200 active:scale-[0.99]"
		>
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
				</div>
				<div>
					<h2 class="text-lg font-bold text-primary-900">{category.label}</h2>
					<p class="text-xs text-neutral-600">{category.items.length} {category.items.length === 1 ? 'Position' : 'Positionen'}</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span class="text-sm font-semibold text-neutral-600">{category.items.length > 0 ? formatEuro(category.items.reduce((sum, item) => sum + item.amount, 0)) : '0,00 €'}</span>
				<svg 
					class="h-5 w-5 text-primary-600 transition-transform duration-200 {collapsedCategories.has(category.id) ? '' : 'rotate-180'}"
					fill="none" 
					stroke="currentColor" 
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</div>
		</button>

		<!-- Items (Collapsible) -->
		{#if !collapsedCategories.has(category.id)}
			<div class="divide-y divide-neutral-100">
			{#each category.items as item}
				<div class="p-4">
					{#if editingItem === item.id}
						<!-- Edit Mode -->
						<form
							method="POST"
							action="?/updateItem"
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									if (result.type === 'success') {
										cancelEditItem();
									}
								};
							}}
						>
							<input type="hidden" name="itemId" value={item.id} />
							<div class="mb-3">
								<label class="mb-1 block text-xs font-semibold text-neutral-600" for="editLabel_{item.id}">
									Bezeichnung
								</label>
								<input
									id="editLabel_{item.id}"
									type="text"
									name="label"
									bind:value={editItemData.label}
									class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm"
									required
								/>
							</div>
							<div class="mb-3 grid grid-cols-2 gap-3">
								<div>
									<label class="mb-1 block text-xs font-semibold text-neutral-600" for="editAmount_{item.id}">
										Betrag
									</label>
									<input
										id="editAmount_{item.id}"
										type="number"
										name="amount"
										bind:value={editItemData.amount}
										step="0.01"
										min="0"
										class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm"
										required
									/>
								</div>
								<div>
									<label class="mb-1 block text-xs font-semibold text-neutral-600" for="editSplitMode_{item.id}">
										Aufteilung
									</label>
									<select
										id="editSplitMode_{item.id}"
										name="splitMode"
										bind:value={editItemData.splitMode}
										class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm"
									>
										<option value="income">Nach Einkommen</option>
										<option value="half">50/50</option>
										<option value="me">Nur ich</option>
										<option value="partner">Nur Partner</option>
									</select>
								</div>
							</div>
							<div class="flex gap-2">
								<button
									type="submit"
									class="flex-1 rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-success-700 active:scale-95"
								>
									Speichern
								</button>
								<button
									type="button"
									onclick={() => cancelEditItem()}
									class="rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95"
								>
									Abbrechen
								</button>
							</div>
						</form>
					{:else}
						<!-- Display Mode with Swipe Actions -->
						<SwipeActions
							onEdit={() => startEditItem(item.id, item.label, item.amount, item.splitMode)}
							onDelete={() => {
								if (confirm(`'${item.label}' wirklich löschen?`)) {
									const form = document.getElementById(`delete-item-${item.id}`) as HTMLFormElement;
									if (form) form.requestSubmit();
								}
							}}
						>
							<div class="flex items-center justify-between gap-4">
								<div class="flex-1 min-w-0">
									<h3 class="truncate font-semibold text-neutral-900">{item.label}</h3>
									<div class="mt-2 flex items-center gap-2">
										<span class="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
											{splitModeLabels[item.splitMode]}
										</span>
									</div>
								</div>
								<div class="flex-shrink-0">
									<span class="whitespace-nowrap text-xl font-black text-primary-600">
										{formatEuro(item.amount)}
									</span>
								</div>
							</div>

							<!-- Hidden form for deletion -->
							<form
								id="delete-item-{item.id}"
								method="POST"
								action="?/deleteItem"
								use:enhance
								class="hidden"
							>
								<input type="hidden" name="itemId" value={item.id} />
							</form>
						</SwipeActions>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Add Item -->
		<div class="border-t-2 border-neutral-100 bg-neutral-50 p-4">
			{#if !openItemForms.has(category.id)}
				<button
					type="button"
					onclick={() => {
						openItemForms = new Set([...openItemForms, category.id]);
					}}
					class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-95"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Position hinzufügen
				</button>
			{:else}
				{@const itemState = getItemState(category.id)}
				<form
					method="POST"
					action="?/addItem"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								newItems = { ...newItems, [category.id]: { label: '', amount: '', splitMode: 'income' } };
								const newSet = new Set(openItemForms);
								newSet.delete(category.id);
								openItemForms = newSet;
							}
						};
					}}
				>
					<input type="hidden" name="categoryId" value={category.id} />
					<div class="mb-3">
						<label class="mb-1 block text-xs font-semibold text-neutral-600" for="newItemLabel_{category.id}">
							Bezeichnung
						</label>
						<input
							id="newItemLabel_{category.id}"
							type="text"
							name="label"
							value={itemState.label}
							oninput={(e) => {
								const target = e.target as HTMLInputElement;
								newItems = { ...newItems, [category.id]: { ...itemState, label: target.value } };
							}}
							placeholder="z.B. Miete, Strom..."
							class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm"
							required
						/>
					</div>
					<div class="mb-3 grid grid-cols-2 gap-3">
						<div>
							<label class="mb-1 block text-xs font-semibold text-neutral-600" for="newItemAmount_{category.id}">
								Betrag (€)
							</label>
							<input
								id="newItemAmount_{category.id}"
								type="number"
								name="amount"
								value={itemState.amount}
								oninput={(e) => {
									const target = e.target as HTMLInputElement;
									newItems = { ...newItems, [category.id]: { ...itemState, amount: target.value } };
								}}
								step="0.01"
								min="0"
								placeholder="0.00"
								class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm"
								required
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-semibold text-neutral-600" for="newItemSplitMode_{category.id}">
								Aufteilung
							</label>
							<select
								id="newItemSplitMode_{category.id}"
								name="splitMode"
								value={itemState.splitMode}
								onchange={(e) => {
									const target = e.target as HTMLSelectElement;
									newItems = { ...newItems, [category.id]: { ...itemState, splitMode: target.value } };
								}}
								class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm"
							>
								<option value="income">Nach Einkommen</option>
								<option value="half">50/50</option>
								<option value="me">Nur ich</option>
								<option value="partner">Nur Partner</option>
							</select>
						</div>
					</div>
					<div class="flex gap-2">
						<button
							type="submit"
							class="flex-1 rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-success-700 active:scale-95"
						>
							Hinzufügen
						</button>
						<button
							type="button"
							onclick={() => {
								const newSet = new Set(openItemForms);
								newSet.delete(category.id);
								openItemForms = newSet;
							}}
							class="rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95"
						>
							Abbrechen
						</button>
					</div>
				</form>
			{/if}
		</div>
			
			<!-- Delete Category Button (at bottom when expanded) -->
			<div class="border-t-2 border-neutral-100 bg-neutral-50 px-5 py-3">
				<form
					method="POST"
					action="?/deleteCategory"
					use:enhance
					class="flex justify-end"
				>
					<input type="hidden" name="categoryId" value={category.id} />
					<button
						type="submit"
						class="rounded-lg border-2 border-danger-200 bg-danger-50 px-4 py-2 text-sm font-semibold text-danger-700 transition-all hover:bg-danger-100 active:scale-95"
						onclick={() => confirm(`Kategorie '${category.label}' und alle Positionen wirklich löschen?`)}
					>
						<svg class="mr-2 inline-block h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
						</svg>
						Kategorie löschen
					</button>
				</form>
			</div>
		{/if}
	</div>
{:else}
	<div class="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
		<p class="text-neutral-600">Noch keine Fixkosten-Kategorien vorhanden.</p>
		<p class="mt-2 text-sm text-neutral-500">Füge oben eine neue Kategorie hinzu!</p>
	</div>
{/each}

