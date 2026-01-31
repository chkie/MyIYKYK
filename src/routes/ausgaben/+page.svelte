<script lang="ts">
	import { profileStore } from '$lib/stores/profile.svelte';
	import { enhance } from '$app/forms';
	import { preserveScroll } from '$lib/utils/scroll-preserve';
	import type { PageData } from './$types.js';
	import SwipeActions from '$lib/components/SwipeActions.svelte';

	let { data }: { data: PageData } = $props();
	
	// Edit state
	let editingExpense = $state<string | null>(null);
	let isSubmittingEdit = $state(false);
	let editExpenseData = $state({
		dateISO: '',
		description: '',
		amount: ''
	});

	function startEditExpense(expense: any) {
		editingExpense = expense.id;
		editExpenseData = {
			dateISO: expense.dateISO || expense.date,
			description: expense.description,
			amount: expense.amount.toString()
		};
	}

	function cancelEditExpense() {
		if (!isSubmittingEdit) {
			editingExpense = null;
		}
	}

	// Memoized formatters (avoid recreating on every call)
	const euroFormatter = new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	const dateFormatter = new Intl.DateTimeFormat('de-DE', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});

	// Currency formatter
	function formatEuro(amount: number): string {
		return euroFormatter.format(amount);
	}

	// Date formatter
	function formatDate(dateISO: string): string {
		if (!dateISO) return '-';
		const date = new Date(dateISO);
		if (isNaN(date.getTime())) return '-';
		return dateFormatter.format(date);
	}

	// Local state for new expense form
	let showNewExpenseForm = $state(false);
	let isSubmitting = $state(false);
	let newExpenseData = $state({
		dateISO: new Date().toISOString().split('T')[0],
		description: '',
		amount: ''
	});

	// Focus management for add form (DOM reference, not reactive)
	// svelte-ignore non_reactive_update
	let addFormContainer: HTMLFormElement;
	
	function openNewExpenseForm() {
		showNewExpenseForm = true;
		// Focus first input after DOM update
		setTimeout(() => {
			const firstInput = addFormContainer?.querySelector('input:not([type="hidden"])') as HTMLInputElement;
			firstInput?.focus();
		}, 0);
	}
	
	function closeNewExpenseForm() {
		showNewExpenseForm = false;
	}
	
	// Keyboard navigation for add form
	function handleFormKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSubmitting) {
			closeNewExpenseForm();
		}
	}
	
	function handleFieldKeyDown(e: KeyboardEvent, nextFieldId?: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (nextFieldId) {
				document.getElementById(nextFieldId)?.focus();
			} else {
				// Last field - submit form
				(e.target as HTMLElement).closest('form')?.requestSubmit();
			}
		}
	}

	// Sort expenses by date (newest first)
	let sortedExpenses = $derived(
		[...data.privateExpenses].sort((a, b) => {
			const dateA = new Date(a.dateISO || 0).getTime();
			const dateB = new Date(b.dateISO || 0).getTime();
			return dateB - dateA;
		})
	);
</script>

<svelte:head>
	<title>Ausgaben - Kosten-Tool</title>
</svelte:head>

<h1 class="mb-6 text-3xl font-black text-warning-900">Private Ausgaben</h1>

