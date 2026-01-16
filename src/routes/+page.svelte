<script lang="ts">
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
</script>

<h1>Kosten-Tool</h1>

<!-- Month Period Info -->
<div class="my-4 text-center text-gray-600">
	Monat: {data.month.year}-{String(data.month.month).padStart(2, '0')}
</div>

<!-- DEV Tools (only visible in development) -->
{#if import.meta.env.DEV}
	<div class="my-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
		<h3 class="text-sm font-semibold text-red-800 mb-2">🛠️ DEV TOOLS (nicht in Production)</h3>
		
		{#if !showDevResetConfirm}
			<button
				type="button"
				onclick={() => { showDevResetConfirm = true; }}
				class="w-full px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors text-sm font-medium"
			>
				Reset current month (löscht alle Daten)
			</button>
		{:else}
			<div class="space-y-3">
				<div class="p-3 bg-white border border-red-400 rounded">
					<p class="text-sm text-red-700 font-medium mb-2">⚠️ Alle Daten des aktuellen Monats werden gelöscht!</p>
					<p class="text-xs text-gray-600 mb-3">
						Fixkosten, Private Ausgaben, Einkommen werden zurückgesetzt. Der Monat bleibt 'open'.
					</p>
					<label class="flex items-center space-x-2 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={devResetConfirmed}
							class="w-4 h-4 text-red-600 rounded focus:ring-red-500"
						/>
						<span class="text-sm text-gray-800">Ich verstehe, dass alle Daten gelöscht werden</span>
					</label>
				</div>

				<form method="POST" action="?/resetMonthDev" class="flex gap-2">
					<input type="hidden" name="monthId" value={data.month.id} />
					<button
						type="button"
						onclick={cancelDevReset}
						class="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm"
					>
						Abbrechen
					</button>
					<button
						type="submit"
						disabled={!devResetConfirmed}
						class="flex-1 px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed {devResetConfirmed ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500'}"
					>
						Jetzt zurücksetzen
					</button>
				</form>
			</div>
		{/if}
	</div>
{/if}

<!-- Results Section -->
<div class="my-8">
	<h2 class="text-2xl font-semibold mb-4">Monatsübersicht</h2>

	<div class="space-y-4">
		<!-- Card 1: Fixkosten -->
		<div class="p-4 bg-white border-2 border-blue-300 rounded-lg shadow-sm">
			<h3 class="text-lg font-semibold mb-3 text-blue-900">Fixkosten</h3>
			<div class="space-y-2">
				<div class="flex justify-between">
					<span class="text-gray-700">Gesamt Fixkosten:</span>
					<span class="font-semibold">{formatEuro(data.computed.totalFixedCosts)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-700">Dein Anteil:</span>
					<span class="font-semibold text-blue-600">{formatEuro(data.computed.myFixedShare)}</span>
				</div>
				<div class="pt-2 mt-2 border-t border-blue-200">
					<span class="text-xs text-gray-600">Dein Einkommensanteil: {formatPct(data.computed.shareMe)}</span>
				</div>
			</div>
		</div>

		<!-- Card 2: Transfer & Ausgleich -->
		<div class="p-4 bg-white border-2 border-purple-300 rounded-lg shadow-sm">
			<h3 class="text-lg font-semibold mb-3 text-purple-900">Transfer & Ausgleich</h3>
			<div class="space-y-2">
				<div class="flex justify-between">
					<span class="text-gray-700">Überweisung (diesen Monat):</span>
					<span class="font-semibold">{formatEuro(data.computed.totalTransferThisMonth)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-700">Fehlbetrag Fixkosten:</span>
					<span class="font-semibold text-red-600">{formatEuro(data.computed.missingFixed)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-700">Überschuss für Privates:</span>
					<span class="font-semibold text-green-600">{formatEuro(data.computed.surplusForPrivates)}</span>
				</div>
			</div>
		</div>

		<!-- Card 3: Privatkonto -->
		<div class="p-4 bg-white border-2 border-orange-300 rounded-lg shadow-sm">
			<h3 class="text-lg font-semibold mb-3 text-orange-900">Privatkonto</h3>
			<div class="space-y-2">
				<div class="flex justify-between">
					<span class="text-gray-700">Startguthaben:</span>
					<span class="font-semibold">{formatEuro(data.computed.privateBalanceStart)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-700">Private Ausgaben (Summe):</span>
					<span class="font-semibold">{formatEuro(data.computed.privateAddedThisMonth)}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-gray-700">Endsaldo:</span>
					<span class="font-semibold text-orange-600">{formatEuro(data.computed.privateBalanceEnd)}</span>
				</div>
			</div>
		</div>

		<!-- Card 4: Empfehlung -->
		<div class="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400 rounded-lg shadow-md">
			<h3 class="text-lg font-semibold mb-3 text-green-900">💡 Empfehlung</h3>
			<div class="text-center py-2">
				{#if data.computed.privateBalanceEnd > 0}
					<p class="text-gray-700 mb-2">Du schuldest insgesamt:</p>
					<p class="text-3xl font-bold text-red-600">{formatEuro(data.computed.privateBalanceEnd)}</p>
				{:else if data.computed.privateBalanceEnd < 0}
					<p class="text-gray-700 mb-2">Du hast vorausgezahlt:</p>
					<p class="text-3xl font-bold text-green-600">{formatEuro(Math.abs(data.computed.privateBalanceEnd))}</p>
				{:else}
					<p class="text-2xl font-bold text-green-600">✓ Alles ausgeglichen</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Edit Incomes -->
<div class="my-6 p-4 bg-green-50 border border-green-200 rounded">
	<h2 class="font-semibold mb-3">Einkommen für aktuellen Monat</h2>

	{#if form?.error}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
			{form.error}
		</div>
	{/if}

	<form method="POST" action="?/saveIncomes" class="space-y-3">
		<input type="hidden" name="monthId" value={data.month.id} />

		{#each data.profiles as profile}
			<div class="flex flex-col">
				<label for="income_{profile.id}" class="text-sm font-medium mb-1">
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
					class="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		{/each}

		<button
			type="submit"
			class="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
		>
			Einkommen speichern
		</button>
	</form>

	<!-- Income Shares Display -->
	<div class="mt-4 pt-3 border-t border-green-300">
		<p class="text-xs font-medium text-gray-700 mb-1">Berechnete Einkommensanteile:</p>
		<div class="flex gap-4 text-sm text-gray-600">
			<span><strong>Christian:</strong> {formatPct(data.computed.shareMe)}</span>
			<span><strong>Steffi:</strong> {formatPct(data.computed.sharePartner)}</span>
		</div>
	</div>
</div>

<!-- Fixed Costs Section -->
<div class="my-8">
	<h2 class="text-2xl font-semibold mb-4">Fixkosten</h2>

	<!-- Add Category Form -->
	<div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
		<h3 class="font-semibold mb-3">Neue Kategorie</h3>
		<form method="POST" action="?/addCategory" class="flex flex-col sm:flex-row gap-2">
			<input type="hidden" name="monthId" value={data.month.id} />
			<input
				type="text"
				name="label"
				placeholder="z.B. Wohnung, Versicherungen..."
				required
				class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
			/>
			<button
				type="submit"
				class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
			>
				Kategorie hinzufügen
			</button>
		</form>
	</div>

	<!-- Categories List -->
	{#if data.fixedCategories.length === 0}
		<p class="text-gray-500 text-center py-8">Noch keine Fixkosten-Kategorien vorhanden.</p>
	{:else}
		<div class="space-y-6">
			{#each data.fixedCategories as category}
				<div class="border border-gray-300 rounded-lg overflow-hidden">
					<!-- Category Header -->
					<div class="bg-gray-100 p-4 flex justify-between items-center">
						<h3 class="text-lg font-semibold">{category.label}</h3>
						<form
							method="POST"
							action="?/deleteCategory"
							onsubmit={(e) => {
								if (!confirm('Kategorie und alle Items löschen?')) {
									e.preventDefault();
								}
							}}
						>
							<input type="hidden" name="categoryId" value={category.id} />
							<button
								type="submit"
								class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
							>
								Kategorie löschen
							</button>
						</form>
					</div>

					<!-- Items List -->
					<div class="p-4 space-y-3">
						{#if category.items.length === 0}
							<p class="text-gray-500 text-sm">Keine Items in dieser Kategorie</p>
						{:else}
							{#each category.items as item}
								<div class="border border-gray-200 rounded p-3 bg-white">
									<form method="POST" action="?/updateItem" class="space-y-3">
										<input type="hidden" name="itemId" value={item.id} />

										<!-- Item Label -->
										<div>
											<label class="block text-sm font-medium mb-1">Bezeichnung</label>
											<input
												type="text"
												name="label"
												value={item.label}
												required
												class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
											/>
										</div>

										<!-- Amount -->
										<div>
											<label class="block text-sm font-medium mb-1">Betrag (€)</label>
											<input
												type="number"
												name="amount"
												value={item.amount}
												step="0.01"
												min="0"
												required
												class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
											/>
										</div>

										<!-- Split Mode -->
										<div>
											<label class="block text-sm font-medium mb-2">Aufteilung</label>
											<div class="grid grid-cols-3 gap-2">
												<label class="flex items-center space-x-2 cursor-pointer">
													<input
														type="radio"
														name="splitMode"
														value="income"
														checked={item.splitMode === 'income' || item.splitMode === 'half'}
														class="w-4 h-4 text-green-600 focus:ring-green-500"
													/>
													<span class="text-sm">Gemeinsam</span>
												</label>
												<label class="flex items-center space-x-2 cursor-pointer">
													<input
														type="radio"
														name="splitMode"
														value="me"
														checked={item.splitMode === 'me'}
														class="w-4 h-4 text-green-600 focus:ring-green-500"
													/>
													<span class="text-sm">Nur Christian</span>
												</label>
												<label class="flex items-center space-x-2 cursor-pointer">
													<input
														type="radio"
														name="splitMode"
														value="partner"
														checked={item.splitMode === 'partner'}
														class="w-4 h-4 text-green-600 focus:ring-green-500"
													/>
													<span class="text-sm">Nur Steffi</span>
												</label>
											</div>

											<!-- Share Preview -->
											<div class="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700">
												<span class="font-medium">Du zahlst:</span>
												<span class="font-semibold text-blue-700">{formatEuro(calculateMyItemShare(item.amount, item.splitMode))}</span>
												<span class="text-gray-500 ml-1">{getSplitModeLabel(item.splitMode, item.amount)}</span>
											</div>
										</div>

										<!-- Action Buttons -->
										<div class="flex gap-2">
											<button
												type="submit"
												class="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
											>
												Speichern
											</button>
											<button
												type="submit"
												formaction="?/deleteItem"
												class="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
												onclick={(e) => {
													if (!confirm('Item löschen?')) {
														e.preventDefault();
													}
												}}
											>
												Löschen
											</button>
										</div>
									</form>
								</div>
							{/each}
						{/if}

						<!-- Add Item Form -->
						<div class="mt-4 pt-4 border-t border-gray-200">
							<h4 class="font-medium mb-3 text-sm">Neues Item hinzufügen</h4>
							<form method="POST" action="?/addItem" class="space-y-3">
								<input type="hidden" name="categoryId" value={category.id} />

								<div>
									<input
										type="text"
										name="label"
										placeholder="Bezeichnung (z.B. Miete)"
										required
										class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
										class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>

								<div>
									<label class="block text-sm font-medium mb-2">Aufteilung</label>
									<select
										name="splitMode"
										required
										class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="income">Gemeinsam (einkommensbasiert)</option>
										<option value="me">Nur Christian</option>
										<option value="partner">Nur Steffi</option>
									</select>
								</div>

								<button
									type="submit"
									class="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
								>
									Item hinzufügen
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Month Transfer Section -->
<div class="my-8 p-4 bg-purple-50 border border-purple-200 rounded">
	<h2 class="text-xl font-semibold mb-3">Überweisung (diesen Monat)</h2>
	<form method="POST" action="?/saveTransfer" class="flex flex-col sm:flex-row gap-2">
		<input type="hidden" name="monthId" value={data.month.id} />
		<div class="flex-1">
			<input
				type="number"
				name="totalTransfer"
				value={data.month.total_transfer_this_month}
				step="0.01"
				min="0"
				required
				class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
			/>
		</div>
		<button
			type="submit"
			class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors whitespace-nowrap"
		>
			Speichern
		</button>
	</form>
</div>

<!-- Private Expenses Section -->
<div class="my-8">
	<h2 class="text-2xl font-semibold mb-4">Private Ausgaben (Christian)</h2>

	<!-- Add Expense Form -->
	<div class="mb-6 p-4 bg-orange-50 border border-orange-200 rounded">
		<h3 class="font-semibold mb-3">Neue Ausgabe</h3>
		<form method="POST" action="?/addPrivateExpense" class="space-y-3">
			<input type="hidden" name="monthId" value={data.month.id} />

			<div>
				<label for="expense-date" class="block text-sm font-medium mb-1">Datum</label>
				<input
					type="date"
					id="expense-date"
					name="dateISO"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
				/>
			</div>

			<div>
				<label for="expense-description" class="block text-sm font-medium mb-1">
					Beschreibung
				</label>
				<input
					type="text"
					id="expense-description"
					name="description"
					placeholder="z.B. Einkauf, Tankstelle..."
					required
					class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
				/>
			</div>

			<div>
				<label for="expense-amount" class="block text-sm font-medium mb-1">Betrag (€)</label>
				<input
					type="number"
					id="expense-amount"
					name="amount"
					step="0.01"
					min="0"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
				/>
			</div>

			<button
				type="submit"
				class="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
			>
				Ausgabe hinzufügen
			</button>
		</form>
	</div>

	<!-- Expenses List -->
	{#if data.privateExpenses.length === 0}
		<p class="text-gray-500 text-center py-8">Noch keine privaten Ausgaben erfasst.</p>
	{:else}
		<div class="space-y-3">
			{#each data.privateExpenses as expense}
				<div class="border border-gray-300 rounded p-4 bg-white flex justify-between items-start">
					<div class="flex-1">
						<div class="text-sm text-gray-600 mb-1">{expense.date}</div>
						<div class="font-medium mb-1">{expense.description}</div>
						<div class="text-lg font-semibold text-orange-600">{expense.amount.toFixed(2)} €</div>
					</div>
					<form method="POST" action="?/deletePrivateExpense">
						<input type="hidden" name="expenseId" value={expense.id} />
						<button
							type="submit"
							class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
	<div class="my-8 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400 rounded-lg">
		<h2 class="text-xl font-semibold mb-3 text-yellow-900">📊 Monat abschließen</h2>
		
		{#if !showCloseConfirm}
			<!-- Step 1: Initial button -->
			<p class="text-sm text-gray-700 mb-4">
				Schließt den aktuellen Monat und übernimmt den Endsaldo ({formatEuro(data.computed.privateBalanceEnd)}) in den nächsten Monat.
			</p>
			<button
				type="button"
				onclick={() => { showCloseConfirm = true; }}
				class="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors font-semibold"
			>
				Monat abschließen
			</button>
		{:else}
			<!-- Step 2: Confirmation area -->
			<div class="space-y-4">
				<div class="p-4 bg-white border-2 border-red-400 rounded-lg">
					<p class="text-sm font-semibold text-red-700 mb-2">⚠️ Achtung: Diese Aktion kann nicht rückgängig gemacht werden!</p>
					<p class="text-sm text-gray-700 mb-3">
						Der Monat wird geschlossen und der Endsaldo von <strong>{formatEuro(data.computed.privateBalanceEnd)}</strong> wird als Startguthaben in den nächsten Monat übernommen.
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
							class="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
						/>
					</div>
				</div>

				<form method="POST" action="?/closeMonth" class="flex flex-col sm:flex-row gap-2">
					<input type="hidden" name="monthId" value={data.month.id} />
					<input type="hidden" name="privateBalanceEnd" value={data.computed.privateBalanceEnd} />
					
					<button
						type="button"
						onclick={cancelCloseMonth}
						class="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors font-medium"
					>
						Abbrechen
					</button>
					
					<button
						type="submit"
						disabled={!isCloseConfirmed}
						class="flex-1 px-4 py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed {isCloseConfirmed ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500'}"
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
		<h2 class="text-2xl font-semibold mb-4">📦 Archiv</h2>
		<div class="space-y-3">
			{#each data.closedMonths as closedMonth}
				<div class="p-4 bg-gray-50 border border-gray-300 rounded-lg">
					{#if deleteArchiveMonthId === closedMonth.id}
						<!-- Delete Confirmation -->
						<div class="space-y-3">
							<div class="p-3 bg-white border border-red-400 rounded">
								<p class="text-sm font-semibold text-red-700 mb-2">⚠️ Monat {closedMonth.year}-{String(closedMonth.month).padStart(2, '0')} wirklich löschen?</p>
								<p class="text-xs text-gray-600 mb-3">
									Alle Daten dieses Monats werden permanent gelöscht. Diese Aktion kann nicht rückgängig gemacht werden!
								</p>
								<label class="flex items-center space-x-2 cursor-pointer">
									<input
										type="checkbox"
										bind:checked={deleteArchiveConfirmed}
										class="w-4 h-4 text-red-600 rounded focus:ring-red-500"
									/>
									<span class="text-sm text-gray-800">Ich verstehe, dass alle Daten permanent gelöscht werden</span>
								</label>
							</div>

							<form method="POST" action="?/deleteArchivedMonth" class="flex gap-2">
								<input type="hidden" name="monthId" value={closedMonth.id} />
								<button
									type="button"
									onclick={cancelDeleteArchive}
									class="flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm"
								>
									Abbrechen
								</button>
								<button
									type="submit"
									disabled={!deleteArchiveConfirmed}
									class="flex-1 px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed {deleteArchiveConfirmed ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500'}"
								>
									Endgültig löschen
								</button>
							</form>
						</div>
					{:else}
						<!-- Normal Display -->
						<div class="flex justify-between items-start mb-3">
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
										class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
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
								<span class="font-semibold ml-2">{formatEuro(closedMonth.private_balance_start)}</span>
							</div>
							<div>
								<span class="text-gray-600">Endsaldo:</span>
								<span class="font-semibold ml-2">{formatEuro(closedMonth.private_balance_end || 0)}</span>
							</div>
							<div>
								<span class="text-gray-600">Transfer:</span>
								<span class="font-semibold ml-2">{formatEuro(closedMonth.total_transfer_this_month)}</span>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}

<p class="text-sm text-gray-600 mt-8">Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
