<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';

	let selectedYear = $state(2026);
	let selectedMonth = $state(1);
	let isCreating = $state(false);

	const monthNames = [
		'Januar',
		'Februar',
		'März',
		'April',
		'Mai',
		'Juni',
		'Juli',
		'August',
		'September',
		'Oktober',
		'November',
		'Dezember'
	];

	function getMonthName(monthNumber: number): string {
		return monthNames[monthNumber - 1] || '';
	}
</script>

<svelte:head>
	<title>Monatsverwaltung - Admin</title>
</svelte:head>

<div class="mx-auto max-w-2xl p-6">
	<h1 class="mb-6 text-3xl font-bold text-neutral-900">Monatsverwaltung</h1>

	<div class="border-warning-300 bg-warning-50 mb-8 rounded-2xl border-4 p-6">
		<div class="flex items-start gap-3">
			<svg class="text-warning-600 h-6 w-6 shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<div>
				<h2 class="text-warning-900 font-bold">⚠️ Admin-Bereich</h2>
				<p class="text-warning-800 mt-1 text-sm">
					Dieser Bereich ist nur für Debugging und manuelle Monatsverwaltung gedacht.
					<strong>Vorsicht:</strong> Das Ändern des Monats betrifft alle Nutzer!
				</p>
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl bg-white shadow-lg">
		<div class="from-primary-50 to-primary-100 border-b border-neutral-200 bg-linear-to-r p-6">
			<h2 class="text-primary-900 text-xl font-bold">Neuen Monat erstellen / wechseln</h2>
			<p class="mt-1 text-sm text-neutral-600">
				Monat wird erstellt falls noch nicht vorhanden, sonst gewechselt.
			</p>
		</div>

		<form
			method="POST"
			action="?/createMonth"
			use:enhance={() => {
				isCreating = true;
				return async ({ result, update }) => {
					await update();
					isCreating = false;
					if (result.type === 'success') {
						// Invalidate all data and redirect to home
						await invalidateAll();
						await goto('/', { replaceState: false });
					}
				};
			}}
			class="p-6"
		>
			<div class="mb-6 grid grid-cols-2 gap-4">
				<!-- Year Selection -->
				<div>
					<label for="year" class="mb-2 block text-sm font-semibold text-neutral-700"> Jahr </label>
					<input
						id="year"
						name="year"
						type="number"
						bind:value={selectedYear}
						min="2024"
						max="2030"
						required
						class="focus:border-primary-500 focus:ring-primary-200 w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-lg font-semibold focus:ring-2 focus:outline-none"
					/>
				</div>

				<!-- Month Selection -->
				<div>
					<label for="month" class="mb-2 block text-sm font-semibold text-neutral-700">
						Monat
					</label>
					<select
						id="month"
						name="month"
						bind:value={selectedMonth}
						required
						class="focus:border-primary-500 focus:ring-primary-200 w-full rounded-lg border-2 border-neutral-300 bg-white px-4 py-3 text-lg font-semibold focus:ring-2 focus:outline-none"
					>
						{#each monthNames as monthName, index}
							<option value={index + 1}>{monthName}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Preview -->
			<div class="mb-6 rounded-lg bg-neutral-50 p-4 text-center">
				<p class="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
					Ausgewählter Monat
				</p>
				<p class="text-primary-900 mt-1 text-3xl font-black">
					{getMonthName(selectedMonth)}
					{selectedYear}
				</p>
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				disabled={isCreating}
				class="bg-primary-600 hover:bg-primary-700 w-full rounded-xl px-6 py-4 text-lg font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-neutral-400"
			>
				{isCreating ? '⏳ Erstelle Monat...' : '✓ Monat erstellen / wechseln'}
			</button>
		</form>
	</div>

	<!-- Quick Actions -->
	<div class="mt-6 grid grid-cols-2 gap-4">
		<form
			method="POST"
			action="?/createMonth"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						await invalidateAll();
						await goto('/', { replaceState: false });
					}
				};
			}}
		>
			<input type="hidden" name="year" value="2026" />
			<input type="hidden" name="month" value="1" />
			<button
				type="submit"
				class="border-primary-300 text-primary-900 hover:bg-primary-50 w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-bold transition"
			>
				🚀 Auf Januar 2026 setzen
			</button>
		</form>

		<a
			href="/"
			class="flex items-center justify-center rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-neutral-900 transition hover:bg-neutral-50"
		>
			← Zurück zur Übersicht
		</a>
	</div>

	<!-- Info Box -->
	<div class="bg-info-50 mt-6 rounded-lg p-4">
		<h3 class="text-info-900 font-semibold">💡 Hinweise</h3>
		<ul class="text-info-800 mt-2 space-y-1 text-sm">
			<li>• Bei Release: Januar 2026 als Startmonat wählen</li>
			<li>• Carryover wird automatisch vom vorherigen Monat übernommen</li>
			<li>• Template-Fixkosten werden automatisch kopiert</li>
			<li>• Nur ein Monat kann gleichzeitig "offen" sein</li>
		</ul>
	</div>
</div>
