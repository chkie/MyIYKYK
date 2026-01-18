<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Helper to get income for a profile
	function getIncomeForProfile(profileId: string) {
		const income = data.incomes.find((i) => i.profile_id === profileId);
		return income?.net_income ?? 0;
	}

	// Currency formatter
	function formatEuro(amount: number): string {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// Percentage formatter
	function formatPct(share: number): string {
		return `${(share * 100).toFixed(2)}%`;
	}

	// Calculate my share for a fixed item (client-side preview, matches domain logic)
	function calculateMyItemShare(amount: number, splitMode: string): number {
		let myShare: number;
		switch (splitMode) {
			case 'income':
				myShare = amount * data.computed.shareMe;
				break;
			case 'me':
				myShare = amount;
				break;
			case 'partner':
				myShare = 0;
				break;
			default:
				// Fallback for legacy 'half': treat as income-based
				myShare = amount * data.computed.shareMe;
				break;
		}
		return Math.round(myShare * 100) / 100;
	}

	// Get split mode label
	function getSplitModeLabel(splitMode: string, amount: number): string {
		switch (splitMode) {
			case 'income':
				return `(${formatPct(data.computed.shareMe)} von ${formatEuro(amount)})`;
			case 'me':
				return '(100% du)';
			case 'partner':
				return '(0%)';
			default:
				// Fallback for legacy 'half'
				return `(${formatPct(data.computed.shareMe)} von ${formatEuro(amount)})`;
		}
	}

	// UI Toggle States
	let editingIncomes = $state(false);
	let editingItemId = $state<string | null>(null);
	let addingCategoryId = $state<string | null>(null);

	// Optimistic UI: Temporary categories/items shown immediately while server processes
	let optimisticCategories = $state<Array<{ id: string; label: string; items: any[] }>>([]);
	let optimisticItems = $state<Record<string, any[]>>({});
	let optimisticExpenses = $state<any[]>([]);

	// Track deleted items for optimistic removal
	let deletedCategoryIds = $state<Set<string>>(new Set());
	let deletedItemIds = $state<Set<string>>(new Set());
	let deletedExpenseIds = $state<Set<string>>(new Set());

	// Close month confirmation state
	let showCloseConfirm = $state(false);
	let closeConfirmText = $state('');

	// Check if user typed "CLOSE" correctly
	const isCloseConfirmed = $derived(closeConfirmText.trim().toLowerCase() === 'close');

	// Reset close confirmation
	function cancelCloseMonth() {
		showCloseConfirm = false;
		closeConfirmText = '';
	}

	// Dev reset confirmation state
	let showDevResetConfirm = $state(false);
	let devResetConfirmed = $state(false);

	// Cancel dev reset
	function cancelDevReset() {
		showDevResetConfirm = false;
		devResetConfirmed = false;
	}

	// Archive delete confirmation state
	let deleteArchiveMonthId = $state<string | null>(null);
	let deleteArchiveConfirmed = $state(false);

	// Show delete confirmation for specific month
	function showDeleteArchive(monthId: string) {
		deleteArchiveMonthId = monthId;
		deleteArchiveConfirmed = false;
	}

	// Cancel archive delete
	function cancelDeleteArchive() {
		deleteArchiveMonthId = null;
		deleteArchiveConfirmed = false;
	}

	// Merge real data with optimistic updates
	const allCategories = $derived(
		[...data.fixedCategories, ...optimisticCategories].filter((c) => !deletedCategoryIds.has(c.id))
	);
	const allExpenses = $derived(
		[...data.privateExpenses, ...optimisticExpenses].filter((e) => !deletedExpenseIds.has(e.id))
	);

	// Helper to get all items for a category (real + optimistic)
	function getCategoryItems(categoryId: string) {
		const category = data.fixedCategories.find((c) => c.id === categoryId);
		const realItems = category?.items || [];
		const optimistic = optimisticItems[categoryId] || [];
		return [...realItems, ...optimistic].filter((item) => !deletedItemIds.has(item.id));
	}
</script>

<h1 class="sr-only">Kosten-Tool</h1>

<!-- Month Period Info - Non-sticky, clean badge -->
<div class="mb-6 overflow-hidden rounded-2xl bg-white shadow-md">
	<div class="flex items-center justify-between bg-gradient-to-r from-primary-50 to-primary-100 px-5 py-4">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Aktueller Monat</p>
				<p class="text-xl font-bold text-primary-900">
					{data.month.year}-{String(data.month.month).padStart(2, '0')}
				</p>
			</div>
		</div>
		<div class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide {data.month.status === 'open' ? 'bg-success-100 text-success-700' : 'bg-neutral-200 text-neutral-700'}">
			{data.month.status === 'open' ? '✓ Aktiv' : 'Geschlossen'}
		</div>
	</div>
</div>

<!-- DEV Tools (only visible in development) -->
{#if import.meta.env.DEV}
	<div class="my-6 overflow-hidden rounded-2xl border-2 border-danger-300 bg-white shadow-lg">
		<div class="bg-gradient-to-r from-danger-50 to-danger-100 px-5 py-4">
			<h3 class="flex items-center gap-2 text-lg font-bold text-danger-900">
				<span class="text-xl">🛠️</span>
				DEV TOOLS <span class="text-xs font-normal">(nicht in Production)</span>
			</h3>
		</div>

		<div class="p-5">
			{#if !showDevResetConfirm}
				<button
					type="button"
					onclick={() => {
						showDevResetConfirm = true;
					}}
					class="w-full rounded-xl bg-danger-100 px-4 py-3 font-semibold text-danger-800 transition-all hover:bg-danger-200 active:scale-95"
				>
					Reset current month (löscht alle Daten)
				</button>
			{:else}
				<div class="space-y-4">
					<div class="rounded-xl border-2 border-danger-400 bg-white p-4">
						<p class="mb-3 font-bold text-danger-700">
							⚠️ Alle Daten des aktuellen Monats werden gelöscht!
						</p>
						<p class="mb-4 text-sm text-neutral-600">
							Fixkosten, Private Ausgaben, Einkommen werden zurückgesetzt. Der Monat bleibt 'open'.
						</p>
						<label class="flex cursor-pointer items-center gap-3">
							<input
								type="checkbox"
								bind:checked={devResetConfirmed}
								class="h-5 w-5 rounded border-danger-300 text-danger-600 focus:ring-danger-500"
							/>
							<span class="text-sm font-medium text-neutral-800">Ich verstehe, dass alle Daten gelöscht werden</span>
						</label>
					</div>

					<form method="POST" action="?/resetMonthDev" class="flex gap-3">
						<input type="hidden" name="monthId" value={data.month.id} />
						<button
							type="button"
							onclick={cancelDevReset}
							class="flex-1 rounded-xl bg-neutral-200 px-4 py-3 font-semibold text-neutral-800 transition-all hover:bg-neutral-300 active:scale-95"
						>
							Abbrechen
						</button>
						<button
							type="submit"
							disabled={!devResetConfirmed}
							class="flex-1 rounded-xl px-4 py-3 font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 {devResetConfirmed
								? 'bg-danger-600 text-white hover:bg-danger-700'
								: 'bg-neutral-300 text-neutral-500'}"
						>
							Jetzt zurücksetzen
						</button>
					</form>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Results Section -->
<div class="my-8">
	<h2 class="mb-6 text-2xl font-bold text-neutral-900">Monatsübersicht</h2>

	<div class="space-y-4">
		<!-- Card 1: Fixkosten - Primary Indigo -->
		<div class="overflow-hidden rounded-2xl border-2 border-primary-200 bg-white shadow-md transition-all hover:shadow-lg">
			<div class="bg-gradient-to-r from-primary-50 to-primary-100 px-5 py-4">
				<h3 class="flex items-center gap-2 text-lg font-bold text-primary-900">
					<span class="text-xl">🏠</span>
					Fixkosten
				</h3>
			</div>
			<div class="space-y-3 p-5">
				<div class="flex justify-between items-center">
					<span class="text-sm text-neutral-600">Gesamt Fixkosten:</span>
					<span class="text-lg font-bold text-neutral-900">{formatEuro(data.computed.totalFixedCosts)}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-sm text-neutral-600">Dein Anteil:</span>
					<span class="text-2xl font-bold text-primary-600">{formatEuro(data.computed.myFixedShare)}</span>
				</div>
				<div class="mt-3 border-t border-primary-100 pt-3">
					<span class="text-xs text-neutral-500"
						>Dein Einkommensanteil: {formatPct(data.computed.shareMe)}</span
					>
				</div>
			</div>
		</div>

		<!-- Card 2: Vorauszahlung - Accent Pink -->
		<div class="overflow-hidden rounded-2xl border-2 border-accent-200 bg-white shadow-md transition-all hover:shadow-lg">
			<div class="bg-gradient-to-r from-accent-50 to-accent-100 px-5 py-4">
				<h3 class="flex items-center gap-2 text-lg font-bold text-accent-900">
					<span class="text-xl">💳</span>
					Vorauszahlung & Ausgleich
				</h3>
			</div>
			<div class="space-y-3 p-5">
				<div class="flex justify-between items-center">
					<span class="text-sm text-neutral-600">Deine Fixkosten (Anteil):</span>
					<span class="font-bold text-primary-600">{formatEuro(data.computed.fixedCostDue)}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-sm text-neutral-600">Vorauszahlung (diesen Monat):</span>
					<span class="font-bold text-accent-600">{formatEuro(data.computed.prepaymentThisMonth)}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-sm text-neutral-600">Fehlbetrag:</span>
					<span class="font-bold text-danger-600">{formatEuro(data.computed.fixedCostShortfall)}</span>
				</div>
				<div class="flex justify-between items-center">
					<span class="text-sm text-neutral-600">Überzahlung:</span>
					<span class="font-bold text-success-600">{formatEuro(data.computed.fixedCostOverpayment)}</span>
				</div>
			</div>
		</div>

		<!-- Card 3: Schulden - Warning Amber -->
		<div class="overflow-hidden rounded-2xl border-2 border-warning-200 bg-white shadow-md transition-all hover:shadow-lg">
			<div class="bg-gradient-to-r from-warning-50 to-warning-100 px-5 py-4">
				<h3 class="flex items-center gap-2 text-lg font-bold text-warning-900">
					<span class="text-xl">📊</span>
					Schulden an Steffi
				</h3>
			</div>
			<div class="space-y-3 p-5">
				<div class="flex justify-between items-center text-sm">
					<span class="text-neutral-600">Schulden vom Vormonat:</span>
					<span class="font-semibold text-neutral-700">{formatEuro(data.computed.privateBalanceStart)}</span>
				</div>
				<div class="flex justify-between items-center text-sm">
					<span class="text-neutral-600">+ Private Ausgaben:</span>
					<span class="font-semibold text-neutral-700">{formatEuro(data.computed.privateAddedThisMonth)}</span>
				</div>
				<div class="flex justify-between items-center text-sm">
					<span class="text-neutral-600">+ Dein Anteil Fixkosten:</span>
					<span class="font-semibold text-neutral-700">{formatEuro(data.computed.fixedCostDue)}</span>
				</div>
				<div class="flex justify-between items-center text-sm">
					<span class="text-neutral-600">- Vorauszahlung:</span>
					<span class="font-semibold text-neutral-700">-{formatEuro(data.computed.prepaymentThisMonth)}</span>
				</div>
				<div class="mt-4 border-t-2 border-warning-200 pt-4">
					<div class="flex justify-between items-center">
						<span class="font-bold text-neutral-800">Aktuelle Schulden:</span>
						<span class="text-3xl font-black text-warning-600"
							>{formatEuro(data.computed.privateBalanceEnd)}</span
						>
					</div>
				</div>
			</div>
		</div>

		<!-- Card 4: Empfehlung - Success/Danger Dynamic -->
		<div
			class="overflow-hidden rounded-2xl border-2 {data.computed.privateBalanceEnd > 0 ? 'border-danger-200' : 'border-success-200'} bg-white shadow-lg"
		>
			<div class="bg-gradient-to-r {data.computed.privateBalanceEnd > 0 ? 'from-danger-50 to-danger-100' : 'from-success-50 to-success-100'} px-5 py-4">
				<h3 class="flex items-center gap-2 text-lg font-bold {data.computed.privateBalanceEnd > 0 ? 'text-danger-900' : 'text-success-900'}">
					<span class="text-xl">💡</span>
					Empfehlung für dich
				</h3>
			</div>
			<div class="space-y-4 p-5">
				{#if data.computed.privateBalanceEnd > 0}
					<!-- Christian schuldet Steffi Geld -->
					<div class="rounded-xl bg-danger-50 p-4">
						<p class="mb-3 text-center text-sm font-medium text-neutral-700">
							Überweise an Steffi, um alle Schulden auszugleichen:
						</p>
						<p class="text-center text-4xl font-black text-danger-600">
							{formatEuro(data.computed.privateBalanceEnd)}
						</p>
					</div>
					<div class="rounded-xl bg-primary-50 p-4">
						<p class="mb-2 text-sm font-bold text-primary-900">Das deckt ab:</p>
						<ul class="ml-4 space-y-1 text-sm text-neutral-700">
							{#if data.computed.privateBalanceStart > 0}
								<li class="flex items-center gap-2">
									<span class="text-danger-500">•</span>
									Schulden vom Vormonat: {formatEuro(data.computed.privateBalanceStart)}
								</li>
							{/if}
							{#if data.computed.privateAddedThisMonth > 0}
								<li class="flex items-center gap-2">
									<span class="text-danger-500">•</span>
									Private Ausgaben: {formatEuro(data.computed.privateAddedThisMonth)}
								</li>
							{/if}
							{#if data.computed.fixedCostShortfall > 0}
								<li class="flex items-center gap-2">
									<span class="text-danger-500">•</span>
									Fehlender Fixkosten-Anteil: {formatEuro(data.computed.fixedCostShortfall)}
								</li>
							{/if}
						</ul>
					</div>
					
					<!-- Next month recommendation -->
					<div class="rounded-xl border-2 border-accent-200 bg-accent-50 p-4">
						<p class="mb-1 flex items-center gap-2 text-sm font-bold text-accent-900">
							<span>📅</span>
							Für den nächsten Monat:
						</p>
						<p class="text-sm text-neutral-700">
							Empfohlene Vorauszahlung: <strong class="text-accent-700">{formatEuro(data.computed.recommendedPrepayment)}</strong>
						</p>
						<p class="mt-2 text-xs text-neutral-600">
							Überweise dies zu Monatsbeginn, um Steffi nicht in Vorleistung gehen zu lassen.
						</p>
					</div>
				{:else if data.computed.privateBalanceEnd < 0}
					<!-- Christian hat vorausgezahlt -->
					<div class="rounded-xl bg-success-50 p-4">
						<p class="mb-3 text-center text-sm font-medium text-neutral-700">Du hast mehr gezahlt als nötig:</p>
						<p class="text-center text-4xl font-black text-success-600">
							+{formatEuro(Math.abs(data.computed.privateBalanceEnd))}
						</p>
					</div>
					<p class="rounded-xl bg-success-100 p-4 text-sm text-neutral-700">
						Dieses Guthaben wird automatisch im nächsten Monat verrechnet. Du musst aktuell nichts
						überweisen.
					</p>
					
					<!-- Next month recommendation -->
					<div class="rounded-xl border-2 border-accent-200 bg-accent-50 p-4">
						<p class="mb-1 flex items-center gap-2 text-sm font-bold text-accent-900">
							<span>📅</span>
							Für den nächsten Monat:
						</p>
						<p class="text-sm text-neutral-700">
							Empfohlene Vorauszahlung: <strong class="text-accent-700">{formatEuro(data.computed.recommendedPrepayment)}</strong>
						</p>
						<p class="mt-2 text-xs text-neutral-600">
							Da du ein Guthaben hast, kannst du weniger überweisen oder abwarten.
						</p>
					</div>
				{:else}
					<!-- Alles ausgeglichen -->
					<div class="rounded-xl bg-success-50 p-4 text-center">
						<p class="text-3xl font-black text-success-600">✓ Alles ausgeglichen</p>
						<p class="mt-2 text-sm text-neutral-600">Du hast keine offenen Schulden bei Steffi.</p>
					</div>
					
					<!-- Next month recommendation -->
					<div class="rounded-xl border-2 border-accent-200 bg-accent-50 p-4">
						<p class="mb-1 flex items-center gap-2 text-sm font-bold text-accent-900">
							<span>📅</span>
							Für den nächsten Monat:
						</p>
						<p class="text-sm text-neutral-700">
							Empfohlene Vorauszahlung: <strong class="text-accent-700">{formatEuro(data.computed.recommendedPrepayment)}</strong>
						</p>
						<p class="mt-2 text-xs text-neutral-600">
							Überweise dies zu Monatsbeginn für einen sauberen Start.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Edit Incomes -->
<div class="my-6 overflow-hidden rounded-2xl border-2 border-success-200 bg-white shadow-md">
	<div class="bg-gradient-to-r from-success-50 to-success-100 px-5 py-4">
		<div class="flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-bold text-success-900">
				<span class="text-xl">💵</span>
				Einkommen
			</h2>
			{#if !editingIncomes}
				<button
					type="button"
					onclick={() => {
						editingIncomes = true;
					}}
					class="rounded-lg bg-success-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-success-700 active:scale-95"
				>
					Bearbeiten
				</button>
			{/if}
		</div>
	</div>

	<div class="p-5">
		{#if form?.error}
			<div class="mb-4 rounded-xl border-2 border-danger-200 bg-danger-50 p-4 text-sm font-medium text-danger-700">
				{form.error}
			</div>
		{/if}

		{#if editingIncomes}
			<!-- Edit Mode -->
			<form
				method="POST"
				action="?/saveIncomes"
				class="space-y-4"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							editingIncomes = false;
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />

				{#each data.profiles as profile}
					<div class="flex flex-col">
						<label for="income_{profile.id}" class="mb-2 text-sm font-semibold text-neutral-700">
							{profile.name || profile.role}
						</label>
						<input
							type="number"
							id="income_{profile.id}"
							name="income_{profile.id}"
							value={getIncomeForProfile(profile.id)}
							step="0.01"
							min="0"
							required
							class="rounded-xl border-2 border-neutral-300 px-4 py-3 text-lg transition-all focus:border-success-500 focus:ring-4 focus:ring-success-100 focus:outline-none"
						/>
					</div>
				{/each}

				<div class="flex gap-3 pt-2">
					<button
						type="submit"
						class="flex-1 rounded-xl bg-success-600 px-6 py-3 font-bold text-white transition-all hover:bg-success-700 active:scale-95"
					>
						Speichern
					</button>
					<button
						type="button"
						onclick={() => {
							editingIncomes = false;
						}}
						class="rounded-xl bg-neutral-200 px-6 py-3 font-semibold text-neutral-700 transition-all hover:bg-neutral-300 active:scale-95"
					>
						Abbrechen
					</button>
				</div>
			</form>
		{:else}
			<!-- Display Mode -->
			<div class="space-y-3">
				{#each data.profiles as profile}
					<div class="flex items-center justify-between rounded-xl bg-success-50 px-4 py-3">
						<span class="font-semibold text-neutral-700">{profile.name || profile.role}</span>
						<span class="text-xl font-bold text-success-600"
							>{formatEuro(getIncomeForProfile(profile.id))}</span
						>
					</div>
				{/each}
			</div>

			<!-- Income Shares Display -->
			<div class="mt-4 border-t-2 border-success-100 pt-4">
				<p class="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Berechnete Einkommensanteile</p>
				<div class="flex gap-4 text-sm">
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-primary-500"></div>
						<span class="font-semibold">Christian: {formatPct(data.computed.shareMe)}</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="h-3 w-3 rounded-full bg-accent-500"></div>
						<span class="font-semibold">Steffi: {formatPct(data.computed.sharePartner)}</span>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Fixed Costs Section -->
<div class="my-8">
	<h2 class="mb-4 text-2xl font-semibold">Fixkosten</h2>

	<!-- Add Category Form -->
	<div class="mb-6 rounded border border-blue-200 bg-blue-50 p-4">
		<h3 class="mb-3 font-semibold">Neue Kategorie</h3>
		<form
			method="POST"
			action="?/addCategory"
			class="flex flex-col gap-2 sm:flex-row"
			use:enhance={({ formData }) => {
				// Optimistic UI: Show category immediately
				const label = formData.get('label') as string;
				const tempId = `temp-${Date.now()}`;
				optimisticCategories = [...optimisticCategories, { id: tempId, label, items: [] }];

				return async ({ result, update, formElement }) => {
					await update();
					// Remove optimistic category (real one is now in data)
					optimisticCategories = optimisticCategories.filter((c) => c.id !== tempId);
					if (result.type === 'success') {
						formElement.reset();
					}
				};
			}}
		>
			<input type="hidden" name="monthId" value={data.month.id} />
			<input
				type="text"
				name="label"
				placeholder="z.B. Wohnung, Versicherungen..."
				required
				class="flex-1 rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			/>
			<button
				type="submit"
				class="rounded bg-blue-600 px-4 py-2 whitespace-nowrap text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
			>
				Kategorie hinzufügen
			</button>
		</form>
	</div>

	<!-- Categories List -->
	{#if allCategories.length === 0}
		<p class="py-8 text-center text-gray-500">Noch keine Fixkosten-Kategorien vorhanden.</p>
	{:else}
		<div class="space-y-6">
			{#each allCategories as category}
				<div
					class="overflow-hidden rounded-lg border border-gray-300 {category.id.startsWith('temp-')
						? 'opacity-70'
						: ''}"
				>
					<!-- Category Header -->
					<div class="flex items-center justify-between bg-gray-100 p-4">
						<h3 class="text-lg font-semibold">{category.label}</h3>
						<form
							method="POST"
							action="?/deleteCategory"
							use:enhance={({ formData }) => {
								// First, show confirm dialog
								const categoryId = formData.get('categoryId') as string;

								return async ({ result, update }) => {
									if (result.type === 'success') {
										// Optimistic: Remove category immediately
										deletedCategoryIds = new Set([...deletedCategoryIds, categoryId]);
										await update();
										// Cleanup: Remove from deleted set (it's now gone from data)
										deletedCategoryIds = new Set(
											[...deletedCategoryIds].filter((id) => id !== categoryId)
										);
									} else {
										await update();
									}
								};
							}}
							onsubmit={(e) => {
								if (!confirm('Kategorie und alle Items löschen?')) {
									e.preventDefault();
								}
							}}
						>
							<input type="hidden" name="categoryId" value={category.id} />
							<button
								type="submit"
								class="rounded bg-red-100 px-3 py-1 text-sm text-red-700 transition-colors hover:bg-red-200"
							>
								Kategorie löschen
							</button>
						</form>
					</div>

					<!-- Items List -->
					<div class="space-y-3 p-4">
						{#if getCategoryItems(category.id).length === 0}
							<p class="text-sm text-gray-500">Keine Items in dieser Kategorie</p>
						{:else}
							{#each getCategoryItems(category.id) as item}
								<div
									class="rounded border border-gray-200 bg-white p-3 {item.id.startsWith('temp-')
										? 'opacity-60'
										: ''}"
								>
									{#if editingItemId === item.id}
										<!-- Edit Mode -->
										<form
											method="POST"
											action="?/updateItem"
											class="space-y-3"
											use:enhance={() => {
												return async ({ result, update }) => {
													if (result.type === 'success') {
														editingItemId = null;
													}
													await update();
												};
											}}
										>
											<input type="hidden" name="itemId" value={item.id} />

											<!-- Item Label -->
											<div>
												<label class="mb-1 block text-sm font-medium">Bezeichnung</label>
												<input
													type="text"
													name="label"
													value={item.label}
													required
													class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
												/>
											</div>

											<!-- Amount -->
											<div>
												<label class="mb-1 block text-sm font-medium">Betrag (€)</label>
												<input
													type="number"
													name="amount"
													value={item.amount}
													step="0.01"
													min="0"
													required
													class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
												/>
											</div>

											<!-- Split Mode -->
											<div>
												<label class="mb-2 block text-sm font-medium">Aufteilung</label>
												<div class="grid grid-cols-3 gap-2">
													<label class="flex cursor-pointer items-center space-x-2">
														<input
															type="radio"
															name="splitMode"
															value="income"
															checked={item.splitMode === 'income' || item.splitMode === 'half'}
															class="h-4 w-4 text-green-600 focus:ring-green-500"
														/>
														<span class="text-sm">Gemeinsam</span>
													</label>
													<label class="flex cursor-pointer items-center space-x-2">
														<input
															type="radio"
															name="splitMode"
															value="me"
															checked={item.splitMode === 'me'}
															class="h-4 w-4 text-green-600 focus:ring-green-500"
														/>
														<span class="text-sm">Nur Christian</span>
													</label>
													<label class="flex cursor-pointer items-center space-x-2">
														<input
															type="radio"
															name="splitMode"
															value="partner"
															checked={item.splitMode === 'partner'}
															class="h-4 w-4 text-green-600 focus:ring-green-500"
														/>
														<span class="text-sm">Nur Steffi</span>
													</label>
												</div>

												<!-- Share Preview -->
												<div class="mt-2 rounded bg-blue-50 p-2 text-xs text-gray-700">
													<span class="font-medium">Du zahlst:</span>
													<span class="font-semibold text-blue-700"
														>{formatEuro(calculateMyItemShare(item.amount, item.splitMode))}</span
													>
													<span class="ml-1 text-gray-500"
														>{getSplitModeLabel(item.splitMode, item.amount)}</span
													>
												</div>
											</div>

											<!-- Action Buttons -->
											<div class="flex gap-2">
												<button
													type="submit"
													class="flex-1 rounded bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
												>
													Speichern
												</button>
												<button
													type="button"
													onclick={() => {
														editingItemId = null;
													}}
													class="rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
												>
													Abbrechen
												</button>
											</div>
										</form>
									{:else}
										<!-- Display Mode -->
										<div class="flex items-center justify-between">
											<div class="flex-1">
												<div class="flex items-baseline gap-3">
													<span class="font-medium text-gray-900">{item.label}</span>
													<span class="text-lg font-semibold text-blue-600"
														>{formatEuro(item.amount)}</span
													>
												</div>
												<div class="mt-1 flex items-center gap-2 text-sm text-gray-600">
													<span class="font-medium"
														>Du zahlst: {formatEuro(
															calculateMyItemShare(item.amount, item.splitMode)
														)}</span
													>
													<span class="text-xs text-gray-500"
														>{getSplitModeLabel(item.splitMode, item.amount)}</span
													>
												</div>
											</div>
											<div class="flex gap-2">
												<button
													type="button"
													onclick={() => {
														editingItemId = item.id;
													}}
													class="rounded bg-blue-50 px-3 py-1 text-sm text-blue-700 transition-colors hover:bg-blue-100"
												>
													Bearbeiten
												</button>
												<form
													method="POST"
													action="?/deleteItem"
													use:enhance={({ formData }) => {
														const itemId = formData.get('itemId') as string;

														return async ({ result, update }) => {
															if (result.type === 'success') {
																// Optimistic: Remove item immediately
																deletedItemIds = new Set([...deletedItemIds, itemId]);
																await update();
																// Cleanup
																deletedItemIds = new Set(
																	[...deletedItemIds].filter((id) => id !== itemId)
																);
															} else {
																await update();
															}
														};
													}}
												>
													<input type="hidden" name="itemId" value={item.id} />
													<button
														type="submit"
														class="rounded bg-red-50 px-3 py-1 text-sm text-red-700 transition-colors hover:bg-red-100"
														onclick={(e) => {
															if (!confirm('Item löschen?')) {
																e.preventDefault();
															}
														}}
													>
														Löschen
													</button>
												</form>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						{/if}

						<!-- Add Item Form -->
						{#if addingCategoryId === category.id}
							<div class="mt-4 rounded border-2 border-blue-200 bg-blue-50 p-4">
								<h4 class="mb-3 text-sm font-semibold text-blue-900">Neues Item hinzufügen</h4>
								<form
									method="POST"
									action="?/addItem"
									class="space-y-3"
									use:enhance={({ formData }) => {
										// Optimistic UI: Show item immediately
										const label = formData.get('label') as string;
										const amount = parseFloat(formData.get('amount') as string);
										const splitMode = formData.get('splitMode') as string;
										const tempId = `temp-${Date.now()}`;

										const tempItem = {
											id: tempId,
											label,
											amount,
											splitMode
										};

										// Add to optimistic items for this category
										const catId = category.id;
										optimisticItems = {
											...optimisticItems,
											[catId]: [...(optimisticItems[catId] || []), tempItem]
										};

										return async ({ result, update, formElement }) => {
											await update();
											// Remove optimistic item
											optimisticItems = {
												...optimisticItems,
												[catId]: (optimisticItems[catId] || []).filter((i) => i.id !== tempId)
											};
											if (result.type === 'success') {
												addingCategoryId = null;
												formElement.reset();
											}
										};
									}}
								>
									<input type="hidden" name="categoryId" value={category.id} />

									<div>
										<input
											type="text"
											name="label"
											placeholder="Bezeichnung (z.B. Miete)"
											required
											class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
										/>
									</div>

									<div>
										<input
											type="number"
											name="amount"
											placeholder="Betrag"
											step="0.01"
											min="0"
											required
											class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
										/>
									</div>

									<div>
										<label class="mb-2 block text-sm font-medium">Aufteilung</label>
										<select
											name="splitMode"
											required
											class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
										>
											<option value="income">Gemeinsam (einkommensbasiert)</option>
											<option value="me">Nur Christian</option>
											<option value="partner">Nur Steffi</option>
										</select>
									</div>

									<div class="flex gap-2">
										<button
											type="submit"
											class="flex-1 rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
										>
											Item hinzufügen
										</button>
										<button
											type="button"
											onclick={() => {
												addingCategoryId = null;
											}}
											class="rounded bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
										>
											Abbrechen
										</button>
									</div>
								</form>
							</div>
						{:else}
							<button
								type="button"
								onclick={() => {
									addingCategoryId = category.id;
								}}
								class="mt-4 w-full rounded border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
							>
								+ Neues Item hinzufügen
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Month Prepayment Section -->
<div class="my-6 overflow-hidden rounded-2xl border-2 border-accent-200 bg-white shadow-md">
	<div class="bg-gradient-to-r from-accent-50 to-accent-100 px-5 py-4">
		<h2 class="flex items-center gap-2 text-lg font-bold text-accent-900">
			<span class="text-xl">💳</span>
			Vorauszahlung (diesen Monat)
		</h2>
		<p class="mt-2 text-sm text-neutral-600">
			Trage hier ein, wie viel du zu Monatsbeginn an Steffi für deine Fixkosten überwiesen hast.
		</p>
	</div>
	
	<div class="p-5">
		<form method="POST" action="?/savePrepayment" class="space-y-4" use:enhance>
			<input type="hidden" name="monthId" value={data.month.id} />
			<div class="flex flex-col">
				<label for="prepayment" class="mb-2 text-sm font-semibold text-neutral-700">
					Betrag in €
				</label>
				<input
					type="number"
					id="prepayment"
					name="prepayment"
					value={data.month.total_transfer_this_month || 0}
					step="0.01"
					min="0"
					required
					placeholder="z.B. 800.00"
					class="rounded-xl border-2 border-neutral-300 px-4 py-3 text-xl font-bold transition-all focus:border-accent-500 focus:ring-4 focus:ring-accent-100 focus:outline-none"
				/>
			</div>
			<button
				type="submit"
				class="w-full rounded-xl bg-accent-600 px-6 py-3 font-bold text-white transition-all hover:bg-accent-700 active:scale-95"
			>
				Vorauszahlung speichern
			</button>
		</form>
		{#if data.computed.recommendedPrepayment > 0}
			<div class="mt-4 rounded-xl bg-primary-50 px-4 py-3">
				<p class="flex items-center gap-2 text-sm text-neutral-700">
					<span class="text-lg">💡</span>
					<span>
						<strong class="text-primary-700">Empfehlung:</strong> 
						{formatEuro(data.computed.recommendedPrepayment)} (basierend auf deinem Fixkosten-Anteil)
					</span>
				</p>
			</div>
		{/if}
	</div>
</div>

<!-- Private Expenses Section -->
<div class="my-8">
	<h2 class="mb-4 text-2xl font-semibold">Private Ausgaben (Christian)</h2>

	<!-- Add Expense Form -->
	<div class="mb-6 rounded border border-orange-200 bg-orange-50 p-4">
		<h3 class="mb-3 font-semibold">Neue Ausgabe</h3>
		<form
			method="POST"
			action="?/addPrivateExpense"
			class="space-y-3"
			use:enhance={({ formData }) => {
				// Optimistic UI: Show expense immediately
				const dateISO = formData.get('dateISO') as string;
				const description = formData.get('description') as string;
				const amount = parseFloat(formData.get('amount') as string);
				const tempId = `temp-${Date.now()}`;

				const tempExpense = {
					id: tempId,
					date: dateISO,
					description,
					amount
				};

				optimisticExpenses = [...optimisticExpenses, tempExpense];

				return async ({ result, update, formElement }) => {
					await update();
					// Remove optimistic expense
					optimisticExpenses = optimisticExpenses.filter((e) => e.id !== tempId);
					if (result.type === 'success') {
						formElement.reset();
					}
				};
			}}
		>
			<input type="hidden" name="monthId" value={data.month.id} />

			<div>
				<label for="expense-date" class="mb-1 block text-sm font-medium">Datum</label>
				<input
					type="date"
					id="expense-date"
					name="dateISO"
					required
					class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
				/>
			</div>

			<div>
				<label for="expense-description" class="mb-1 block text-sm font-medium">
					Beschreibung
				</label>
				<input
					type="text"
					id="expense-description"
					name="description"
					placeholder="z.B. Einkauf, Tankstelle..."
					required
					class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
				/>
			</div>

			<div>
				<label for="expense-amount" class="mb-1 block text-sm font-medium">Betrag (€)</label>
				<input
					type="number"
					id="expense-amount"
					name="amount"
					step="0.01"
					min="0"
					required
					class="w-full rounded border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded bg-orange-600 px-4 py-2 text-white transition-colors hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
			>
				Ausgabe hinzufügen
			</button>
		</form>
	</div>

	<!-- Expenses List -->
	{#if allExpenses.length === 0}
		<p class="py-8 text-center text-gray-500">Noch keine privaten Ausgaben erfasst.</p>
	{:else}
		<div class="space-y-3">
			{#each allExpenses as expense}
				<div
					class="flex items-start justify-between rounded border border-gray-300 bg-white p-4 {expense.id.startsWith(
						'temp-'
					)
						? 'opacity-60'
						: ''}"
				>
					<div class="flex-1">
						<div class="mb-1 text-sm text-gray-600">{expense.date}</div>
						<div class="mb-1 font-medium">{expense.description}</div>
						<div class="text-lg font-semibold text-orange-600">{expense.amount.toFixed(2)} €</div>
					</div>
					<form
						method="POST"
						action="?/deletePrivateExpense"
						use:enhance={({ formData }) => {
							const expenseId = formData.get('expenseId') as string;

							return async ({ result, update }) => {
								if (result.type === 'success') {
									// Optimistic: Remove expense immediately
									deletedExpenseIds = new Set([...deletedExpenseIds, expenseId]);
									await update();
									// Cleanup
									deletedExpenseIds = new Set(
										[...deletedExpenseIds].filter((id) => id !== expenseId)
									);
								} else {
									await update();
								}
							};
						}}
					>
						<input type="hidden" name="expenseId" value={expense.id} />
						<button
							type="submit"
							class="rounded bg-red-100 px-3 py-1 text-sm text-red-700 transition-colors hover:bg-red-200"
							onclick={(e) => {
								if (!confirm('Ausgabe löschen?')) {
									e.preventDefault();
								}
							}}
						>
							Löschen
						</button>
					</form>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Close Month Section -->
{#if data.month.status === 'open'}
	<div
		class="my-8 rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 p-6"
	>
		<h2 class="mb-3 text-xl font-semibold text-yellow-900">📊 Monat abschließen</h2>

		{#if !showCloseConfirm}
			<!-- Step 1: Initial button -->
			<p class="mb-4 text-sm text-gray-700">
				Schließt den aktuellen Monat und übernimmt den Endsaldo ({formatEuro(
					data.computed.privateBalanceEnd
				)}) in den nächsten Monat.
			</p>
			<button
				type="button"
				onclick={() => {
					showCloseConfirm = true;
				}}
				class="w-full rounded-lg bg-yellow-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
			>
				Monat abschließen
			</button>
		{:else}
			<!-- Step 2: Confirmation area -->
			<div class="space-y-4">
				<div class="rounded-lg border-2 border-red-400 bg-white p-4">
					<p class="mb-2 text-sm font-semibold text-red-700">
						⚠️ Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
					</p>
					<p class="mb-3 text-sm text-gray-700">
						Der Monat wird geschlossen und der Endsaldo von <strong
							>{formatEuro(data.computed.privateBalanceEnd)}</strong
						> wird als Startguthaben in den nächsten Monat übernommen.
					</p>
					<div class="space-y-2">
						<label for="close-confirm" class="block text-sm font-medium text-gray-800">
							Tippe <span class="font-mono font-bold text-red-600">CLOSE</span> zur Bestätigung:
						</label>
						<input
							type="text"
							id="close-confirm"
							bind:value={closeConfirmText}
							placeholder="CLOSE"
							autofocus
							class="w-full rounded border-2 border-gray-300 px-3 py-2 font-mono focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none"
						/>
					</div>
				</div>

			<form
				method="POST"
				action="?/closeMonth"
				class="flex flex-col gap-2 sm:flex-row"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							// Month closed successfully - reload page to create next month
							window.location.href = '/';
						}
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				<input type="hidden" name="privateBalanceEnd" value={data.computed.privateBalanceEnd} />

				<button
					type="button"
					onclick={cancelCloseMonth}
					class="flex-1 rounded-lg bg-gray-200 px-4 py-3 font-medium text-gray-800 transition-colors hover:bg-gray-300 focus:ring-2 focus:ring-gray-400 focus:outline-none"
				>
					Abbrechen
				</button>

				<button
					type="submit"
					disabled={!isCloseConfirmed}
					class="flex-1 rounded-lg px-4 py-3 font-semibold transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 {isCloseConfirmed
						? 'bg-red-600 text-white hover:bg-red-700'
						: 'bg-gray-300 text-gray-500'}"
				>
					Monat endgültig abschließen
				</button>
			</form>
			</div>
		{/if}
	</div>
{/if}

<!-- Archive Section -->
{#if data.closedMonths && data.closedMonths.length > 0}
	<div class="my-8">
		<h2 class="mb-4 text-2xl font-semibold">📦 Archiv</h2>
		<div class="space-y-3">
			{#each data.closedMonths as closedMonth}
				<div class="rounded-lg border border-gray-300 bg-gray-50 p-4">
					{#if deleteArchiveMonthId === closedMonth.id}
						<!-- Delete Confirmation -->
						<div class="space-y-3">
							<div class="rounded border border-red-400 bg-white p-3">
								<p class="mb-2 text-sm font-semibold text-red-700">
									⚠️ Monat {closedMonth.year}-{String(closedMonth.month).padStart(2, '0')} wirklich löschen?
								</p>
								<p class="mb-3 text-xs text-gray-600">
									Alle Daten dieses Monats werden permanent gelöscht. Diese Aktion kann nicht
									rückgängig gemacht werden!
								</p>
								<label class="flex cursor-pointer items-center space-x-2">
									<input
										type="checkbox"
										bind:checked={deleteArchiveConfirmed}
										class="h-4 w-4 rounded text-red-600 focus:ring-red-500"
									/>
									<span class="text-sm text-gray-800"
										>Ich verstehe, dass alle Daten permanent gelöscht werden</span
									>
								</label>
							</div>

							<form method="POST" action="?/deleteArchivedMonth" class="flex gap-2">
								<input type="hidden" name="monthId" value={closedMonth.id} />
								<button
									type="button"
									onclick={cancelDeleteArchive}
									class="flex-1 rounded bg-gray-200 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-300"
								>
									Abbrechen
								</button>
								<button
									type="submit"
									disabled={!deleteArchiveConfirmed}
									class="flex-1 rounded px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 {deleteArchiveConfirmed
										? 'bg-red-600 text-white hover:bg-red-700'
										: 'bg-gray-300 text-gray-500'}"
								>
									Endgültig löschen
								</button>
							</form>
						</div>
					{:else}
						<!-- Normal Display -->
						<div class="mb-3 flex items-start justify-between">
							<h3 class="text-lg font-semibold text-gray-800">
								{closedMonth.year}-{String(closedMonth.month).padStart(2, '0')}
							</h3>
							<div class="flex items-center gap-3">
								{#if closedMonth.closed_at}
									<span class="text-xs text-gray-500">
										Geschlossen: {new Date(closedMonth.closed_at).toLocaleDateString('de-DE')}
									</span>
								{/if}
								{#if import.meta.env.DEV}
									<button
										type="button"
										onclick={() => showDeleteArchive(closedMonth.id)}
										class="rounded bg-red-100 px-2 py-1 text-xs text-red-700 transition-colors hover:bg-red-200"
										title="Monat löschen (DEV)"
									>
										🗑️ Löschen
									</button>
								{/if}
							</div>
						</div>
						<div class="grid grid-cols-2 gap-3 text-sm">
							<div>
								<span class="text-gray-600">Startsaldo:</span>
								<span class="ml-2 font-semibold"
									>{formatEuro(closedMonth.private_balance_start)}</span
								>
							</div>
							<div>
								<span class="text-gray-600">Endsaldo:</span>
								<span class="ml-2 font-semibold"
									>{formatEuro(closedMonth.private_balance_end || 0)}</span
								>
							</div>
							<div>
								<span class="text-gray-600">Transfer:</span>
								<span class="ml-2 font-semibold"
									>{formatEuro(closedMonth.total_transfer_this_month)}</span
								>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<p class="mt-8 text-sm text-gray-600">
	Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation
</p>
