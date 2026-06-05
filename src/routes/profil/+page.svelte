<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import type { PageData } from './$types.js';
	import { t } from '$lib/copy/index.js';
	import { profileStore } from '$lib/stores/profile.svelte';
	import { OptimisticList } from '$lib/utils/optimistic.svelte';
	import { askConfirm } from '$lib/utils/confirm.svelte.js';

	let { data }: { data: PageData } = $props();

	// Optimistic overlay for instant transfer add/delete (reconciled in enhance callbacks).
	type TransferRow = PageData['transfers'][number];
	const optimistic = new OptimisticList<TransferRow & { pending?: boolean }>();
	const displayedTransfers = $derived(optimistic.merge(data.transfers ?? []));
	// Total tracks the optimistic list so it updates instantly too
	// (prepaymentThisMonth is server-side just the sum of transfer amounts).
	const optimisticTransferTotal = $derived(
		Math.round(displayedTransfers.reduce((sum, transfer) => sum + transfer.amount, 0) * 100) / 100
	);

	// Currency formatter (cached — avoid re-instantiating Intl on every call)
	const euroFormatter = new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	function formatEuro(amount: number): string {
		return euroFormatter.format(amount);
	}

	// Loading states
	let savingIncomes = $state(false);
	let closingMonth = $state(false);
	let resettingMonth = $state(false);
	let addingTransfer = $state(false);

	// Edit mode states
	let editingIncomes = $state(false);
	let showAddTransfer = $state(false);

	// Transfer form state
	let newTransferAmount = $state(0);
	let newTransferDescription = $state('');

	// Get profiles
	const meProfile = $derived(
		data.profiles?.find((p: { role: string; id: string }) => p.role === 'me')
	);
	const partnerProfile = $derived(
		data.profiles?.find((p: { role: string; id: string }) => p.role === 'partner')
	);

	const meIncome = $derived(
		data.incomes.find((i: { profile_id: string }) => i.profile_id === meProfile?.id)
	);
	const partnerIncome = $derived(
		data.incomes.find((i: { profile_id: string }) => i.profile_id === partnerProfile?.id)
	);
</script>

<svelte:head>
	<title>Profil - Kosten-Tool</title>
</svelte:head>

<h1 class="mb-6 text-3xl font-black text-neutral-900">Profil & Einstellungen</h1>

