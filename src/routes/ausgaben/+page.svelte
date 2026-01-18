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

	// Date formatter
	function formatDate(dateISO: string): string {
		const date = new Date(dateISO);
		return new Intl.DateTimeFormat('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(date);
	}

	// Local state for new expense form
	let showNewExpenseForm = $state(false);
	let newExpenseData = $state({
		dateISO: new Date().toISOString().split('T')[0],
		description: '',
		amount: ''
	});

	// Sort expenses by date (newest first)
	let sortedExpenses = $derived(
		[...data.privateExpenses].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
	);
</script>

<svelte:head>
	<title>Ausgaben - Kosten-Tool</title>
</svelte:head>

<h1 class="mb-6 text-3xl font-black text-warning-900">Private Ausgaben</h1>

<!-- Summary Card -->
<div class="mb-6 overflow-hidden rounded-2xl border-2 border-warning-200 bg-white shadow-lg">
	<div class="bg-gradient-to-r from-warning-50 to-warning-100 px-5 py-4">
		<p class="text-sm font-semibold uppercase tracking-wide text-warning-700">Diesen Monat</p>
	</div>
	<div class="p-5">
		<p class="text-4xl font-black text-warning-600">{formatEuro(data.computed.privateAddedThisMonth)}</p>
		<p class="mt-2 text-sm text-neutral-600">
			{data.privateExpenses.length} {data.privateExpenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
		</p>
	</div>
</div>

<!-- Add Expense Button -->
<div class="mb-6">
	{#if !showNewExpenseForm}
		<button
			onclick={() => { showNewExpenseForm = true; }}
			class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-warning-300 bg-warning-50 px-4 py-4 font-bold text-warning-700 transition-all hover:border-warning-400 hover:bg-warning-100 active:scale-95"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Neue Ausgabe hinzufügen
		</button>
	{:else}
		<form
			method="POST"
			action="?/addPrivateExpense"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						newExpenseData = {
							dateISO: new Date().toISOString().split('T')[0],
							description: '',
							amount: ''
						};
						showNewExpenseForm = false;
					}
				};
			}}
			class="overflow-hidden rounded-2xl border-2 border-warning-200 bg-white shadow-lg"
		>
			<div class="bg-warning-50 px-5 py-3">
				<h2 class="font-bold text-warning-900">Neue Ausgabe</h2>
			</div>
			<div class="p-5">
				<input type="hidden" name="monthId" value={data.month.id} />
				
				<div class="mb-4">
					<label class="mb-2 block text-sm font-semibold text-neutral-700" for="newExpenseDate">
						Datum
					</label>
					<input
						id="newExpenseDate"
						type="date"
						name="dateISO"
						bind:value={newExpenseData.dateISO}
						class="w-full rounded-lg border-2 border-neutral-300 px-4 py-3 transition-all focus:border-warning-500 focus:outline-none focus:ring-2 focus:ring-warning-200"
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
						placeholder="z.B. Einkaufen, Restaurant, Tanken..."
						class="w-full rounded-lg border-2 border-neutral-300 px-4 py-3 transition-all focus:border-warning-500 focus:outline-none focus:ring-2 focus:ring-warning-200"
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
						class="flex-1 rounded-xl bg-warning-600 px-4 py-3 font-bold text-white transition-all hover:bg-warning-700 active:scale-95"
					>
						Hinzufügen
					</button>
					<button
						type="button"
						onclick={() => { showNewExpenseForm = false; }}
						class="rounded-xl border-2 border-neutral-300 px-4 py-3 font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95"
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
		{#each sortedExpenses as expense}
			<div class="overflow-hidden rounded-xl border-2 border-neutral-200 bg-white shadow-sm transition-all hover:shadow-md">
				<div class="flex items-center justify-between p-4">
					<div class="flex-1">
						<div class="flex items-baseline gap-2">
							<h3 class="text-lg font-semibold text-neutral-900">{expense.description}</h3>
						</div>
						<div class="mt-1 flex items-center gap-2 text-sm text-neutral-600">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							<span>{formatDate(expense.dateISO)}</span>
						</div>
					</div>
					<div class="ml-4 flex items-center gap-3">
						<div class="text-right">
							<p class="text-xl font-black text-warning-600">{formatEuro(expense.amount)}</p>
						</div>
						<form
							method="POST"
							action="?/deletePrivateExpense"
							use:enhance
						>
							<input type="hidden" name="expenseId" value={expense.id} />
							<button
								type="submit"
								class="rounded-lg border-2 border-danger-200 bg-danger-50 p-2 text-danger-700 transition-all hover:bg-danger-100 active:scale-95"
								onclick={() => confirm(`Ausgabe '${expense.description}' wirklich löschen?`)}
								aria-label="Löschen"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
								</svg>
							</button>
						</form>
					</div>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
		<svg class="mx-auto mb-4 h-16 w-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
		</svg>
		<p class="text-lg font-semibold text-neutral-600">Noch keine Ausgaben vorhanden</p>
		<p class="mt-2 text-sm text-neutral-500">Füge oben deine erste Ausgabe hinzu!</p>
	</div>
{/if}

