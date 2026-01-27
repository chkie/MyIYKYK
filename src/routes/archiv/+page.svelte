<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types.js';
	import { t } from '$lib/copy/index.js';

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
	function formatMonthYear(year: number, month: number): string {
		return new Intl.DateTimeFormat('de-DE', {
			month: 'long',
			year: 'numeric'
		}).format(new Date(year, month - 1));
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
		{#each data.closedMonths as closedMonth}
			<div class="overflow-hidden rounded-2xl border-2 border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
				<div class="flex items-center justify-between p-5">
					<div class="flex-1">
						<h3 class="text-xl font-bold text-neutral-900">
							{formatMonthYear(closedMonth.year, closedMonth.month)}
						</h3>
						<div class="mt-2 flex items-center gap-2">
							<span class="text-sm text-neutral-600">{t('archive.finalBalance')}</span>
							<span class="text-lg font-bold {closedMonth.private_balance_end > 0 ? 'text-danger-600' : closedMonth.private_balance_end < 0 ? 'text-success-600' : 'text-neutral-600'}">
								{formatEuro(closedMonth.private_balance_end || 0)}
							</span>
						</div>
						<div class="mt-1 flex items-center gap-2">
							<span class="text-xs text-neutral-500">
								{t('archive.closedAt')} {new Date(closedMonth.closed_at).toLocaleDateString('de-DE')}
							</span>
						</div>
					</div>
					
					<form
						method="POST"
						action="?/deleteArchivedMonth"
						use:enhance
					>
						<input type="hidden" name="monthId" value={closedMonth.id} />
						<button
							type="submit"
							class="rounded-lg border-2 border-danger-200 bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-700 transition-all hover:bg-danger-100 active:scale-95"
							onclick={() => confirm(t('confirm.deleteMonth', { month: formatMonthYear(closedMonth.year, closedMonth.month) }))}
						>
							{t('common.delete')}
						</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
		<svg class="mx-auto mb-4 h-16 w-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
		</svg>
		<h2 class="mb-2 text-xl font-bold text-neutral-700">{t('archive.noArchiveTitle')}</h2>
		<p class="text-neutral-500">
			{t('archive.noArchiveHint')}
		</p>
	</div>
{/if}