<!-- Current Profile Card -->
{#if profileStore.hasProfile}
	<div class="border-primary-200 mb-6 overflow-hidden rounded-2xl border-2 bg-white shadow-lg">
		<div class="bg-linear-to-r from-indigo-100 to-indigo-200 px-5 py-4">
			<div class="flex items-center justify-between">
				<h2 class="text-primary-900 flex items-center gap-2 text-lg font-bold">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					Aktuelles Profil
				</h2>
			</div>
		</div>
		<div class="p-5">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm text-neutral-600">Eingeloggt als</p>
					<p class="text-primary-900 text-2xl font-bold">{profileStore.currentProfileName}</p>
				</div>
				<button
					onclick={async () => {
						if (
							await askConfirm({
								message: 'Profil wechseln? Du wirst zur Profilauswahl weitergeleitet.'
							})
						) {
							profileStore.clearProfile();
							// Use goto with invalidateAll to trigger re-render immediately
							await goto('/', { invalidateAll: true, replaceState: false });
						}
					}}
					class="bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-lg px-4 py-2 text-sm font-medium transition-colors active:scale-95"
				>
					Profil wechseln
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Admin Button (nur für Christian) -->
{#if profileStore.hasProfile && meProfile?.role === 'me'}
	<div class="mb-6">
		<a
			href="/admin"
			class="border-warning-300 from-warning-50 to-warning-100 hover:border-warning-400 flex items-center justify-center gap-3 rounded-2xl border-4 bg-linear-to-r px-6 py-4 shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
		>
			<svg class="text-warning-700 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
				/>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
			<div class="text-left">
				<p class="text-warning-600 text-sm font-semibold tracking-wide uppercase">
					🔒 Admin-Bereich
				</p>
				<p class="text-warning-900 text-lg font-bold">Monatsverwaltung</p>
			</div>
			<svg
				class="text-warning-600 ml-auto h-6 w-6"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>
{/if}

<!-- Einkommen Card -->
<div class="border-success-200 mb-6 overflow-hidden rounded-2xl border-2 bg-white shadow-lg">
	<div class="bg-linear-to-r from-emerald-100 to-emerald-200 px-5 py-4">
		<div class="flex items-center justify-between">
			<h2 class="text-success-900 flex items-center gap-2 text-lg font-bold">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				Einkommen
			</h2>
			{#if !editingIncomes}
				<button
					onclick={() => {
						editingIncomes = true;
					}}
					class="text-success-700 hover:bg-success-200/50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
					aria-label={t('aria.editIncome')}
				>
					{t('common.edit')}
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
					const scrollY = window.scrollY;
					return async ({ result, update }) => {
						await update({ invalidateAll: false });
						await invalidate('app:month');
						savingIncomes = false;
						if (result.type === 'success') {
							editingIncomes = false;
						}
						// Restore scroll position
						requestAnimationFrame(() => window.scrollTo(0, scrollY));
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />

				{#if meProfile && meIncome}
					<div class="mb-4">
						<label class="mb-2 block text-sm font-semibold text-neutral-700" for="income_me">
							{meProfile.name}
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
								class="focus:border-success-500 focus:ring-success-200 flex-1 rounded-lg border-2 border-neutral-300 px-4 py-3 text-lg font-semibold transition-all focus:ring-2 focus:outline-none"
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
								class="focus:border-success-500 focus:ring-success-200 flex-1 rounded-lg border-2 border-neutral-300 px-4 py-3 text-lg font-semibold transition-all focus:ring-2 focus:outline-none"
								required
							/>
							<span class="font-semibold text-neutral-600">€</span>
						</div>
					</div>
				{/if}

				<div class="flex gap-2">
					<button
						type="button"
						onclick={() => {
							editingIncomes = false;
						}}
						class="flex-1 rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 font-bold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-95"
					>
						{t('common.cancel')}
					</button>
					<button
						type="submit"
						disabled={savingIncomes}
						class="bg-success-600 hover:bg-success-700 flex-1 rounded-xl px-4 py-3 font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{savingIncomes ? t('common.saving') : t('common.save')}
					</button>
				</div>
			</form>
		{:else}
			<!-- Read mode -->
			<div class="space-y-3">
				{#if meProfile && meIncome}
					<div class="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
						<span class="text-sm font-semibold text-neutral-700">{meProfile.name}</span>
						<span class="text-lg font-bold text-neutral-900">{formatEuro(meIncome.net_income)}</span
						>
					</div>
				{/if}

				{#if partnerProfile && partnerIncome}
					<div class="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
						<span class="text-sm font-semibold text-neutral-700">{partnerProfile.name}</span>
						<span class="text-lg font-bold text-neutral-900"
							>{formatEuro(partnerIncome.net_income)}</span
						>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Zahlungen Card -->
<div class="border-accent-200 mb-6 overflow-hidden rounded-2xl border-2 bg-white shadow-lg">
	<div class="bg-linear-to-r from-pink-100 to-pink-200 px-5 py-4">
		<div class="flex items-center justify-between">
			<h2 class="text-accent-900 flex items-center gap-2 text-lg font-bold">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
				Zahlungen
			</h2>
			{#if !showAddTransfer}
				<button
					onclick={() => {
						showAddTransfer = true;
						newTransferAmount = 0;
						newTransferDescription = '';
					}}
					class="text-accent-700 hover:bg-accent-200/50 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
				>
					+ Zahlung
				</button>
			{/if}
		</div>
	</div>
	<div class="p-5">
		<!-- Empfehlung always visible -->
		<div class="bg-accent-50 mb-4 rounded-lg p-3">
			<p class="text-accent-700 text-xs font-semibold tracking-wide uppercase">Empfehlung</p>
			<p class="text-accent-600 text-2xl font-black">
				{formatEuro(data.computed.recommendedPrepayment)}
			</p>
		</div>

		<!-- Add Transfer Form -->
		{#if showAddTransfer}
			<form
				method="POST"
				action="?/addTransfer"
				use:enhance={() => {
					addingTransfer = true;
					const scrollY = window.scrollY;
					// Optimistic insert: show the new transfer instantly, reset + close the form.
					const snapshot = { amount: newTransferAmount, description: newTransferDescription };
					const tempId = crypto.randomUUID();
					optimistic.add({
						id: tempId,
						monthId: data.month.id,
						amount: Number(snapshot.amount) || 0,
						description: snapshot.description || null,
						createdAt: new Date().toISOString(),
						createdBy: meProfile?.id ?? null,
						pending: true
					});
					showAddTransfer = false;
					newTransferAmount = 0;
					newTransferDescription = '';
					return async ({ result, update }) => {
						await update({ reset: false, invalidateAll: false });
						await invalidate('app:month');
						addingTransfer = false;
						optimistic.dropPending(tempId);
						if (result.type !== 'success') {
							// Rollback: reopen the form with the entered values.
							newTransferAmount = snapshot.amount;
							newTransferDescription = snapshot.description;
							showAddTransfer = true;
						}
						requestAnimationFrame(() => window.scrollTo(0, scrollY));
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				<input type="hidden" name="createdBy" value={meProfile?.id} />

				<div class="border-accent-300 bg-accent-50 mb-3 space-y-3 rounded-lg border-2 p-4">
					<div>
						<label
							class="mb-1 block text-sm font-semibold text-neutral-700"
							for="newTransferAmount"
						>
							Betrag
						</label>
						<div class="flex items-center gap-2">
							<input
								id="newTransferAmount"
								type="number"
								name="amount"
								bind:value={newTransferAmount}
								inputmode="decimal"
								enterkeyhint="next"
								autocomplete="off"
								step="0.01"
								min="0"
								placeholder="0.00"
								class="focus:border-accent-500 focus:ring-accent-200 flex-1 rounded-lg border-2 border-neutral-300 px-4 py-2 text-lg font-semibold transition-all focus:ring-2 focus:outline-none"
								required
							/>
							<span class="font-semibold text-neutral-600">€</span>
						</div>
					</div>

					<div>
						<label
							class="mb-1 block text-sm font-semibold text-neutral-700"
							for="newTransferDescription"
						>
							Beschreibung (optional)
						</label>
						<input
							id="newTransferDescription"
							type="text"
							name="description"
							bind:value={newTransferDescription}
							enterkeyhint="done"
							autocomplete="off"
							placeholder="z.B. Vorauszahlung Januar"
							class="focus:border-accent-500 focus:ring-accent-200 w-full rounded-lg border-2 border-neutral-300 px-4 py-2 text-sm transition-all focus:ring-2 focus:outline-none"
						/>
					</div>

					<div class="flex gap-2">
						<button
							type="button"
							onclick={() => {
								showAddTransfer = false;
							}}
							class="flex-1 rounded-lg border-2 border-neutral-300 bg-white px-3 py-2 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 active:scale-95"
						>
							Abbrechen
						</button>
						<button
							type="submit"
							disabled={addingTransfer}
							class="bg-accent-600 hover:bg-accent-700 flex-1 rounded-lg px-3 py-2 text-sm font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{addingTransfer ? 'Speichere...' : '+ Hinzufügen'}
						</button>
					</div>
				</div>
			</form>
		{/if}

		<!-- Transfers List -->
		{#if displayedTransfers.length > 0}
			<div class="space-y-2">
				<p class="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Überweisungen</p>
				{#each displayedTransfers as transfer (transfer.id)}
					<div
						class="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 {transfer.pending
							? 'opacity-60'
							: ''}"
					>
						<div class="flex-1">
							<p class="text-sm font-medium text-neutral-900">
								{transfer.description || 'Zahlung'}
							</p>
							<p class="text-xs text-neutral-500">
								{new Date(transfer.createdAt).toLocaleString('de-DE', {
									day: '2-digit',
									month: '2-digit',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-lg font-bold text-neutral-900">{formatEuro(transfer.amount)}</span>
							<form
								method="POST"
								action="?/deleteTransfer"
								use:enhance={() => {
									// Optimistic delete: hide the row instantly, restore on failure.
									optimistic.markRemoving(transfer.id);
									const scrollY = window.scrollY;
									return async ({ update }) => {
										await update({ reset: false, invalidateAll: false });
										await invalidate('app:month');
										optimistic.unmarkRemoving(transfer.id);
										requestAnimationFrame(() => window.scrollTo(0, scrollY));
									};
								}}
							>
								<input type="hidden" name="transferId" value={transfer.id} />
								<button
									type="button"
									disabled={optimistic.removing.has(transfer.id)}
									onclick={async (e) => {
										const form = e.currentTarget.form;
										if (await askConfirm({ message: 'Zahlung wirklich löschen?', danger: true })) {
											form?.requestSubmit();
										}
									}}
									class="text-danger-600 hover:bg-danger-50 rounded-lg p-2 transition-colors active:scale-95 disabled:opacity-50"
									aria-label="Zahlung löschen"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>

			<!-- Total -->
			<div class="bg-accent-100 mt-4 flex items-center justify-between rounded-lg px-4 py-3">
				<span class="text-accent-700 text-sm font-bold tracking-wide uppercase"
					>Gesamt überwiesen</span
				>
				<span class="text-accent-900 text-xl font-black">{formatEuro(optimisticTransferTotal)}</span
				>
			</div>
		{:else if !showAddTransfer}
			<div
				class="rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 px-4 py-6 text-center"
			>
				<p class="text-sm text-neutral-600">Noch keine Zahlungen erfasst</p>
				<p class="mt-1 text-xs text-neutral-500">
					Klicke auf "+ Zahlung" um eine Überweisung hinzuzufügen
				</p>
			</div>
		{/if}
	</div>
</div>

<!-- Monat abschließen Card -->
{#if data.month.status === 'open'}
	<div class="border-primary-200 mb-6 overflow-hidden rounded-2xl border-2 bg-white shadow-lg">
		<div class="bg-linear-to-r from-indigo-100 to-indigo-200 px-5 py-4">
			<h2 class="text-primary-900 flex items-center gap-2 text-lg font-bold">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				Monat abschließen
			</h2>
		</div>
		<div class="p-5">
			<div class="mb-4 rounded-lg bg-neutral-100 p-4">
				<p class="mb-2 text-sm text-neutral-700">Endsaldo wird übertragen:</p>
				<p
					class="text-3xl font-black {data.computed.privateBalanceEnd > 0
						? 'text-danger-600'
						: data.computed.privateBalanceEnd < 0
							? 'text-success-600'
							: 'text-neutral-600'}"
				>
					{formatEuro(data.computed.privateBalanceEnd)}
				</p>
			</div>

			<form
				method="POST"
				action="?/closeMonth"
				use:enhance={() => {
					closingMonth = true;
					return async ({ update }) => {
						// invalidate('app:month') re-runs the month-scoped load → der neue offene
						// Monat erscheint in-place, kein Reload/Blink (Layout/Profiles unberührt).
						await update({ invalidateAll: false });
						await invalidate('app:month');
						closingMonth = false;
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				<input type="hidden" name="privateBalanceEnd" value={data.computed.privateBalanceEnd} />

				<button
					type="button"
					disabled={closingMonth}
					onclick={async (e) => {
						const form = e.currentTarget.form;
						if (
							await askConfirm({ message: t('confirm.closeMonth'), confirmLabel: 'Abschließen' })
						) {
							form?.requestSubmit();
						}
					}}
					class="bg-primary-600 hover:bg-primary-700 w-full rounded-xl px-4 py-3 font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{closingMonth ? t('common.closing') : t('profile.closeMonthButton')}
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- DEV: Reset Button -->
{#if data.month.status === 'open'}
	<div class="border-danger-300 bg-danger-50 overflow-hidden rounded-2xl border-2 shadow-lg">
		<div class="bg-danger-100 px-5 py-3">
			<h3 class="text-danger-900 flex items-center gap-2 text-sm font-bold tracking-wide uppercase">
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
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
					const scrollY = window.scrollY;
					return async ({ update }) => {
						await update({ invalidateAll: false });
						await invalidate('app:month');
						resettingMonth = false;
						// Restore scroll position
						requestAnimationFrame(() => window.scrollTo(0, scrollY));
					};
				}}
			>
				<input type="hidden" name="monthId" value={data.month.id} />
				<button
					type="button"
					disabled={resettingMonth}
					onclick={async (e) => {
						const form = e.currentTarget.form;
						if (
							await askConfirm({
								message: 'ACHTUNG: Alle Daten dieses Monats werden gelöscht! Fortfahren?',
								danger: true
							})
						) {
							form?.requestSubmit();
						}
					}}
					class="border-danger-600 bg-danger-600 hover:bg-danger-700 w-full rounded-lg border-2 px-4 py-2 font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{resettingMonth ? 'Zurücksetzen...' : '🗑️ Monat zurücksetzen'}
				</button>
			</form>
		</div>
	</div>
{/if}
