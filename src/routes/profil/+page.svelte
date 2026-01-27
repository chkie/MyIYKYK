<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types.js';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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
	function formatMonthYear(year: number, month: number): string {
		return new Intl.DateTimeFormat('de-DE', {
			month: 'long',
			year: 'numeric'
		}).format(new Date(year, month - 1));
	}

	// Loading states
	let savingIncomes = $state(false);
	let savingPrepayment = $state(false);
	let closingMonth = $state(false);
	let resettingMonth = $state(false);

	// Edit mode states
	let editingIncomes = $state(false);
	let editingPrepayment = $state(false);

	// Get profiles
	const meProfile = $derived(data.profiles?.find((p: any) => p.role === 'me'));
	const partnerProfile = $derived(data.profiles?.find((p: any) => p.role === 'partner'));
	
	const meIncome = $derived(data.incomes.find((i: any) => i.profile_id === meProfile?.id));
	const partnerIncome = $derived(data.incomes.find((i: any) => i.profile_id === partnerProfile?.id));
</script>

<svelte:head>
	<title>Profil - Kosten-Tool</title>
</svelte:head>

<h1 class="mb-6 text-3xl font-black text-neutral-900">Profil & Einstellungen</h1>

<!-- Einkommen Card -->
<div class="mb-6 overflow-hidden rounded-2xl border-2 border-success-200 bg-white shadow-lg">
	<div class="bg-linear-to-r from-emerald-100 to-emerald-200 px-5 py-4">
		<div class="flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-bold text-success-900">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Einkommen
			</h2>
			{#if !editingIncomes}
				<button
					onclick={() => { editingIncomes = true; }}
					class="rounded-lg px-3 py-1.5 text-sm font-medium text-success-700 transition-colors hover:bg-success-200/50"
					aria-label="Einkommen bearbeiten"
				>
					Bearbeiten
				</button>
			{/if}
		</div>
	</div>
	<div class="p-5">
		{#if editingIncomes}
			<form
				method="POST"
				action="?/saveIncomes"
				use:enhance={() => {
					savingIncomes = true;
					return async ({ result, update }) => {
						await update();
						savingIncomes = false;
						if (result.type === 'success') {
							editingIncomes = false;
						}
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				
				{#if meProfile && meIncome}
					<div class="mb-4">
						<label class="mb-2 block text-sm font-semibold text-neutral-700" for="income_me">
							{meProfile.name} (Du)
						</label>
						<div class="flex items-center gap-2">
							<input
								id="income_me"
								type="number"
								name="income_{meProfile.id}"
								value={meIncome.net_income}
								inputmode="decimal"
								enterkeyhint="next"
								autocomplete="off"
								step="0.01"
								min="0"
								placeholder="0.00"
								class="flex-1 rounded-lg border-2 border-neutral-300 px-4 py-3 text-lg font-semibold transition-all focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-200"
								required
							/>
							<span class="font-semibold text-neutral-600">€</span>
						</div>
					</div>
				{/if}

				{#if partnerProfile && partnerIncome}
					<div class="mb-4">
						<label class="mb-2 block text-sm font-semibold text-neutral-700" for="income_partner">
							{partnerProfile.name}
						</label>
						<div class="flex items-center gap-2">
							<input
								id="income_partner"
								type="number"
								name="income_{partnerProfile.id}"
								value={partnerIncome.net_income}
								inputmode="decimal"
								enterkeyhint="done"
								autocomplete="off"
								step="0.01"
								min="0"
								placeholder="0.00"
								class="flex-1 rounded-lg border-2 border-neutral-300 px-4 py-3 text-lg font-semibold transition-all focus:border-success-500 focus:outline-none focus:ring-2 focus:ring-success-200"
								required
							/>
							<span class="font-semibold text-neutral-600">€</span>
						</div>
					</div>
				{/if}

				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => { editingIncomes = false; }}
						class="flex-1 rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 font-bold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-95"
					>
						Abbrechen
					</button>
					<button
						type="submit"
						disabled={savingIncomes}
						class="flex-1 rounded-xl bg-success-600 px-4 py-3 font-bold text-white transition-all hover:bg-success-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{savingIncomes ? 'Speichert...' : 'Speichern'}
					</button>
				</div>
			</form>
		{:else}
			<!-- Read mode -->
			<div class="space-y-3">
				{#if meProfile && meIncome}
					<div class="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
						<span class="text-sm font-semibold text-neutral-700">{meProfile.name} (Du)</span>
						<span class="text-lg font-bold text-neutral-900">{formatEuro(meIncome.net_income)}</span>
					</div>
				{/if}

				{#if partnerProfile && partnerIncome}
					<div class="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
						<span class="text-sm font-semibold text-neutral-700">{partnerProfile.name}</span>
						<span class="text-lg font-bold text-neutral-900">{formatEuro(partnerIncome.net_income)}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Vorauszahlung Card -->
<div class="mb-6 overflow-hidden rounded-2xl border-2 border-accent-200 bg-white shadow-lg">
	<div class="bg-linear-to-r from-pink-100 to-pink-200 px-5 py-4">
		<div class="flex items-center justify-between">
			<h2 class="flex items-center gap-2 text-lg font-bold text-accent-900">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				Vorauszahlung
			</h2>
			{#if !editingPrepayment}
				<button
					onclick={() => { editingPrepayment = true; }}
					class="rounded-lg px-3 py-1.5 text-sm font-medium text-accent-700 transition-colors hover:bg-accent-200/50"
					aria-label="Vorauszahlung bearbeiten"
				>
					Bearbeiten
				</button>
			{/if}
		</div>
	</div>
	<div class="p-5">
		<!-- Empfehlung always visible -->
		<div class="mb-4 rounded-lg bg-accent-50 p-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-accent-700">Empfehlung</p>
			<p class="text-2xl font-black text-accent-600">{formatEuro(data.computed.recommendedPrepayment)}</p>
		</div>

		{#if editingPrepayment}
			<form
				method="POST"
				action="?/savePrepayment"
				use:enhance={() => {
					savingPrepayment = true;
					return async ({ result, update }) => {
						await update();
						savingPrepayment = false;
						if (result.type === 'success') {
							editingPrepayment = false;
						}
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				
				<div class="mb-3">
					<label class="mb-2 block text-sm font-semibold text-neutral-700" for="prepayment">
						Bereits überwiesen
					</label>
					<div class="flex items-center gap-2">
						<input
							id="prepayment"
							type="number"
							name="prepayment"
							value={data.month.total_transfer_this_month}
							inputmode="decimal"
							enterkeyhint="done"
							autocomplete="off"
							step="0.01"
							min="0"
							placeholder="0.00"
							class="flex-1 rounded-lg border-2 border-neutral-300 px-4 py-3 text-lg font-semibold transition-all focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-200"
							required
						/>
						<span class="font-semibold text-neutral-600">€</span>
					</div>
				</div>

				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => { editingPrepayment = false; }}
						class="flex-1 rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 font-bold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-95"
					>
						Abbrechen
					</button>
					<button
						type="submit"
						disabled={savingPrepayment}
						class="flex-1 rounded-xl bg-accent-600 px-4 py-3 font-bold text-white transition-all hover:bg-accent-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{savingPrepayment ? 'Speichert...' : 'Speichern'}
					</button>
				</div>
			</form>
		{:else}
			<!-- Read mode -->
			<div class="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
				<span class="text-sm font-semibold text-neutral-700">Bereits überwiesen</span>
				<span class="text-lg font-bold text-neutral-900">{formatEuro(data.month.total_transfer_this_month)}</span>
			</div>
		{/if}
	</div>
</div>

<!-- Monat abschließen Card -->
{#if data.month.status === 'open'}
	<div class="mb-6 overflow-hidden rounded-2xl border-2 border-primary-200 bg-white shadow-lg">
		<div class="bg-linear-to-r from-indigo-100 to-indigo-200 px-5 py-4">
			<h2 class="flex items-center gap-2 text-lg font-bold text-primary-900">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Monat abschließen
			</h2>
		</div>
		<div class="p-5">
			<div class="mb-4 rounded-lg bg-neutral-100 p-4">
				<p class="mb-2 text-sm text-neutral-700">
					Endsaldo wird übertragen:
				</p>
				<p class="text-3xl font-black {data.computed.privateBalanceEnd > 0 ? 'text-danger-600' : data.computed.privateBalanceEnd < 0 ? 'text-success-600' : 'text-neutral-600'}">
					{formatEuro(data.computed.privateBalanceEnd)}
				</p>
			</div>

			<form
				method="POST"
				action="?/closeMonth"
				use:enhance={() => {
					closingMonth = true;
					return async ({ result, update }) => {
						await update();
						closingMonth = false;
						if (result.type === 'success') {
							window.location.reload();
						}
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				<input type="hidden" name="privateBalanceEnd" value={data.computed.privateBalanceEnd} />
				
				<button
					type="submit"
					disabled={closingMonth}
					onclick={() => confirm('Monat wirklich abschließen? Dies erstellt den nächsten Monat!')}
					class="w-full rounded-xl bg-primary-600 px-4 py-3 font-bold text-white transition-all hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{closingMonth ? 'Schließt ab...' : 'Jetzt abschließen'}
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- DEV: Reset Button -->
{#if data.month.status === 'open'}
	<div class="overflow-hidden rounded-2xl border-2 border-danger-300 bg-danger-50 shadow-lg">
		<div class="bg-danger-100 px-5 py-3">
			<h3 class="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-danger-900">
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				Dev Tools
			</h3>
		</div>
		<div class="p-5">
			<p class="mb-3 text-sm text-neutral-700">
				Monat zurücksetzen (alle Daten löschen, nur für Entwicklung!)
			</p>
			<form
				method="POST"
				action="?/resetMonthDev"
				use:enhance={() => {
					resettingMonth = true;
					return async ({ result, update }) => {
						await update();
						resettingMonth = false;
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				<button
					type="submit"
					disabled={resettingMonth}
					onclick={() => confirm('ACHTUNG: Alle Daten dieses Monats werden gelöscht! Fortfahren?')}
					class="w-full rounded-lg border-2 border-danger-600 bg-danger-600 px-4 py-2 font-bold text-white transition-all hover:bg-danger-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{resettingMonth ? 'Zurücksetzen...' : '🗑️ Monat zurücksetzen'}
				</button>
			</form>
		</div>
	</div>
{/if}

