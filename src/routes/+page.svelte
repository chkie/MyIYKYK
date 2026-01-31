<script lang="ts">
	import type { PageData } from './$types.js';
	import PullToRefresh from '$lib/components/PullToRefresh.svelte';

	let { data }: { data: PageData } = $props();

	// Memoized formatters (avoid recreating on every call)
	const euroFormatter = new Intl.NumberFormat('de-DE', {
		style: 'currency',
		currency: 'EUR',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	const monthNames = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];

	// Currency formatter
	function formatEuro(amount: number): string {
		return euroFormatter.format(amount);
	}

	// Percentage formatter
	function formatPct(share: number): string {
		return `${(share * 100).toFixed(0)}%`;
	}

	// Month name formatter
	function getMonthName(monthNumber: number): string {
		return monthNames[monthNumber - 1] || '';
	}
</script>

<svelte:head>
	<title>Übersicht - Kosten-Tool</title>
</svelte:head>

<PullToRefresh>
	<h1 class="sr-only">Übersicht</h1>

	<!-- Month Info Card -->
<div class="mb-6 overflow-hidden rounded-2xl bg-white shadow-md">
	<div class="flex items-center justify-between bg-linear-to-r from-indigo-100 to-indigo-200 px-5 py-4">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</div>
			<div>
				<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Aktueller Monat</p>
				<p class="text-xl font-bold text-primary-900">
					{getMonthName(data.month.month)} {data.month.year}
				</p>
			</div>
		</div>
		<div class="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide {data.month.status === 'open' ? 'bg-success-100 text-success-700' : 'bg-neutral-200 text-neutral-700'}">
			{data.month.status === 'open' ? '✓ Aktiv' : 'Geschlossen'}
		</div>
	</div>
</div>

<!-- Main Status - Hero Card -->
{#if data.computed.privateBalanceEnd !== 0}
	<div class="mb-6 overflow-hidden rounded-2xl {data.computed.privateBalanceEnd > 0 ? 'border-4 border-danger-300 bg-danger-50' : 'border-4 border-success-300 bg-success-50'} shadow-xl">
		<div class="p-6 text-center">
			<p class="mb-2 text-sm font-semibold uppercase tracking-wide {data.computed.privateBalanceEnd > 0 ? 'text-danger-700' : 'text-success-700'}">
				{data.computed.privateBalanceEnd > 0 ? 'Christian schuldet Steffi' : 'Steffi schuldet Christian'}
			</p>
			<p class="text-5xl font-black {data.computed.privateBalanceEnd > 0 ? 'text-danger-600' : 'text-success-600'}">
				{formatEuro(Math.abs(data.computed.privateBalanceEnd))}
			</p>
		</div>
	</div>
{:else}
	<div class="mb-6 overflow-hidden rounded-2xl border-4 border-success-300 bg-success-50 shadow-xl">
		<div class="p-6 text-center">
			<p class="text-4xl font-black text-success-600">✓ Alles ausgeglichen</p>
			<p class="mt-2 text-sm text-neutral-600">Keine offenen Schulden</p>
		</div>
	</div>
{/if}

<!-- Summary Cards Grid -->
<div class="mb-6 grid grid-cols-2 gap-4">
	<!-- Fixkosten -->
	<div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
		<div class="px-4 py-3">
			<p class="text-sm font-semibold uppercase tracking-wide text-primary-700">Fixkosten</p>
		</div>
		<div class="px-4 pb-4">
			<p class="text-2xl font-bold text-neutral-900">{formatEuro(data.computed.myFixedShare)}</p>
			<p class="mt-1 text-xs text-neutral-600">{formatPct(data.computed.shareMe)} Anteil</p>
		</div>
	</div>

	<!-- Vorauszahlung -->
	<div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
		<div class="px-4 py-3">
			<p class="text-sm font-semibold uppercase tracking-wide text-pink-700">Vorauszahlung</p>
		</div>
		<div class="px-4 pb-4">
			<p class="text-2xl font-bold text-neutral-900">{formatEuro(data.computed.prepaymentThisMonth)}</p>
			{#if data.computed.fixedCostShortfall > 0}
				<p class="mt-1 text-xs text-danger-600">-{formatEuro(data.computed.fixedCostShortfall)} fehlt</p>
			{:else if data.computed.fixedCostOverpayment > 0}
				<p class="mt-1 text-xs text-success-600">+{formatEuro(data.computed.fixedCostOverpayment)} mehr</p>
			{:else}
				<p class="mt-1 text-xs text-success-600">✓ Passt genau</p>
			{/if}
		</div>
	</div>

	<!-- Private Ausgaben -->
	<div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
		<div class="px-4 py-3">
			<p class="text-sm font-semibold uppercase tracking-wide text-amber-700">Private</p>
		</div>
		<div class="px-4 pb-4">
			<p class="text-2xl font-bold text-neutral-900">{formatEuro(data.computed.privateAddedThisMonth)}</p>
			<p class="mt-1 text-xs text-neutral-600">{data.privateExpenses.length} Ausgaben</p>
		</div>
	</div>

	<!-- Vom Vormonat -->
	<div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
		<div class="px-4 py-3">
			<p class="text-sm font-semibold uppercase tracking-wide text-neutral-700">Vormonat</p>
		</div>
		<div class="px-4 pb-4">
			<p class="text-2xl font-bold {data.computed.privateBalanceStart > 0 ? 'text-danger-600' : data.computed.privateBalanceStart < 0 ? 'text-success-600' : 'text-neutral-600'}">
				{formatEuro(data.computed.privateBalanceStart)}
			</p>
			<p class="mt-1 text-xs text-neutral-600">Startsaldo</p>
		</div>
	</div>
</div>

<!-- Empfehlung Card -->
{#if data.computed.recommendedPrepayment > 0}
	{@const remaining = data.computed.recommendedPrepayment - data.computed.prepaymentThisMonth}
	{@const isPaid = remaining <= 0}
	
	{#if !isPaid}
		<div class="overflow-hidden rounded-2xl border-2 border-accent-200 bg-white shadow-md">
			<div class="bg-linear-to-r from-pink-100 to-pink-200 px-5 py-4">
				<h3 class="flex items-center gap-2 text-lg font-bold text-accent-900">
					<span class="text-xl">💡</span>
					Empfehlung Vorauszahlung
				</h3>
			</div>
			<div class="p-5">
				<p class="mb-2 text-sm text-neutral-700">
					Noch empfohlen:
				</p>
				<p class="text-3xl font-black text-accent-600">{formatEuro(remaining)}</p>
				<p class="mt-3 text-xs text-neutral-600">
					Von {formatEuro(data.computed.recommendedPrepayment)} empfohlen, bereits {formatEuro(data.computed.prepaymentThisMonth)} überwiesen.
				</p>
			</div>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border-2 border-success-200 bg-success-50 shadow-md">
			<div class="p-5 text-center">
				<p class="text-2xl font-black text-success-600">✓ Vorauszahlung erledigt</p>
				<p class="mt-2 text-sm text-success-700">
					{formatEuro(data.computed.prepaymentThisMonth)} von {formatEuro(data.computed.recommendedPrepayment)} überwiesen
				</p>
			</div>
		</div>
	{/if}
{/if}

<!-- Quick Actions -->
<div class="mt-6 grid grid-cols-2 gap-3">
	<a
		href="/ausgaben"
		class="flex flex-col items-center gap-2 rounded-xl border-2 border-warning-200 bg-warning-50 px-4 py-4 font-semibold text-warning-700 transition-all hover:bg-warning-100 active:scale-95"
	>
		<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
		</svg>
		<span class="text-sm">Neue Ausgabe</span>
	</a>

	<a
		href="/profil"
		class="flex flex-col items-center gap-2 rounded-xl border-2 border-success-200 bg-success-50 px-4 py-4 font-semibold text-success-700 transition-all hover:bg-success-100 active:scale-95"
	>
		<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<span class="text-sm">Einkommen</span>
	</a>
</div>

<!-- History Section -->
{#if data.history}
	<div class="mt-6 overflow-hidden rounded-2xl bg-white shadow-md">
		<div class="bg-linear-to-r from-purple-100 to-purple-200 px-5 py-4">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500 text-white">
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div>
					<p class="text-xs font-semibold uppercase tracking-wide text-neutral-500">Monats-Historie</p>
					<p class="text-lg font-bold text-purple-900">
						{data.history.totalCount} {data.history.totalCount === 1 ? 'Eintrag' : 'Einträge'}
					</p>
				</div>
			</div>
		</div>

		<!-- History List -->
		{#if data.history.totalCount > 0}
			<div class="divide-y divide-neutral-100">
				{#each (data.history.fullMonthList || data.history.last5) as position}
					<div class="flex items-center justify-between px-5 py-3 hover:bg-neutral-50">
						<!-- Left: Icon + Description + Creator -->
						<div class="flex items-center gap-3 flex-1 min-w-0">
							<!-- Type Icon -->
							{#if position.type === 'private_expense'}
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shrink-0">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
							{:else}
								<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 shrink-0">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
									</svg>
								</div>
							{/if}

							<!-- Description + Creator Badge -->
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-neutral-900 truncate">{position.description}</p>
								<div class="flex items-center gap-2 mt-0.5">
									<!-- Creator Badge -->
									{#if position.createdByName}
										<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
											{position.createdByName}
										</span>
									{:else}
										<span class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-400">
											−
										</span>
									{/if}
									<!-- Timestamp -->
									<span class="text-xs text-neutral-500">
										{new Date(position.createdAt).toLocaleString('de-DE', { 
											day: '2-digit', 
											month: '2-digit', 
											hour: '2-digit', 
											minute: '2-digit' 
										})}
									</span>
								</div>
							</div>
						</div>

						<!-- Right: Amount -->
						<div class="text-right ml-3 shrink-0">
							<p class="text-sm font-bold text-neutral-900">{formatEuro(position.amount)}</p>
							<p class="text-xs text-neutral-500">
								{position.type === 'private_expense' ? 'Privat' : 'Fix'}
							</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Show All Button (if not already showing all) -->
			{#if !data.history.fullMonthList && data.history.totalCount > 5}
				<div class="border-t border-neutral-100 px-5 py-4">
					<a 
						href="/?history=full" 
						class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-purple-200 bg-purple-50 px-4 py-3 font-semibold text-purple-700 transition-all hover:bg-purple-100 active:scale-95"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
						<span>Alle {data.history.totalCount} anzeigen</span>
					</a>
				</div>
			{:else if data.history.fullMonthList}
				<div class="border-t border-neutral-100 px-5 py-4">
					<a 
						href="/" 
						class="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold text-neutral-700 transition-all hover:bg-neutral-100 active:scale-95"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
						<span>Weniger anzeigen</span>
					</a>
				</div>
			{/if}
		{:else}
			<!-- Empty State -->
			<div class="px-5 py-8 text-center">
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
					<svg class="h-6 w-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
					</svg>
				</div>
				<p class="mt-3 text-sm font-medium text-neutral-700">Noch keine Einträge</p>
				<p class="mt-1 text-xs text-neutral-500">Positionen erscheinen hier nach dem Anlegen</p>
			</div>
		{/if}
	</div>
{/if}
</PullToRefresh>