<!-- Summary Card -->
<div class="mb-6 overflow-hidden rounded-2xl border-2 border-warning-200 bg-white shadow-lg">
	<div class="bg-linear-to-r from-amber-100 to-amber-200 px-5 py-4">
		<p class="text-sm font-semibold uppercase tracking-wide text-warning-700">Diesen Monat</p>
	</div>
	<div class="p-5">
		<p class="text-4xl font-black text-warning-600">{formatEuro(data.computed.privateAddedThisMonth)}</p>
		<p class="mt-2 text-sm font-medium text-neutral-600">
			{data.privateExpenses.length} {data.privateExpenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
		</p>
	</div>
</div>

<!-- Add Expense Button -->
<div class="mb-6">
	{#if !showNewExpenseForm}
		<button
			onclick={openNewExpenseForm}
			class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-warning-300 bg-warning-50 px-4 py-4 font-bold text-warning-700 transition-all hover:border-warning-400 hover:bg-warning-100 active:scale-95"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Neue Ausgabe hinzufügen
		</button>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<form
			bind:this={addFormContainer}
			method="POST"
			action="?/addPrivateExpense"
			onkeydown={handleFormKeyDown}
			use:enhance={() => {
				isSubmitting = true;
				const scrollY = window.scrollY;
				return async ({ result, update }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success') {
						newExpenseData = {
							dateISO: new Date().toISOString().split('T')[0],
							description: '',
							amount: ''
						};
						showNewExpenseForm = false;
					}
					// Restore scroll position
					requestAnimationFrame(() => window.scrollTo(0, scrollY));
				};
			}}
			class="overflow-hidden rounded-2xl border-2 border-warning-200 bg-white shadow-lg"
		>
			<div class="bg-warning-50 px-5 py-3">
				<h2 class="font-bold text-warning-900">Neue Ausgabe</h2>
			</div>
			<div class="p-5">
				<input type="hidden" name="monthId" value={data.month.id} />
				<input type="hidden" name="createdBy" value={profileStore.currentProfileId || ""} />
				
				<div class="mb-4">
					<label class="mb-2 block text-sm font-semibold text-neutral-700" for="newExpenseDate">
						Datum
					</label>
					<input
						id="newExpenseDate"
						type="date"
						name="dateISO"
						bind:value={newExpenseData.dateISO}
						onkeydown={(e) => handleFieldKeyDown(e, 'newExpenseDescription')}
						enterkeyhint="next"
						class="w-full rounded-lg border-2 border-neutral-300 px-4 py-3 text-base transition-all focus:border-warning-500 focus:outline-none focus:ring-2 focus:ring-warning-200"
						required
					/>
				</div>

				<div class="mb-4">
					<label class="mb-2 block text-sm font-semibold text-neutral-700" for="newExpenseDescription">
						Beschreibung
					</label>
					<input
						id="newExpenseDescription"
						type="text"
						name="description"
						bind:value={newExpenseData.description}
						onkeydown={(e) => handleFieldKeyDown(e, 'newExpenseAmount')}
						onfocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
						enterkeyhint="next"
						autocomplete="off"
						autocapitalize="sentences"
						placeholder="z.B. Einkaufen, Restaurant, Tanken..."
						class="w-full rounded-lg border-2 border-neutral-300 px-4 py-3 text-base transition-all focus:border-warning-500 focus:outline-none focus:ring-2 focus:ring-warning-200"
						required
					/>
				</div>

				<div class="mb-4">
					<label class="mb-2 block text-sm font-semibold text-neutral-700" for="newExpenseAmount">
						Betrag (€)
					</label>
					<input
						id="newExpenseAmount"
						type="number"
						name="amount"
						bind:value={newExpenseData.amount}
						onkeydown={(e) => handleFieldKeyDown(e)}
						onfocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
						inputmode="decimal"
						enterkeyhint="done"
						autocomplete="off"
						step="0.01"
						min="0"
						placeholder="0.00"
						class="w-full rounded-lg border-2 border-neutral-300 px-4 py-3 text-lg font-semibold transition-all focus:border-warning-500 focus:outline-none focus:ring-2 focus:ring-warning-200"
						required
					/>
				</div>

				<div class="flex gap-3">
					<button
						type="submit"
						disabled={isSubmitting}
						class="flex-1 rounded-xl bg-warning-600 px-4 py-3 font-bold text-white transition-all hover:bg-warning-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if isSubmitting}
							<span class="inline-flex items-center justify-center gap-2">
								<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
						disabled={isSubmitting}
						onclick={closeNewExpenseForm}
						class="rounded-xl border-2 border-neutral-300 px-4 py-3 font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Abbrechen
					</button>
				</div>
			</div>
		</form>
	{/if}
</div>

<!-- Expenses List -->
{#if sortedExpenses.length > 0}
	<div class="space-y-3">
		{#each sortedExpenses as expense (expense.id)}
			{#if editingExpense === expense.id}
				<!-- Edit Mode -->
				<div class="overflow-hidden rounded-xl border-2 border-primary-300 bg-white shadow-lg">
					<div class="bg-primary-50 px-4 py-3">
						<h3 class="font-bold text-primary-900">Ausgabe bearbeiten</h3>
					</div>
					<form
						method="POST"
						action="?/updatePrivateExpense"
					use:enhance={() => {
						isSubmittingEdit = true;
						const scrollY = window.scrollY;
						return async ({ result, update }) => {
							await update();
							isSubmittingEdit = false;
							if (result.type === 'success') {
								cancelEditExpense();
							}
							// Restore scroll position
							requestAnimationFrame(() => window.scrollTo(0, scrollY));
						};
					}}
						class="p-4"
					>
						<input type="hidden" name="expenseId" value={expense.id} />
						
						<div class="mb-3">
							<label class="mb-1 block text-xs font-semibold text-neutral-600" for="editDate_{expense.id}">Datum</label>
							<input
								id="editDate_{expense.id}"
								type="date"
								name="dateISO"
								bind:value={editExpenseData.dateISO}
								enterkeyhint="next"
								disabled={isSubmittingEdit}
								class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
								required
							/>
						</div>
						<div class="mb-3">
							<label class="mb-1 block text-xs font-semibold text-neutral-600" for="editDesc_{expense.id}">Beschreibung</label>
							<input
								id="editDesc_{expense.id}"
								type="text"
								name="description"
								bind:value={editExpenseData.description}
								onfocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
								enterkeyhint="next"
								autocomplete="off"
								autocapitalize="sentences"
								disabled={isSubmittingEdit}
								class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
								required
							/>
						</div>
						<div class="mb-3">
							<label class="mb-1 block text-xs font-semibold text-neutral-600" for="editAmount_{expense.id}">Betrag (€)</label>
							<input
								id="editAmount_{expense.id}"
								type="number"
								name="amount"
								bind:value={editExpenseData.amount}
								onfocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
								inputmode="decimal"
								enterkeyhint="done"
								autocomplete="off"
								disabled={isSubmittingEdit}
								step="0.01"
								min="0"
								class="w-full rounded-lg border-2 border-neutral-300 px-3 py-2 text-base disabled:opacity-50 disabled:cursor-not-allowed"
								required
							/>
						</div>
						<div class="flex gap-2">
							<button
								type="submit"
								disabled={isSubmittingEdit}
								class="flex-1 rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-success-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isSubmittingEdit ? 'Speichert...' : 'Speichern'}
							</button>
							<button
								type="button"
								disabled={isSubmittingEdit}
								onclick={() => cancelEditExpense()}
								class="rounded-lg border-2 border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Abbrechen
							</button>
						</div>
					</form>
				</div>
			{:else}
				<!-- Display Mode with Swipe Actions -->
				<SwipeActions
					onEdit={() => startEditExpense(expense)}
					onDelete={() => {
						if (confirm(`'${expense.description}' wirklich löschen?`)) {
							const form = document.getElementById(`delete-form-${expense.id}`) as HTMLFormElement;
							if (form) form.requestSubmit();
						}
					}}
				>
					<div class="overflow-hidden rounded-xl border-2 border-neutral-200 bg-white shadow-sm">
						<div class="flex items-center justify-between p-4">
							<div class="flex-1 min-w-0">
								<h3 class="truncate text-lg font-semibold text-neutral-900">{expense.description}</h3>
								<div class="mt-1 flex items-center gap-2 text-sm text-neutral-600">
									<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
									</svg>
									<span class="truncate">{formatDate(expense.dateISO)}</span>
								</div>
							</div>
							<div class="ml-4 text-right shrink-0">
								<p class="text-xl font-black text-warning-600">{formatEuro(expense.amount)}</p>
							</div>
						</div>
					</div>

					<!-- Hidden form for deletion -->
					<form
						id="delete-form-{expense.id}"
						method="POST"
					action="?/deletePrivateExpense"
					use:enhance={() => {
						const scrollY = window.scrollY;
						return async ({ update }) => {
							await update();
							requestAnimationFrame(() => window.scrollTo(0, scrollY));
						};
					}}
						class="hidden"
					>
						<input type="hidden" name="expenseId" value={expense.id} />
					</form>
				</SwipeActions>
			{/if}
		{/each}
	</div>
{:else}
	<div class="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
		<svg class="mx-auto mb-4 h-16 w-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
		</svg>
		<p class="text-lg font-semibold text-neutral-600">Noch keine Ausgaben vorhanden</p>
		<p class="mt-2 text-sm text-neutral-500">Füge oben eine neue Ausgabe hinzu!</p>
	</div>
{/if}

