<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types.js';
	import { t } from '$lib/copy/index.js';
	import { askConfirm } from '$lib/utils/confirm.svelte.js';
	import { hapticSelection } from '$lib/utils/haptics.js';

	let { data }: { data: PageData } = $props();

	type ArchivePosition = {
		id: string;
		type: 'private_expense' | 'fixed_item' | 'transfer';
		description: string;
		amount: number;
		createdAt: string;
		createdByName: string | null;
	};

	// Accordion state: which month is open, plus a per-month detail cache so a
	// re-expand never refetches.
	let expandedId = $state<string | null>(null);
	let cache = $state<Record<string, ArchivePosition[]>>({});
	let loadingId = $state<string | null>(null);
	let errorId = $state<string | null>(null);

	// Currency formatter
	function formatEuro(amount: number): string {
		return new Intl.NumberFormat('de-DE', {
			style: 'currency',
			currency: 'EUR',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// Date formatter (month + year)
	function formatMonthYear(year: number, month: number): string {
		return new Intl.DateTimeFormat('de-DE', {
			month: 'long',
			year: 'numeric'
		}).format(new Date(year, month - 1));
	}

	// Short date for entry rows (DD.MM.)
	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
	}

	async function toggle(id: string) {
		hapticSelection();
		if (expandedId === id) {
			expandedId = null;
			return;
		}
		expandedId = id;
		errorId = null;
		if (cache[id]) return; // already loaded

		loadingId = id;
		try {
			const res = await fetch(`/archiv/${id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const body = (await res.json()) as { positions: ArchivePosition[] };
			cache[id] = body.positions;
		} catch (err) {
			console.error('Archive detail load failed:', err);
			errorId = id;
		} finally {
			loadingId = null;
		}
	}

	function groupFor(id: string, type: ArchivePosition['type']): ArchivePosition[] {
		return (cache[id] ?? []).filter((p) => p.type === type);
	}

	function sumFor(items: ArchivePosition[]): number {
		return items.reduce((s, p) => s + p.amount, 0);
	}
</script>

<svelte:head>
	<title>{t('pageTitle.archive')}</title>
</svelte:head>

<div class="mb-6">
	<h1 class="mb-2 text-3xl font-black text-neutral-900">{t('archive.title')}</h1>
	<p class="text-neutral-600">
		{t('archive.subtitle', { count: data.closedMonths.length })}
	</p>
</div>

{#if data.closedMonths.length > 0}
	<div class="space-y-3">
		{#each data.closedMonths as closedMonth (closedMonth.id)}
			{@const isOpen = expandedId === closedMonth.id}
			<div class="overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-sm">
				<div class="flex items-stretch">
					<button
						type="button"
						class="flex flex-1 items-center justify-between gap-3 p-5 text-left transition-colors active:bg-neutral-50"
						aria-expanded={isOpen}
						aria-controls="archive-panel-{closedMonth.id}"
						aria-label={t('aria.expandMonth')}
						onclick={() => toggle(closedMonth.id)}
					>
						<div class="flex-1">
							<h3 class="text-xl font-bold text-neutral-900">
								{formatMonthYear(closedMonth.year, closedMonth.month)}
							</h3>
							<div class="mt-2 flex items-center gap-2">
								<span class="text-sm text-neutral-600">{t('archive.finalBalance')}</span>
								<span
									class="text-lg font-bold {closedMonth.private_balance_end > 0
										? 'text-danger-600'
										: closedMonth.private_balance_end < 0
											? 'text-success-600'
											: 'text-neutral-600'}"
								>
									{formatEuro(closedMonth.private_balance_end || 0)}
								</span>
							</div>
							<div class="mt-1 text-xs text-neutral-500">
								{t('archive.closedAt')}
								{new Date(closedMonth.closed_at).toLocaleDateString('de-DE')}
							</div>
						</div>
						<svg
							class="h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-200 {isOpen
								? 'rotate-180'
								: ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					<form
						method="POST"
						action="?/deleteArchivedMonth"
						use:enhance
						class="flex items-center pr-4"
					>
						<input type="hidden" name="monthId" value={closedMonth.id} />
						<button
							type="button"
							class="border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition-all active:scale-95"
							onclick={async (e) => {
								const form = e.currentTarget.form;
								if (
									await askConfirm({
										message: t('confirm.deleteMonth', {
											month: formatMonthYear(closedMonth.year, closedMonth.month)
										}),
										danger: true
									})
								) {
									form?.requestSubmit();
								}
							}}
						>
							{t('common.delete')}
						</button>
					</form>
				</div>

				{#if isOpen}
					<div
						id="archive-panel-{closedMonth.id}"
						class="border-t-2 border-neutral-100 bg-neutral-50 p-5"
					>
						{#if loadingId === closedMonth.id}
							<p class="text-sm text-neutral-500">{t('archive.detailLoading')}</p>
						{:else if errorId === closedMonth.id}
							<p class="text-danger-600 text-sm">{t('archive.detailError')}</p>
						{:else}
							{@const groups = [
								{ label: t('archive.detailFixed'), items: groupFor(closedMonth.id, 'fixed_item') },
								{
									label: t('archive.detailPrivate'),
									items: groupFor(closedMonth.id, 'private_expense')
								},
								{ label: t('archive.detailTransfers'), items: groupFor(closedMonth.id, 'transfer') }
							]}
							{#if groups.every((g) => g.items.length === 0)}
								<p class="text-sm text-neutral-500">{t('archive.detailEmpty')}</p>
							{:else}
								<div class="space-y-5">
									{#each groups as group (group.label)}
										{#if group.items.length > 0}
											<div>
												<div class="mb-2 flex items-center justify-between gap-2">
													<h4 class="text-sm font-bold text-neutral-700">
														{group.label}
														<span class="ml-1 font-normal text-neutral-400">
															{group.items.length === 1
																? t('archive.detailEntry')
																: t('archive.detailEntries', { count: group.items.length })}
														</span>
													</h4>
													<span class="text-sm font-semibold text-neutral-600">
														{formatEuro(sumFor(group.items))}
													</span>
												</div>
												<ul class="space-y-1.5">
													{#each group.items as pos (pos.id)}
														<li
															class="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
														>
															<div class="min-w-0 flex-1">
																<p class="truncate text-sm font-medium text-neutral-800">
																	{pos.description}
																</p>
																<p class="text-xs text-neutral-400">
																	{formatDate(pos.createdAt)}{pos.createdByName
																		? ` · ${pos.createdByName}`
																		: ''}
																</p>
															</div>
															<span class="shrink-0 text-sm font-semibold text-neutral-700">
																{formatEuro(pos.amount)}
															</span>
														</li>
													{/each}
												</ul>
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<div class="rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
		<svg
			class="mx-auto mb-4 h-16 w-16 text-neutral-400"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
			/>
		</svg>
		<h2 class="mb-2 text-xl font-bold text-neutral-700">{t('archive.noArchiveTitle')}</h2>
		<p class="text-neutral-500">
			{t('archive.noArchiveHint')}
		</p>
	</div>
{/if}
