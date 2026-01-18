<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types.js';

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
	
	// Per-category state for new items
	let newItems = $state<Record<string, { label: string; amount: string; splitMode: string }>>({});
	let showNewItemForm = $state<Record<string, boolean>>({});

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
			onclick={() => { showNewCategoryForm = true; }}
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
				return async ({ result, update }) => {
					await update();
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
					class="flex-1 rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white transition-all hover:bg-primary-700 active:scale-95"
				>
					Hinzufügen
				</button>
				<button
					type="button"
					onclick={() => { showNewCategoryForm = false; newCategoryLabel = ''; }}
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
	<div class="mb-4 overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-md">
		<!-- Category Header -->
		<div class="flex items-center justify-between bg-neutral-50 px-5 py-3">
			<h2 class="text-lg font-bold text-neutral-900">{category.label}</h2>
			<form
				method="POST"
				action="?/deleteCategory"
				use:enhance
			>
				<input type="hidden" name="categoryId" value={category.id} />
				<button
					type="submit"
					class="rounded-lg border-2 border-danger-200 bg-danger-50 px-3 py-1 text-sm font-semibold text-danger-700 transition-all hover:bg-danger-100 active:scale-95"
					onclick={() => confirm(`Kategorie '${category.label}' wirklich löschen?`)}
				>
					Löschen
				</button>
			</form>
		</div>

		<!-- Items -->
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
						<!-- Display Mode -->
						<div class="flex items-start justify-between">
							<div class="flex-1">
								<h3 class="font-semibold text-neutral-900">{item.label}</h3>
								<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
									<span class="rounded-full bg-neutral-100 px-2 py-1 font-medium">
										{formatEuro(item.amount)}
									</span>
									<span class="rounded-full bg-primary-100 px-2 py-1 font-medium text-primary-700">
										{splitModeLabels[item.splitMode]}
									</span>
								</div>
							</div>
							<div class="ml-3 flex gap-2">
								<button
									onclick={() => startEditItem(item.id, item.label, item.amount, item.splitMode)}
									class="rounded-lg border-2 border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 transition-all hover:bg-primary-100 active:scale-95"
								>
									Bearbeiten
								</button>
								<form
									method="POST"
									action="?/deleteItem"
									use:enhance
								>
									<input type="hidden" name="itemId" value={item.id} />
									<button
										type="submit"
										class="rounded-lg border-2 border-danger-200 bg-danger-50 px-3 py-1 text-xs font-semibold text-danger-700 transition-all hover:bg-danger-100 active:scale-95"
										onclick={() => confirm(`Item '${item.label}' wirklich löschen?`)}
									>
										Löschen
									</button>
								</form>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Add Item -->
		<div class="border-t-2 border-neutral-100 bg-neutral-50 p-4">
			{#if !showNewItemForm[category.id]}
				<button
					onclick={() => { showNewItemForm[category.id] = true; }}
					class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-95"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					Position hinzufügen
				</button>
			{:else}
				{@const itemState = newItems[category.id] || (newItems[category.id] = { label: '', amount: '', splitMode: 'income' })}
				<form
					method="POST"
					action="?/addItem"
					use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								newItems[category.id] = { label: '', amount: '', splitMode: 'income' };
								showNewItemForm[category.id] = false;
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
							bind:value={itemState.label}
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
								bind:value={itemState.amount}
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
								bind:value={itemState.splitMode}
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
							onclick={() => { showNewItemForm[category.id] = false; }}
							class="rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95"
						>
							Abbrechen
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{:else}
	<div class="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
		<p class="text-neutral-600">Noch keine Fixkosten-Kategorien vorhanden.</p>
		<p class="mt-2 text-sm text-neutral-500">Füge oben eine neue Kategorie hinzu!</p>
	</div>
{/each}

